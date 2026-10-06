"use server";
// Server actions for the app. Every action resolves the signed-in person first (they are
// reachable by direct POST) and only touches that person's rows, then redirects with a fixed
// message code.

import { addToFolder, createFolder, deleteFolder, removeFromFolder, renameFolder } from "@/lib/server/folders";
import { FIT_AREAS, parseWeights } from "@/lib/core/fit";
import { MAX_ROLES } from "@/lib/core/cv-positions";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_ATTACHMENT_BYTES } from "@/lib/core/guardrails";
import { looksLikePdf } from "@/lib/core/pdf-check";
import { isValidEmail } from "@/lib/core/extract";
import { getDb, schema } from "@/lib/db";
import type { ApplicationStatus } from "@/lib/db/schema";
import {
  approveAll,
  approveApplication,
  cancelApplication,
  markAppliedOnSite,
  prepareEmailApplication,
  prepareSpontaneous,
  saveCurated,
  setKillSwitch,
  skipApplication,
  updateDraft,
} from "@/lib/server/applications";
import { requireUser, signOut } from "@/lib/server/auth";
import { canChoose, getPrefs, setPref } from "@/lib/server/catalog";
import { COUNTRIES, findPlace } from "@/lib/core/geo";
import { parsePlaceValue, profileFromPlaces } from "@/lib/core/where";
import { situationOf, workRightsOf } from "@/lib/core/situation";
import { applyPrefsForm } from "@/lib/server/prefs-form";
import { dismissJob, markSeen, rerankUser, restoreJob, undoDismissal, setAdjustmentActive, setApplicationEmail, upsertRawJob, type DismissReason } from "@/lib/server/jobs";
import { deleteAccount, deleteAllMyData } from "@/lib/server/privacy";
import { verifyPassword } from "@/lib/server/passwords";
import { fitWarnings } from "@/lib/server/career";
import { deleteExperience, importFromCvText, importFromLinkedIn, listExperiences, pdfText, rematchExperiences, saveExperiences } from "@/lib/server/experiences";
import { getProfile, updateProfile } from "@/lib/server/profile";
import { after } from "next/server";
import { checkInboxNow, quickSearchFor, readConnectedGmail } from "@/lib/pipeline/jobs";
import { deleteMailConnection } from "@/lib/server/mail-connections";
import { alertsDone, collegaState, linkCompassMailbox, saveCollegaState } from "@/lib/server/inbox";
import { lastQuickSearch, QUICK_SEARCH_EVERY_MIN } from "@/lib/pipeline/quick-search";
import { planOf } from "@/lib/core/plans";
import { getScanStatus, recordScan, setPlan } from "@/lib/server/plans";
import { updateUserSettings } from "@/lib/server/settings";
import { confirmReply, dismissReply } from "@/lib/server/replies";

const num = (f: FormData, k: string) => Number(f.get(k));
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ids = (f: FormData, k: string) => f.getAll(k).map(Number).filter((n) => Number.isInteger(n) && n > 0);

