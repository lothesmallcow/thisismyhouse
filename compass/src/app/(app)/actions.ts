"use server";
// Server actions for her app. Every action checks the session first (they are reachable by
// direct POST), then redirects with a fixed message code.

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_ATTACHMENT_BYTES } from "@/lib/core/guardrails";
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
  setStatus,
  skipApplication,
  updateDraft,
} from "@/lib/server/applications";
import { requireUser, signOut } from "@/lib/server/auth";
import { dismissJob, markSeen, restoreJob, upsertRawJob, type DismissReason } from "@/lib/server/jobs";
import { deleteAllMyData } from "@/lib/server/privacy";
import { confirmReply, dismissReply } from "@/lib/server/replies";

const num = (f: FormData, k: string) => Number(f.get(k));
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function done(path: string, msg: string): never {
  revalidatePath("/", "layout");
  const [base, hash] = path.split("#");
  redirect(`${base}${base.includes("?") ? "&" : "?"}msg=${msg}${hash ? `#${hash}` : ""}`);
}

// --- Offerte -------------------------------------------------------------------------------------

export async function dismissAction(f: FormData) {
  await requireUser();
  const reason = (str(f, "reason") || "nessuno") as DismissReason;
  await dismissJob(getDb(), num(f, "jobId"), reason);
  done("/offerte", "scartata");
}

export async function restoreAction(f: FormData) {
  await requireUser();
  await restoreJob(getDb(), num(f, "jobId"));
  done(`/offerte/${num(f, "jobId")}`, "salvato");
}

export async function markSeenAction(jobId: number) {
  await requireUser();
  await markSeen(getDb(), jobId);
}

export async function prepareEmailAction(f: FormData) {
  await requireUser();
  const app = await prepareEmailApplication(getDb(), num(f, "jobId"));
  if (!app) done(`/offerte/${num(f, "jobId")}`, "errore");
  done(`/da-inviare#candidatura-${app.id}`, "preparata");
}

export async function appliedOnSiteAction(f: FormData) {
  await requireUser();
  await markAppliedOnSite(getDb(), num(f, "jobId"));
  done("/candidature", "candidata");
}

export async function saveCuratedAction(f: FormData) {
  await requireUser();
  const jobId = num(f, "jobId");
  const body = str(f, "body");
  if (!body) done(`/offerte/${jobId}/claude`, "errore");
  const r = await saveCurated(getDb(), jobId, { subject: str(f, "subject") || "Candidatura", body });
  if (r === "use-site") done(`/offerte/${jobId}/kit`, "usa-il-sito");
  done("/da-inviare", "testo-salvato");
}

export async function manualAddAction(f: FormData) {
  await requireUser();
  const title = str(f, "title");
  if (!title) done("/offerte/aggiungi", "errore");
  const url = str(f, "url");
  const res = await upsertRawJob(getDb(), {
    source: "manual",
    url: /^https?:\/\//.test(url) ? url : null,
    title,
    company: str(f, "company") || null,
    location: str(f, "city") || null,
    description: str(f, "text"),
    salaryText: str(f, "salary") || null,
    postedAt: new Date(),
  });
  const email = str(f, "email");
  if (email && isValidEmail(email)) {
    await getDb()
      .update(schema.jobs)
      .set({ applicationEmail: email.toLowerCase(), applicationEmailEvidence: "Indirizzo aggiunto a mano" })
      .where(eq(schema.jobs.id, res.jobId));
  }
  done(`/offerte/${res.jobId}`, "aggiunta");
}

// --- Da inviare ----------------------------------------------------------------------------------

export async function approveAction(f: FormData) {
  await requireUser();
  const r = await approveApplication(getDb(), num(f, "appId"));
  done("/da-inviare", r.ok ? "in-coda" : "bloccata");
}

export async function approveAllAction() {
  await requireUser();
  await approveAll(getDb());
  done("/da-inviare", "tutte-in-coda");
}

export async function cancelAction(f: FormData) {
  await requireUser();
  const ok = await cancelApplication(getDb(), num(f, "appId"));
  done("/da-inviare", ok ? "annullata" : "errore");
}

export async function skipAction(f: FormData) {
  await requireUser();
  await skipApplication(getDb(), num(f, "appId"));
  done("/da-inviare", "saltata");
}

export async function updateDraftAction(f: FormData) {
  await requireUser();
  const cvId = num(f, "cvId");
  await updateDraft(getDb(), num(f, "appId"), { subject: str(f, "subject"), body: str(f, "body"), cvId: cvId || null });
  done(`/da-inviare#candidatura-${num(f, "appId")}`, "salvato");
}

export async function killSwitchAction(f: FormData) {
  await requireUser();
  const on = str(f, "on") === "1";
  await setKillSwitch(getDb(), on);
  done("/da-inviare", on ? "fermati" : "ripartiti");
}

export async function prepareSpontaneousAction(f: FormData) {
  await requireUser();
  const app = await prepareSpontaneous(getDb(), num(f, "companyId"));
  done(app ? `/da-inviare#candidatura-${app.id}` : "/da-inviare", app ? "preparata" : "errore");
}

// --- Candidature -------------------------------------------------------------------------------

export async function confirmReplyAction(f: FormData) {
  await requireUser();
  const status = str(f, "status") as ApplicationStatus | "";
  await confirmReply(getDb(), num(f, "replyId"), status || undefined);
  done("/candidature", "stato-aggiornato");
}

export async function dismissReplyAction(f: FormData) {
  await requireUser();
  await dismissReply(getDb(), num(f, "replyId"));
  done("/candidature", "salvato");
}

export async function setStatusAction(f: FormData) {
  await requireUser();
  await setStatus(getDb(), num(f, "appId"), str(f, "status") as ApplicationStatus);
  done("/candidature", "stato-aggiornato");
}

// --- Aiuto: CV, lettere, dati ------------------------------------------------------------------

export async function uploadCvAction(f: FormData) {
  await requireUser();
  const back = str(f, "back") || "/aiuto/cv";
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) done(back, "errore");
  if (file.size > MAX_ATTACHMENT_BYTES) done(back, "cv-troppo-grande");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") done(back, "cv-non-pdf");
  const db = getDb();
  const existing = await db.select({ id: schema.cvs.id }).from(schema.cvs);
  if (existing.length >= 3) done(back, "cv-troppi");
  const family = str(f, "family") || "Generale";
  await db.insert(schema.cvs).values({
    label: `CV ${family}`,
    roleFamily: family,
    filename: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "cv.pdf",
    size: buf.length,
    data: buf,
    text: str(f, "text"),
    isDefault: existing.length === 0,
  });
  done(back, "cv-caricato");
}

