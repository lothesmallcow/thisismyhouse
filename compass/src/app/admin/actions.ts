"use server";
// Admin server actions. Every one starts with requireAdmin().

import { feedFromUrl } from "@/lib/sources/ats/feeds";
import { deleteMailConnection } from "@/lib/server/mail-connections";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidEmail } from "@/lib/core/extract";
import { HARD_MAX_PER_DAY } from "@/lib/core/guardrails";
import { OutboxTransport } from "@/lib/mail/transport";
import { getDb, schema } from "@/lib/db";
import { COMPANY_KINDS, type CompanyKind } from "@/lib/db/schema";
import { env, mailboxConfig } from "@/lib/env";
import { JOB_NAMES, runJob, type JobName } from "@/lib/pipeline/jobs";
import { approveRequest, createAccount, createInvite, MIN_PASSWORD, setActive } from "@/lib/server/accounts";
import { processQueue, setKillSwitch } from "@/lib/server/applications";
import { requireAdmin, setViewAs, signIn, signOut } from "@/lib/server/auth";
import { rerankAll, rerankUser, setAdjustmentActive } from "@/lib/server/jobs";
import { hashPassword } from "@/lib/server/passwords";
import { deleteAccount } from "@/lib/server/privacy";
import { getSettings, setSetting, updateGuardrails, updateUserSettings, type RegistrationMode } from "@/lib/server/settings";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string, d = 0) => (Number.isFinite(Number(f.get(k))) && f.get(k) !== "" ? Number(f.get(k)) : d);
const hm = (s: string, d: number) => {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : d;
};

function back(path: string, msg = "salvato"): never {
  revalidatePath("/", "layout");
  redirect(`${path}${path.includes("?") ? "&" : "?"}msg=${msg}`);
}

/** The person a per-person admin form is about (must be a real "user" account). */
async function person(f: FormData): Promise<number> {
  const id = num(f, "u");
  const u = id ? await getDb().query.users.findFirst({ where: and(eq(schema.users.id, id), eq(schema.users.role, "user")) }) : null;
  if (!u) back("/admin/utenti", "errore");
  return u.id;
}

export async function adminSignInAction(f: FormData) {
  const r = await signIn(str(f, "email"), str(f, "password"), "admin");
  redirect(r === "ok" ? "/admin" : r === "locked" ? "/admin/entra?errore=attesa" : "/admin/entra?errore=1");
}

export async function adminSignOutAction() {
  await signOut("admin");
  redirect("/admin/entra");
}

export async function saveGuardrailsAction(f: FormData) {
  await requireAdmin();
  const db = getDb();
  const s = await getSettings(db);
  await updateGuardrails(db, {
    dailyCap: Math.max(0, Math.min(HARD_MAX_PER_DAY, num(f, "dailyCap", s.guardrails.dailyCap))),
    firstWeekCap: Math.max(0, Math.min(HARD_MAX_PER_DAY, num(f, "firstWeekCap", s.guardrails.firstWeekCap))),
    windowStartMin: hm(str(f, "windowStart"), s.guardrails.windowStartMin),
    windowEndMin: hm(str(f, "windowEnd"), s.guardrails.windowEndMin),
    spacingMinMinutes: Math.max(1, num(f, "spacingMin", s.guardrails.spacingMinMinutes)),
    spacingMaxMinutes: Math.max(num(f, "spacingMin", 5) + 1, num(f, "spacingMax", s.guardrails.spacingMaxMinutes)),
    undoMinutes: Math.max(15, num(f, "undo", s.guardrails.undoMinutes)), // never below 15
    companyCooldownDays: Math.max(1, num(f, "companyCooldown", s.guardrails.companyCooldownDays)),
    spontaneousCooldownDays: Math.max(30, num(f, "spontaneousCooldown", s.guardrails.spontaneousCooldownDays)),
  });
  back("/admin/invii");
}

/** Per person: autopilot on/off, and lifting their own stop. */
export async function personSendingAction(f: FormData) {
  await requireAdmin();
  const u = await person(f);
  const patch: { autopilot?: boolean; killSwitch?: boolean } = {};
  if (f.has("autopilot")) patch.autopilot = str(f, "autopilot") === "1";
  if (f.has("killSwitch")) patch.killSwitch = str(f, "killSwitch") === "1";
  await updateUserSettings(getDb(), u, patch);
  back("/admin/invii");
}

export async function realSendingAction(f: FormData) {
  await requireAdmin();
  // The "first week at 3 per day" starts with the first real send (see processQueue).
  await setSetting(getDb(), "realSending", str(f, "on") === "1");
  back("/admin/invii");
}

export async function adminKillSwitchAction(f: FormData) {
  await requireAdmin();
  await setKillSwitch(getDb(), null, str(f, "on") === "1", "admin");
  back("/admin");
}