function done(path: string, msg: string): never {
  revalidatePath("/", "layout");
  const [base, hash] = path.split("#");
  redirect(`${base}${base.includes("?") ? "&" : "?"}msg=${msg}${hash ? `#${hash}` : ""}`);
}

/** Only same-site relative paths come back from forms. */
function safeBack(f: FormData, fallback: string): string {
  const b = str(f, "back");
  return b.startsWith("/") && !b.startsWith("//") ? b : fallback;
}

// --- Offerte -------------------------------------------------------------------------------------

export async function dismissAction(f: FormData) {
  const u = await requireUser();
  const reason = (str(f, "reason") || "nessuno") as DismissReason;
  await dismissJob(getDb(), u.id, num(f, "jobId"), reason);
  done("/offerte", "scartata");
}

/** "Non mi interessa" from a card: no redirect, no message (the card is already gone on screen). */
export async function dismissQuietAction(jobId: number) {
  const u = await requireUser();
  if (!Number.isInteger(jobId) || jobId <= 0) return;
  await dismissJob(getDb(), u.id, jobId, "nessuno");
  revalidatePath("/offerte");
}

/** Undo a "Non mi interessa" from its list. */
export async function undoDismissAction(f: FormData) {
  const u = await requireUser();
  await undoDismissal(getDb(), u.id, str(f, "key"));
  done("/offerte/non-mi-interessano", "scarto-annullato");
}

export async function restoreAction(f: FormData) {
  const u = await requireUser();
  await restoreJob(getDb(), u.id, num(f, "jobId"));
  done(`/offerte/${num(f, "jobId")}`, "salvato");
}

export async function markSeenAction(jobId: number) {
  const u = await requireUser();
  await markSeen(getDb(), u.id, jobId);
}

export async function prepareEmailAction(f: FormData) {
  const u = await requireUser();
  const app = await prepareEmailApplication(getDb(), u.id, num(f, "jobId"));
  if (!app) done(`/offerte/${num(f, "jobId")}`, "errore");
  done(`/da-inviare#candidatura-${app.id}`, "preparata");
}

export async function appliedOnSiteAction(f: FormData) {
  const u = await requireUser();
  const ok = await markAppliedOnSite(getDb(), u.id, num(f, "jobId"));
  done(ok ? "/candidature" : "/offerte", ok ? "candidata" : "errore");
}

export async function saveCuratedAction(f: FormData) {
  const u = await requireUser();
  const jobId = num(f, "jobId");
  const body = str(f, "body");
  if (!body) done(`/offerte/${jobId}/claude`, "errore");
  const r = await saveCurated(getDb(), u.id, jobId, { subject: str(f, "subject") || "Candidatura", body });
  if (r === "use-site") done(`/offerte/${jobId}/kit`, "usa-il-sito");
  done("/da-inviare", "testo-salvato");
}

export async function manualAddAction(f: FormData) {
  const u = await requireUser();
  const title = str(f, "title");
  if (!title) done("/offerte/aggiungi", "errore");
  const url = str(f, "url");
  const db = getDb();
  const res = await upsertRawJob(
    db,
    {
      source: "manual",
      url: /^https?:\/\//.test(url) ? url : null,
      title,
      company: str(f, "company") || null,
      location: str(f, "city") || null,
      description: str(f, "text"),
      salaryText: str(f, "salary") || null,
      postedAt: new Date(),
    },
    new Date(),
    { owners: [u.id] },
  );
  const email = str(f, "email");
  if (email && isValidEmail(email)) await setApplicationEmail(db, u.id, res.jobId, email.toLowerCase(), "Indirizzo aggiunto a mano");
  done(`/offerte/${res.jobId}`, "aggiunta");
}

/** "Salva come predefiniti" on the Offerte filters. */
export async function saveDefaultFiltersAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const focus = str(f, "focus");
  const net = Number(str(f, "netto").replace(/[^\d]/g, ""));
  await updateProfile(db, u.id, {
    focus: focus === "preferite" || focus === "aziende" ? "preferite" : "tutte",
    focusCompaniesOnly: focus === "aziende",
    hideBelowMin: net > 0,
    ...(net > 0 ? { minNetMonthly: net } : {}),
  });
  done("/offerte", "filtri-salvati");
}

// --- Da inviare ----------------------------------------------------------------------------------

export async function approveAction(f: FormData) {
  const u = await requireUser();
  const r = await approveApplication(getDb(), u.id, num(f, "appId"));
  done("/da-inviare", r.ok ? "in-coda" : "bloccata");
}

export async function approveAllAction(f: FormData) {
  const u = await requireUser();
  await approveAll(getDb(), u.id, new Date(), Math.random, ids(f, "appId"));
  done("/da-inviare", "tutte-in-coda");
}