export async function deleteCvAction(f: FormData) {
  await requireUser();
  await getDb().delete(schema.cvs).where(eq(schema.cvs.id, num(f, "cvId")));
  done(str(f, "back") || "/aiuto/cv", "salvato");
}

export async function setDefaultCvAction(f: FormData) {
  await requireUser();
  const db = getDb();
  await db.update(schema.cvs).set({ isDefault: false });
  await db.update(schema.cvs).set({ isDefault: true }).where(eq(schema.cvs.id, num(f, "cvId")));
  done("/aiuto/cv", "salvato");
}

export async function saveCvTextAction(f: FormData) {
  await requireUser();
  await getDb().update(schema.cvs).set({ text: str(f, "text"), roleFamily: str(f, "family") || "Generale", label: `CV ${str(f, "family") || "Generale"}` }).where(eq(schema.cvs.id, num(f, "cvId")));
  done("/aiuto/cv", "salvato");
}

export async function saveTemplateAction(f: FormData) {
  await requireUser();
  await getDb()
    .update(schema.templates)
    .set({ subject: str(f, "subject"), body: str(f, "body"), name: str(f, "name") || "Lettera", updatedAt: new Date() })
    .where(eq(schema.templates.id, num(f, "templateId")));
  done("/aiuto/lettere", "salvato");
}

export async function deleteAllDataAction() {
  await requireUser();
  await deleteAllMyData(getDb());
  revalidatePath("/", "layout");
  redirect("/benvenuto/1?msg=dati-cancellati");
}

export async function signOutAction() {
  await signOut("user");
  redirect("/entra");
}