export async function saveSourcesAction(f: FormData) {
  await requireAdmin();
  const db = getDb();
  await setSetting(db, "w1Enabled", str(f, "w1Enabled") === "1");
  await setSetting(db, "w1DailyCap", Math.max(0, Math.min(100, num(f, "w1DailyCap", 25))));
  await setSetting(db, "adzunaEnabled", str(f, "adzunaEnabled") === "1");
  await setSetting(db, "joobleEnabled", str(f, "joobleEnabled") === "1");
  await setSetting(db, "digestEnabled", str(f, "digestEnabled") === "1");
  await setSetting(db, "geocoderEnabled", str(f, "geocoderEnabled") === "1");
  await setSetting(db, "registration", (["closed", "invite", "approval", "open"].includes(str(f, "registration")) ? str(f, "registration") : "approval") as RegistrationMode);
  back("/admin/fonti");
}

export async function runJobAction(f: FormData) {
  await requireAdmin();
  const name = str(f, "job") as JobName;
  if (!JOB_NAMES.includes(name)) back("/admin/fonti", "errore");
  try {
    await runJob(getDb(), name);
  } catch {
    back("/admin/fonti", "errore");
  }
  back("/admin/fonti", `eseguito-${name}`);
}

export async function addWatchAction(f: FormData) {
  await requireAdmin();
  // A pasted link to any offer or board works too: the board is read from it (Workday, Oracle…).
  const fromLink = /^https?:\/\//i.test(str(f, "slug")) ? feedFromUrl(str(f, "slug")) : null;
  const ats = (fromLink?.ats ?? str(f, "ats")) as (typeof schema.companyWatchlist.$inferInsert)["ats"];
  const slug = fromLink?.slug ?? str(f, "slug");
  if (!str(f, "name") || !slug) back("/admin/aziende", "errore");
  await getDb().insert(schema.companyWatchlist).values({ name: str(f, "name"), ats, slug });
  back("/admin/aziende");
}

export async function toggleWatchAction(f: FormData) {
  await requireAdmin();
  await getDb().update(schema.companyWatchlist).set({ active: str(f, "active") === "1" }).where(eq(schema.companyWatchlist.id, num(f, "id")));
  back("/admin/aziende");
}

export async function deleteWatchAction(f: FormData) {
  await requireAdmin();
  await getDb().delete(schema.companyWatchlist).where(eq(schema.companyWatchlist.id, num(f, "id")));
  back("/admin/aziende");
}