export async function cancelAction(f: FormData) {
  const u = await requireUser();
  const ok = await cancelApplication(getDb(), u.id, num(f, "appId"));
  done("/da-inviare", ok ? "annullata" : "errore");
}

export async function skipAction(f: FormData) {
  const u = await requireUser();
  await skipApplication(getDb(), u.id, num(f, "appId"));
  done("/da-inviare", "saltata");
}

export async function updateDraftAction(f: FormData) {
  const u = await requireUser();
  const cvId = num(f, "cvId");
  await updateDraft(getDb(), u.id, num(f, "appId"), { subject: str(f, "subject"), body: str(f, "body"), cvId: cvId || null });
  done(`/da-inviare#candidatura-${num(f, "appId")}`, "salvato");
}

export async function killSwitchAction(f: FormData) {
  const u = await requireUser();
  const on = str(f, "on") === "1";
  await setKillSwitch(getDb(), u.id, on, "user");
  done("/da-inviare", on ? "fermati" : "ripartiti");
}

export async function prepareSpontaneousAction(f: FormData) {
  const u = await requireUser();
  const app = await prepareSpontaneous(getDb(), u.id, num(f, "companyId"));
  done(app ? `/da-inviare#candidatura-${app.id}` : "/da-inviare", app ? "preparata" : "errore");
}

export async function readNotificationsAction() {
  const u = await requireUser();
  await getDb()
    .update(schema.notifications)
    .set({ read: true })
    .where(and(eq(schema.notifications.audience, "user"), eq(schema.notifications.userId, u.id)));
  revalidatePath("/", "layout");
}

// --- Candidature -------------------------------------------------------------------------------

export async function confirmReplyAction(f: FormData) {
  const u = await requireUser();
  const status = str(f, "status");
  const allowed: ApplicationStatus[] = ["replied", "interview", "rejected", "offer"];
  await confirmReply(getDb(), u.id, num(f, "replyId"), allowed.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : undefined);
  done("/candidature", "stato-aggiornato");
}

export async function dismissReplyAction(f: FormData) {
  const u = await requireUser();
  await dismissReply(getDb(), u.id, num(f, "replyId"));
  done("/candidature", "salvato");
}

// --- Aziende e settori (catalog choices) ------------------------------------------------------------

/** Save one form of catalog choices (see applyPrefsForm), then re-rank this person's offers. */
export async function savePrefsAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const r = await applyPrefsForm(db, u.id, f);
  if (r.added) await rematchExperiences(db, u.id); // a company added with "Altro" may be where they worked
  await rerankUser(db, u.id);
  done(safeBack(f, "/aziende"), r.added ? "altro-aggiunto" : "preferenze");
}

/** One tap on a suggestion or a chip: like, avoid, or clear. */
export async function setPrefAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const kind = str(f, "kind") === "sector" ? "sector" : "company";
  const id = num(f, "id");
  const visible = await canChoose(db, u.id, kind, id);
  if (!visible) done(safeBack(f, "/aziende"), "errore");
  const stance = str(f, "stance");
  await setPref(db, u.id, kind, id, stance === "like" || stance === "avoid" ? stance : null);
  await rerankUser(db, u.id);
  const warn = kind === "company" && stance === "like" && (await fitWarnings(db, u.id)).has(id);
  done(safeBack(f, "/aziende"), warn ? "preferenze-attenzione" : "preferenze");
}

export async function saveFocusAction(f: FormData) {
  const u = await requireUser();
  const focus = str(f, "focus");
  await updateProfile(getDb(), u.id, { focus: focus === "tutte" ? "tutte" : "preferite", focusCompaniesOnly: focus === "aziende" });
  done(safeBack(f, "/aziende"), "preferenze");
}

export async function toggleAdjustmentAction(f: FormData) {
  const u = await requireUser();
  await setAdjustmentActive(getDb(), num(f, "id"), str(f, "active") === "1", u.id);
  done("/profilo/ricerca", "salvato");
}

