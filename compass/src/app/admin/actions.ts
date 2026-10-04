"use server";
// Admin server actions. Every one starts with requireAdmin().

import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidEmail } from "@/lib/core/extract";
import { HARD_MAX_PER_DAY, inSendWindow } from "@/lib/core/guardrails";
import { romeParts, romeToUtc } from "@/lib/core/time";
import { OutboxTransport } from "@/lib/mail/transport";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { JOB_NAMES, runJob, type JobName } from "@/lib/pipeline/jobs";
import { processQueue, setKillSwitch } from "@/lib/server/applications";
import { requireAdmin, signIn, signOut } from "@/lib/server/auth";
import { setAdjustmentActive } from "@/lib/server/jobs";
import { hashPassword } from "@/lib/server/passwords";
import { getSettings, setSetting, updateGuardrails } from "@/lib/server/settings";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string, d = 0) => (Number.isFinite(Number(f.get(k))) && f.get(k) !== "" ? Number(f.get(k)) : d);
const hm = (s: string, d: number) => {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : d;
};

function back(path: string, msg = "salvato"): never {
  revalidatePath("/", "layout");
  redirect(`${path}?msg=${msg}`);
}

export async function adminSignInAction(f: FormData) {
  const ok = await signIn(str(f, "email"), str(f, "password"), "admin");
  redirect(ok ? "/admin" : "/admin/entra?errore=1");
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
    autopilot: str(f, "autopilot") === "1",
  });
  back("/admin/invii");
}

export async function realSendingAction(f: FormData) {
  await requireAdmin();
  const db = getDb();
  const on = str(f, "on") === "1";
  const s = await getSettings(db);
  await setSetting(db, "realSending", on);
  // First switch-on starts the "first week" (3 per day).
  if (on && !s.guardrails.goLiveAt) await updateGuardrails(db, { goLiveAt: new Date() });
  back("/admin/invii");
}

export async function adminKillSwitchAction(f: FormData) {
  await requireAdmin();
  await setKillSwitch(getDb(), str(f, "on") === "1");
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
  const ats = str(f, "ats") as (typeof schema.companyWatchlist.$inferInsert)["ats"];
  if (!str(f, "name") || !str(f, "slug")) back("/admin/aziende", "errore");
  await getDb().insert(schema.companyWatchlist).values({ name: str(f, "name"), ats, slug: str(f, "slug") });
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
  await getDb()
    .update(schema.approvedSites)
    .set({ approved, termsSummary: str(f, "terms") || undefined })
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
  const email = str(f, "email").toLowerCase();
  if (!str(f, "name") || !isValidEmail(email) || !/^https?:\/\//.test(str(f, "sourceUrl"))) back("/admin/spontanee", "errore");
  await getDb().insert(schema.spontaneousCompanies).values({ name: str(f, "name"), email, sourceUrl: str(f, "sourceUrl"), city: str(f, "city") || null, status: "approved" });
  back("/admin/spontanee");
}

/** CSV: name,email,source_url,city (header optional). */
export async function importSpontaneousCsvAction(f: FormData) {
  await requireAdmin();
  const file = f.get("file");
  const text = file instanceof File ? await file.text() : str(f, "csv");
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((r) => r.length >= 3 && isValidEmail(r[1]) && /^https?:\/\//.test(r[2]));
  if (rows.length) {
    await getDb()
      .insert(schema.spontaneousCompanies)
      .values(rows.map(([name, email, sourceUrl, city]) => ({ name, email: email.toLowerCase(), sourceUrl, city: city || null, status: "approved" as const })));
  }
  back("/admin/spontanee", rows.length ? "importati" : "errore");
}

export async function setSpontaneousStatusAction(f: FormData) {
  await requireAdmin();
  await getDb()
    .update(schema.spontaneousCompanies)
    .set({ status: str(f, "status") as "approved" | "rejected" | "suggested" })
    .where(eq(schema.spontaneousCompanies.id, num(f, "id")));
  back("/admin/spontanee");
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
  back("/admin/classifica");
}

export async function changePasswordAction(f: FormData) {
  await requireAdmin();
  const pw = str(f, "password");
  if (pw.length < 8) back("/admin/utenti", "password-corta");
  await getDb()
    .update(schema.users)
    .set({ passwordHash: await hashPassword(pw) })
    .where(eq(schema.users.id, num(f, "userId")));
  back("/admin/utenti");
}

// --- Demo tools ------------------------------------------------------------------------------------

/** Demo only: put a recruiter reply to a sent application in the demo mailbox. */
export async function simulateReplyAction(f: FormData) {
  await requireAdmin();
  if (!env.demoMode) back("/admin/posta", "errore");
  const db = getDb();
  const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, num(f, "appId")) });
  if (!app?.messageId || !app.toEmail) back("/admin/posta", "errore");
  const tpl = fs.readFileSync(path.join(process.cwd(), "fixtures/emails/reply-1.eml"), "utf8");
  const id = `<demo-reply-${app.id}-${Date.now()}@${app.toEmail.split("@")[1]}>`;
  const raw = tpl
    .replaceAll("<REPLACE_WITH_SENT_MESSAGE_ID>", app.messageId)
    .replace(/^From: .*$/m, `From: Ufficio Selezione <${app.toEmail}>`)
    .replace(/^Subject: .*$/m, `Subject: Re: ${app.subject ?? "Candidatura"}`)
    .replace(/^Message-ID: .*$/m, `Message-ID: ${id}`)
    .replace(/^Date: .*$/m, `Date: ${new Date().toUTCString()}`);
  await db.insert(schema.demoInbox).values({ messageId: id, raw, receivedAt: new Date() });
  await runJob(db, "replies");
  back("/admin/posta", "risposta-simulata");
}

/** Demo only: make every queued e-mail due now and run the queue (skips the waiting). */
export async function flushQueueDemoAction() {
  await requireAdmin();
  if (!env.demoMode) back("/admin/posta", "errore");
  const db = getDb();
  const settings = await getSettings(db);
  const now = new Date();
  // Outside the send window the queue would (correctly) wait; the demo pretends it is 10:00 on a weekday.
  const at = inSendWindow(now, settings.guardrails) ? now : nextWeekdayTen(now);
  await db.update(schema.applications).set({ sendAt: new Date(at.getTime() - 1000) }).where(eq(schema.applications.status, "queued"));
  await processQueue(db, new OutboxTransport(db), at);
  back("/admin/posta", "coda-svuotata");
}

function nextWeekdayTen(now: Date): Date {
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const p = romeParts(d);
    if (p.weekday <= 5) {
      const t = romeToUtc(p.year, p.month, p.day, 10, 0);
      if (t > now || i > 0) return t;
    }
  }
  return now;
}