export async function addSiteAction(f: FormData) {
  await requireAdmin();
  const url = str(f, "startUrl");
  if (!/^https:\/\//.test(url)) back("/admin/siti", "errore");
  await getDb().insert(schema.approvedSites).values({ name: str(f, "name") || new URL(url).host, startUrl: url, termsSummary: str(f, "terms"), approved: false });
  back("/admin/siti");
}

export async function approveSiteAction(f: FormData) {
  await requireAdmin();
  const approved = str(f, "approved") === "1";
  if (approved && !str(f, "terms")) back("/admin/siti", "serve-riassunto");
  if (approved && !str(f, "robots")) back("/admin/siti", "serve-riassunto");
  await getDb()
    .update(schema.approvedSites)
    .set({ approved, approvedAt: approved ? new Date() : null, termsSummary: str(f, "terms") || undefined, robotsSummary: str(f, "robots") || undefined })
    .where(eq(schema.approvedSites.id, num(f, "id")));
  back("/admin/siti");
}

export async function deleteSiteAction(f: FormData) {
  await requireAdmin();
  await getDb().delete(schema.approvedSites).where(eq(schema.approvedSites.id, num(f, "id")));
  back("/admin/siti");
}

export async function addSpontaneousAction(f: FormData) {
  await requireAdmin();
  const userId = await person(f);
  const email = str(f, "email").toLowerCase();
  if (!str(f, "name") || !isValidEmail(email) || !/^https?:\/\//.test(str(f, "sourceUrl"))) back(`/admin/spontanee?u=${userId}`, "errore");
  await getDb().insert(schema.spontaneousCompanies).values({ userId, name: str(f, "name"), email, sourceUrl: str(f, "sourceUrl"), city: str(f, "city") || null, status: "approved" });
  back(`/admin/spontanee?u=${userId}`);
}

/** CSV: name,email,source_url,city (header optional). */
export async function importSpontaneousCsvAction(f: FormData) {
  await requireAdmin();
  const userId = await person(f);
  const file = f.get("file");
  const text = file instanceof File ? await file.text() : str(f, "csv");
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((r) => r.length >= 3 && isValidEmail(r[1]) && /^https?:\/\//.test(r[2]));
  if (rows.length) {
    await getDb()
      .insert(schema.spontaneousCompanies)
      .values(rows.map(([name, email, sourceUrl, city]) => ({ userId, name, email: email.toLowerCase(), sourceUrl, city: city || null, status: "approved" as const })));
  }
  back(`/admin/spontanee?u=${userId}`, rows.length ? "importati" : "errore");
}

export async function setSpontaneousStatusAction(f: FormData) {
  await requireAdmin();
  await getDb()
    .update(schema.spontaneousCompanies)
    .set({ status: str(f, "status") as "approved" | "rejected" | "suggested" })
    .where(eq(schema.spontaneousCompanies.id, num(f, "id")));
  back(`/admin/spontanee?u=${num(f, "u")}`);
}

export async function addBlockAction(f: FormData) {
  await requireAdmin();
  if (!str(f, "value")) back("/admin/blocchi", "errore");
  await getDb().insert(schema.blocklist).values({ kind: str(f, "kind") as "company" | "domain" | "keyword", value: str(f, "value") });
  back("/admin/blocchi");
}

export async function deleteBlockAction(f: FormData) {
  await requireAdmin();
  await getDb().delete(schema.blocklist).where(eq(schema.blocklist.id, num(f, "id")));
  back("/admin/blocchi");
}

export async function toggleAdjustmentAction(f: FormData) {
  await requireAdmin();
  await setAdjustmentActive(getDb(), num(f, "id"), str(f, "active") === "1");
  back(`/admin/classifica?u=${num(f, "u")}`);
}

export async function changePasswordAction(f: FormData) {
  await requireAdmin();
  const pw = str(f, "password");
  if (pw.length < MIN_PASSWORD) back("/admin/utenti", "password-corta");
  await getDb()
    .update(schema.users)
    .set({ passwordHash: await hashPassword(pw) })
    .where(eq(schema.users.id, num(f, "userId")));
  await getDb().delete(schema.sessions).where(eq(schema.sessions.userId, num(f, "userId")));
  back("/admin/utenti");
}

// --- People and accounts ---------------------------------------------------------------------------

export async function createPersonAction(f: FormData) {
  await requireAdmin();
  const r = await createAccount(getDb(), {
    email: str(f, "email"),
    password: str(f, "password"),
    name: str(f, "name"),
    track: str(f, "track") === "stage" ? "stage" : "lavoro",
    mailboxKey: str(f, "mailboxKey") || null,
  });
  if (!r.ok) back("/admin/utenti", r.error === "exists" ? "email-esistente" : r.error === "password" ? "password-corta" : "email-non-valida");
  back("/admin/utenti", "account-creato");
}

export async function createInviteAction(f: FormData) {
  await requireAdmin();
  const code = await createInvite(getDb(), str(f, "note"));
  // Shown once on the next page via a 2-minute admin-only cookie: never in a URL, never stored in clear.
  (await cookies()).set("compass_invite", code, { httpOnly: true, sameSite: "strict", path: "/admin", maxAge: 120, secure: process.env.NODE_ENV === "production" });
  back("/admin/utenti", "invito-creato");
}

export async function revokeInviteAction(f: FormData) {
  await requireAdmin();
  await getDb().update(schema.invites).set({ revoked: true }).where(eq(schema.invites.id, num(f, "id")));
  back("/admin/utenti");
}

export async function setPersonAction(f: FormData) {
  await requireAdmin();
  const userId = await person(f);
  const key = str(f, "mailboxKey").toLowerCase();
  const digest = str(f, "digestEmail").toLowerCase();
  if (key && !env.demoMode && !mailboxConfig(key)) back("/admin/utenti", "errore");
  if (digest && !isValidEmail(digest)) back("/admin/utenti", "email-non-valida");
  await getDb()
    .update(schema.users)
    .set({ mailboxKey: key || null, digestEmail: digest || null, name: str(f, "name") || undefined })
    .where(eq(schema.users.id, userId));
  back("/admin/utenti");
}

export async function setActiveAction(f: FormData) {
  await requireAdmin();
  await setActive(getDb(), await person(f), str(f, "active") === "1");
  back("/admin/utenti");
}

/** An access request: approved (the person gets an e-mail) or rejected (the request and its data are deleted). */
export async function decideRequestAction(f: FormData) {
  await requireAdmin();
  const userId = await person(f);
  const db = getDb();
  if (str(f, "decision") === "approve") {
    await approveRequest(db, userId);
    back("/admin/utenti", "richiesta-approvata");
  }
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (u?.pendingSince) await deleteAccount(db, userId);
  back("/admin/utenti", "richiesta-rifiutata");
}

export async function deletePersonAction(f: FormData) {
  await requireAdmin();
  const userId = await person(f);
  if (str(f, "confirm") !== "ELIMINA") back("/admin/utenti", "errore");
  await deleteMailConnection(getDb(), userId, fetch); // their Gmail access is revoked at Google too
  await deleteAccount(getDb(), userId);
  back("/admin/utenti", "account-eliminato");
}

/** "Apri l'app di ...": the admin sees one person's app (read and act as them). */
export async function viewAsAction(f: FormData) {
  await requireAdmin();
  await setViewAs(await person(f));
  redirect("/offerte");
}

// --- Catalog ---------------------------------------------------------------------------------------

export async function saveCatalogCompanyAction(f: FormData) {
  await requireAdmin();
  const db = getDb();
  const ats = str(f, "ats");
  const kind = str(f, "kind") as CompanyKind;
  await db
    .update(schema.catalogCompanies)
    .set({
      shared: str(f, "shared") === "1",
      kind: COMPANY_KINDS.includes(kind) ? kind : undefined,
      city: str(f, "city") || null,
      ats: (["greenhouse", "lever", "ashby", "smartrecruiters", "workable", "personio"].includes(ats) ? ats : null) as (typeof schema.catalogCompanies.$inferInsert)["ats"],
      atsSlug: str(f, "atsSlug").replace(/[^\w.-]/g, "") || null,
    })
    .where(eq(schema.catalogCompanies.id, num(f, "id")));
  await rerankAll(db);
  back("/admin/catalogo", "catalogo-salvato");
}

export async function shareCatalogSectorAction(f: FormData) {
  await requireAdmin();
  await getDb().update(schema.catalogSectors).set({ shared: str(f, "shared") === "1" }).where(eq(schema.catalogSectors.id, num(f, "id")));
  back("/admin/catalogo", "catalogo-salvato");
}

export async function deleteCatalogEntryAction(f: FormData) {
  await requireAdmin();
  const db = getDb();
  const kind = str(f, "kind") === "sector" ? "sector" : "company";
  const id = num(f, "id");
  const owners = await db.select({ u: schema.userPrefs.userId }).from(schema.userPrefs).where(and(eq(schema.userPrefs.kind, kind), eq(schema.userPrefs.refId, id)));
  await db.delete(schema.userPrefs).where(and(eq(schema.userPrefs.kind, kind), eq(schema.userPrefs.refId, id)));
  if (kind === "sector") await db.delete(schema.catalogSectors).where(eq(schema.catalogSectors.id, id));
  else await db.delete(schema.catalogCompanies).where(eq(schema.catalogCompanies.id, id));
  for (const o of new Set(owners.map((x) => x.u))) await rerankUser(db, o);
  back("/admin/catalogo", "catalogo-salvato");
}

// --- Demo tools ------------------------------------------------------------------------------------

/** Demo only: put a recruiter reply to a sent application in the demo mailbox. */
export async function simulateReplyAction(f: FormData) {
  await requireAdmin();
  if (!env.demoMode) back("/admin/posta", "errore");
  const db = getDb();
  const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, num(f, "appId")) });
  if (!app?.messageId || !app.toEmail || !app.userId) back("/admin/posta", "errore");
  const owner = await db.query.users.findFirst({ where: eq(schema.users.id, app.userId) });
  const tpl = fs.readFileSync(path.join(process.cwd(), "fixtures/emails/reply-1.eml"), "utf8");
  const id = `<demo-reply-${app.id}-${Date.now()}@${app.toEmail.split("@")[1]}>`;
  const raw = tpl
    .replaceAll("<REPLACE_WITH_SENT_MESSAGE_ID>", app.messageId)
    .replace(/^From: .*$/m, `From: Ufficio Selezione <${app.toEmail}>`)
    .replace(/^Subject: .*$/m, `Subject: Re: ${app.subject ?? "Candidatura"}`)
    .replace(/^Message-ID: .*$/m, `Message-ID: ${id}`)
    .replace(/^Date: .*$/m, `Date: ${new Date().toUTCString()}`);
  await db.insert(schema.demoInbox).values({ messageId: id, raw, mailboxKey: owner?.mailboxKey ?? "default", receivedAt: new Date() });
  await runJob(db, "replies");
  back("/admin/posta", "risposta-simulata");
}

/** Demo only: skip the waiting. Simulated clock jumps to each scheduled time and runs the queue,
 *  so the e-mails still go out one at a time, spaced, inside the send window. */
export async function flushQueueDemoAction() {
  await requireAdmin();
  if (!env.demoMode) back("/admin/posta", "errore");
  const db = getDb();
  let at = new Date();
  for (let i = 0; i < 40; i++) {
    const next = await db.query.applications.findFirst({ where: eq(schema.applications.status, "queued"), orderBy: (a, { asc }) => [asc(a.sendAt)] });
    if (!next?.sendAt) break;
    at = new Date(Math.max(at.getTime(), next.sendAt.getTime()) + 1000);
    await processQueue(db, (u) => new OutboxTransport(db, u.id), at, Math.random, { allowSimulated: true });
  }
  back("/admin/posta", "coda-svuotata");
}