// --- Profilo: CV, lettere, dati ------------------------------------------------------------------

export async function uploadCvAction(f: FormData) {
  const u = await requireUser();
  const back = safeBack(f, "/profilo/cv");
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) done(back, "errore");
  if (file.size > MAX_ATTACHMENT_BYTES) done(back, "cv-troppo-grande");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLikePdf(buf)) done(back, "cv-non-pdf");
  const db = getDb();
  const existing = await db.select({ id: schema.cvs.id }).from(schema.cvs).where(eq(schema.cvs.userId, u.id));
  if (existing.length >= 3) done(back, "cv-troppi");
  const family = str(f, "family") || "Generale";
  // The text is read from the PDF itself when it was not pasted (scanned CVs have none).
  const text = str(f, "text") || (await pdfText(buf));
  await db.insert(schema.cvs).values({
    userId: u.id,
    label: `CV ${family}`,
    roleFamily: family,
    filename: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "cv.pdf",
    size: buf.length,
    data: buf,
    text,
    isDefault: existing.length === 0,
  });
  // First CV with readable text, and no timeline yet: build it from the CV.
  const timeline = await listExperiences(db, u.id);
  let found = 0;
  if (text && timeline.every((e) => e.source === "cv")) found = await importFromCvText(db, u.id, text);
  done(back, found ? "cv-caricato-esperienze" : text ? "cv-caricato" : "cv-caricato-senza-testo");
}

export async function deleteCvAction(f: FormData) {
  const u = await requireUser();
  await getDb().delete(schema.cvs).where(and(eq(schema.cvs.id, num(f, "cvId")), eq(schema.cvs.userId, u.id)));
  done(safeBack(f, "/profilo/cv"), "salvato");
}

export async function setDefaultCvAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const cv = await db.query.cvs.findFirst({ where: and(eq(schema.cvs.id, num(f, "cvId")), eq(schema.cvs.userId, u.id)) });
  if (!cv) done("/profilo/cv", "errore");
  await db.update(schema.cvs).set({ isDefault: false }).where(eq(schema.cvs.userId, u.id));
  await db.update(schema.cvs).set({ isDefault: true }).where(eq(schema.cvs.id, cv.id));
  done("/profilo/cv", "salvato");
}

export async function saveCvTextAction(f: FormData) {
  const u = await requireUser();
  const family = str(f, "family") || "Generale";
  await getDb()
    .update(schema.cvs)
    .set({ text: str(f, "text"), roleFamily: family, label: `CV ${family}` })
    .where(and(eq(schema.cvs.id, num(f, "cvId")), eq(schema.cvs.userId, u.id)));
  done("/profilo/cv", "salvato");
}

export async function saveTemplateAction(f: FormData) {
  const u = await requireUser();
  await getDb()
    .update(schema.templates)
    .set({ subject: str(f, "subject"), body: str(f, "body"), name: str(f, "name") || "Lettera", updatedAt: new Date() })
    .where(and(eq(schema.templates.id, num(f, "templateId")), eq(schema.templates.userId, u.id)));
  done("/profilo/lettere", "salvato");
}

export async function deleteAllDataAction() {
  const u = await requireUser();
  await deleteMailConnection(getDb(), u.id, fetch); // revoked at Google too, not only forgotten here
  await deleteAllMyData(getDb(), u.id);
  revalidatePath("/", "layout");
  redirect("/benvenuto/1?msg=dati-cancellati");
}

/**
 * "Elimina il mio account": everything goes (account, profile, CV, offers, applications, Gmail access,
 * settings), after the password and the word ELIMINA. Only the person themselves: an administrator
 * looking at someone's app deletes from Admin → Utenti.
 */
export async function deleteMyAccountAction(f: FormData) {
  const u = await requireUser();
  if (u.viewer !== "self") done("/elimina-account", "solo-titolare");
  if (str(f, "confirm").toUpperCase() !== "ELIMINA") done("/elimina-account", "conferma-elimina");
  const db = getDb();
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, u.id) });
  if (!row || row.role !== "user" || !(await verifyPassword(String(f.get("password") ?? ""), row.passwordHash))) done("/elimina-account", "password-sbagliata");
  await deleteMailConnection(db, u.id, fetch); // the Gmail access is revoked at Google too
  await deleteAccount(db, u.id);
  await signOut("user");
  redirect("/entra?msg=account-eliminato");
}

export async function signOutAction() {
  await signOut("user");
  redirect("/entra");
}

/** Profilo → Preferenze di ricerca: focus, salary floor as a filter, morning e-mail. */
export async function saveSearchSettingsAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const focus = str(f, "focus");
  const net = Number(str(f, "netto").replace(/[^\d]/g, ""));
  await updateProfile(db, u.id, {
    focus: focus === "tutte" ? "tutte" : "preferite",
    focusCompaniesOnly: focus === "aziende",
    minNetMonthly: net > 0 ? net : null,
    hideBelowMin: net > 0 && str(f, "nascondi") === "1",
  });
  await updateUserSettings(db, u.id, { digestEnabled: str(f, "digest") === "1" });
  await rerankUser(db, u.id);
  done("/profilo/ricerca", "salvato");
}

// --- Esperienze (timeline) and the questionnaire ---------------------------------------------------

export async function readCvTimelineAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const cv = await db.query.cvs.findFirst({ where: and(eq(schema.cvs.id, num(f, "cvId")), eq(schema.cvs.userId, u.id)) });
  if (!cv) done("/profilo/esperienze", "errore");
  let text = cv.text;
  if (!text) {
    text = await pdfText(new Uint8Array(cv.data));
    if (text) await db.update(schema.cvs).set({ text }).where(eq(schema.cvs.id, cv.id));
  }
  const n = text ? await importFromCvText(db, u.id, text) : 0;
  await rerankUser(db, u.id);
  done("/profilo/esperienze", n ? "esperienze-lette" : "esperienze-nessuna");
}

export async function importLinkedInAction(f: FormData) {
  const u = await requireUser();
  const files: { name: string; data: Uint8Array }[] = [];
  for (const x of f.getAll("files")) {
    if (x instanceof File && x.size > 0 && x.size < 20 * 1024 * 1024) files.push({ name: x.name, data: new Uint8Array(await x.arrayBuffer()) });
  }
  const n = files.length ? await importFromLinkedIn(getDb(), u.id, files) : 0;
  done("/profilo/esperienze", n ? "esperienze-lette" : "linkedin-niente");
}

export async function addExperienceAction(f: FormData) {
  const u = await requireUser();
  const title = str(f, "title");
  const organization = str(f, "organization");
  if (!title && !organization) done("/profilo/esperienze", "errore");
  const year = (k: string) => {
    const n = Number(str(f, k));
    return n >= 1950 && n <= 2100 ? n : null;
  };
  const kind = str(f, "kind");
  const current = str(f, "current") === "1";
  await saveExperiences(
    getDb(),
    u.id,
    [
      {
        kind: kind === "studio" || kind === "volontariato" || kind === "altro" ? kind : "lavoro",
        title,
        organization,
        city: str(f, "city") || null,
        startYear: year("startYear"),
        startMonth: null,
        endYear: current ? null : year("endYear"),
        endMonth: null,
        current,
        description: str(f, "description"),
      },
    ],
    "manuale",
  );
  await rerankUser(getDb(), u.id);
  done("/profilo/esperienze", "salvato");
}

export async function deleteExperienceAction(f: FormData) {
  const u = await requireUser();
  await deleteExperience(getDb(), u.id, num(f, "id"));
  done("/profilo/esperienze", "salvato");
}

/** "Rifai il questionario": every answer stays prefilled; the app stays usable meanwhile. */
export async function restartQuestionnaireAction(f?: FormData) {
  const u = await requireUser();
  // "Completa" after the quick version: the full questionnaire, answers kept.
  const mode = f && str(f, "mode") === "completo" ? "completo" : undefined;
  await updateProfile(getDb(), u.id, { onboardingStep: 1, ...(mode ? { onboardingMode: mode } : {}) });
  revalidatePath("/", "layout");
  redirect("/benvenuto/1?rifai=1");
}

// --- Collega le fonti ---------------------------------------------------------------------------

export async function toggleAlertDoneAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const key = str(f, "key").slice(0, 300);
  const set = await alertsDone(db, u.id);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  const v = JSON.stringify([...set].slice(-200));
  await db.insert(schema.settings).values({ key: `alerts_done_${u.id}`, value: v }).onConflictDoUpdate({ target: schema.settings.key, set: { value: v } });
  revalidatePath("/collega");
  redirect("/collega?passo=3");
}

/** "Avanti" on Collega le fonti: the step is done, on to the next. */
export async function collegaStepAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const n = Number(str(f, "passo")) || 1;
  const email = str(f, "email");
  const s = await collegaState(db, u.id);
  if (n === 1) Object.assign(s, { emailDone: true, ...(email === "gmail" || email === "outlook" || email === "altro" ? { email } : {}) });
  if (n === 2) s.accountsDone = true;
  await saveCollegaState(db, u.id, s);
  revalidatePath("/collega");
  redirect(`/collega?passo=${Math.min(4, n + 1)}`);
}

/** "Scollega Gmail": the access is given back to Google and the stored token deleted. */
export async function disconnectGmailAction() {
  const u = await requireUser();
  await deleteMailConnection(getDb(), u.id, fetch);
  done("/collega?passo=1", "gmail-scollegata");
}

/** Collega le fonti, step 2: "Ce l'ho già" / "Crea" for one site (no redirect: the page already shows it). */
export async function setAccountStateAction(key: string, state: "ho" | "creato" | null) {
  const u = await requireUser();
  if (!/^[a-z0-9-]{2,30}$/.test(key) || (state !== null && state !== "ho" && state !== "creato")) return;
  const db = getDb();
  const s = await collegaState(db, u.id);
  const accounts = { ...(s.accounts ?? {}) };
  if (state) accounts[key] = state;
  else delete accounts[key];
  await saveCollegaState(db, u.id, { ...s, accounts });
  revalidatePath("/collega");
}

/** Their e-mail is the Compass mailbox itself: no forwarding, the alerts there are theirs. */
export async function linkCompassMailboxAction() {
  const u = await requireUser();
  const db = getDb();
  if (!(await linkCompassMailbox(db, u.id))) done("/collega?passo=1&email=gmail", "casella-non-tua");
  await saveCollegaState(db, u.id, { ...(await collegaState(db, u.id)), emailDone: true, email: "gmail" });
  done("/collega?passo=2", "casella-collegata");
}

/** "Controlla ora": read the Compass mailbox and their connected Gmail now, in the background. */
export async function checkInboxNowAction(f?: FormData) {
  const u = await requireUser();
  after(async () => {
    await checkInboxNow(getDb());
    await readConnectedGmail(getDb(), u.id);
  });
  done(f ? safeBack(f, "/collega") : "/collega", "controllo-avviato");
}

/** "Cosa fai ora?" changed from the profile: the questionnaire track follows (studies or work). */
export async function saveSituationAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const sit = situationOf(str(f, "situation"));
  if (!sit) done("/profilo/situazione", "scegli-situazione");
  await updateProfile(db, u.id, { situation: sit!.key, track: sit!.track, ...(sit!.key === "magistrale" ? { degreeYears: 2 } : {}) });
  await rerankUser(db, u.id);
  done("/profilo", "salvato");
}

/** "Dove": cities, regions or whole countries, as chosen (no distances). */
export async function saveWhereAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const places = f.getAll("place").map(String).map(parsePlaceValue).filter((x): x is NonNullable<typeof x> => x != null);
  const fields = profileFromPlaces(places);
  await updateProfile(db, u.id, { ...fields, countries: fields.countries.length ? fields.countries : ["IT"], remoteOk: str(f, "remote") === "1", ...workRightsOf(f) });
  await rerankUser(db, u.id);
  after(() => quickSearchFor(getDb(), u.id));
  done("/profilo/dove", "dove-salvato");
}

/** "Carriere e paesi": several careers (liked sectors) and several countries (each with an optional city). */
export async function saveCareersAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const shown = f.getAll("shown").map(Number).filter(Boolean);
  const picked = new Set(f.getAll("sector").map(Number));
  const prefs = await getPrefs(db, u.id);
  for (const id of shown) {
    if (picked.has(id)) await setPref(db, u.id, "sector", id, "like");
    else if (prefs.sectors.get(id) === "like") await setPref(db, u.id, "sector", id, null);
  }
  const countries = COUNTRIES.map((c) => c.code).filter((cc) => f.getAll("country").map(String).includes(cc));
  const cities = Object.fromEntries(countries.map((cc) => [cc, str(f, `city_${cc}`).trim().slice(0, 80)]));
  const p = await getProfile(db, u.id);
  const homeCc = findPlace(p.city)?.country;
  // The home city stays the city of its country; the others become the "other cities".
  const homeCity = homeCc && countries.includes(homeCc) && cities[homeCc] ? cities[homeCc] : !homeCc || !countries.includes(homeCc) ? (countries.map((cc) => cities[cc]).find(Boolean) ?? p.city) : p.city;
  const newHomeCc = findPlace(homeCity)?.country;
  const extraPlaces = countries.filter((cc) => cc !== newHomeCc && cities[cc]).map((cc) => cities[cc]);
  await updateProfile(db, u.id, { countries: countries.length ? countries : [newHomeCc ?? "IT"], city: homeCity, extraPlaces });
  await rerankUser(db, u.id);
  after(() => quickSearchFor(getDb(), u.id));
  done("/profilo/carriere", "carriere-salvate");
}

/** "Fai web scraping": a search for this person in the background, within their plan's searches. */
export async function searchNowAction() {
  const u = await requireUser();
  const db = getDb();
  const last = await lastQuickSearch(db, u.id);
  if (last && Date.now() - last.getTime() < QUICK_SEARCH_EVERY_MIN * 60_000) done("/offerte", "ricerca-recente");
  const s = await getScanStatus(db, u.id);
  if (s.nextAt) done("/offerte", s.left === 0 ? "ricerche-finite" : "ricerca-attendi");
  await recordScan(db, u.id);
  after(() => quickSearchFor(getDb(), u.id));
  done("/offerte", "ricerca-avviata");
}

/** Choose a plan. Payments are not live: a paid plan is a free trial, no card data reaches us. */
export async function choosePlanAction(f: FormData) {
  const u = await requireUser();
  const plan = planOf(str(f, "plan"));
  await setPlan(getDb(), u.id, plan.key);
  revalidatePath("/", "layout");
  done(safeBack(f, "/piano"), plan.key === "free" ? "piano-free" : "piano-attivo");
}

/** The positions searched: the ticked ones (current and recommended from the CV) plus one typed. */
export async function saveRolesAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const picked = [...f.getAll("role").map(String), str(f, "extraRole")].map((r) => r.replace(/\s+/g, " ").trim().slice(0, 80)).filter(Boolean);
  const roles = [...new Map(picked.map((r) => [r.toLowerCase(), r])).values()].slice(0, MAX_ROLES);
  await updateProfile(db, u.id, { roles });
  // Posizioni cercate also holds the careers: the ticked ones are liked, the unticked ones not any more.
  const shown = f.getAll("shown").map(Number).filter(Boolean);
  if (shown.length) {
    const picked = new Set(f.getAll("sector").map(Number));
    const prefs = await getPrefs(db, u.id);
    for (const id of shown) {
      if (picked.has(id)) await setPref(db, u.id, "sector", id, "like");
      else if (prefs.sectors.get(id) === "like") await setPref(db, u.id, "sector", id, null);
    }
  }
  await rerankUser(db, u.id);
  revalidatePath("/", "layout");
  after(() => quickSearchFor(getDb(), u.id));
  done(safeBack(f, "/profilo/posizioni"), roles.length ? "posizioni-salvate" : "posizioni-vuote");
}

export async function saveWeightsAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const pr = str(f, "priority");
  if (pr === "alta" || pr === "media" || pr === "bassa") await updateProfile(db, u.id, { priority: pr });
  if (str(f, "reset") === "1") await updateProfile(db, u.id, { fitWeights: null });
  else await updateProfile(db, u.id, { fitWeights: parseWeights(Object.fromEntries(FIT_AREAS.map((a) => [a, Number(str(f, a)) * 5]))) });
  await rerankUser(db, u.id);
  done("/profilo/punteggio", "punteggio-salvato");
}

/** A spontaneous application to a catalog company, with the address the person found on its site. */
export async function startSpontaneousAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const companyId = num(f, "companyId");
  const email = str(f, "email").trim().toLowerCase();
  const sourceUrl = str(f, "sourceUrl").trim();
  const back = `/percorsi/scrivi?azienda=${companyId}`;
  if (!(await canChoose(db, u.id, "company", companyId))) done("/percorsi", "errore");
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || !/^https?:\/\/[^\s]+\.[^\s]+/i.test(sourceUrl)) done(back, "dati-non-validi");
  const c = (await db.select().from(schema.catalogCompanies).where(eq(schema.catalogCompanies.id, companyId)).get())!;
  const role = str(f, "role").trim().slice(0, 80);
  const [sc] = await db
    .insert(schema.spontaneousCompanies)
    .values({ userId: u.id, name: c.name, email, sourceUrl, city: c.city, notes: role ? `Ruolo proposto: ${role}` : null, status: "approved" })
    .returning();
  const app = await prepareSpontaneous(db, u.id, sc.id);
  done(app ? "/da-inviare" : back, app ? "spontanea-pronta" : "errore");
}

// --- Folders -------------------------------------------------------------------------------------

export async function saveToFolderAction(f: FormData) {
  const u = await requireUser();
  const db = getDb();
  const jobId = num(f, "jobId");
  let folderId = num(f, "folderId");
  if (!folderId && str(f, "newFolder").trim()) folderId = (await createFolder(db, u.id, str(f, "newFolder"))) ?? 0;
  const ok = folderId ? await addToFolder(db, u.id, folderId, jobId) : false;
  done(safeBack(f, `/offerte/${jobId}`), ok ? "salvata-in-cartella" : "errore");
}

export async function removeFromFolderAction(f: FormData) {
  const u = await requireUser();
  await removeFromFolder(getDb(), u.id, num(f, "folderId"), num(f, "jobId"));
  done(safeBack(f, "/offerte/cartelle"), "tolta-da-cartella");
}

export async function createFolderAction(f: FormData) {
  const u = await requireUser();
  const id = await createFolder(getDb(), u.id, str(f, "name"));
  done("/offerte/cartelle", id ? "cartella-creata" : "errore");
}

export async function renameFolderAction(f: FormData) {
  const u = await requireUser();
  const ok = await renameFolder(getDb(), u.id, num(f, "folderId"), str(f, "name"));
  done("/offerte/cartelle", ok ? "cartella-rinominata" : "errore");
}

export async function deleteFolderAction(f: FormData) {
  const u = await requireUser();
  const ok = await deleteFolder(getDb(), u.id, num(f, "folderId"));
  done("/offerte/cartelle", ok ? "cartella-eliminata" : "errore");
}
