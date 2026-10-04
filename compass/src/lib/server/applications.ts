// Applying: the three lanes and the send queue. Every e-mail goes through checkSend()
// twice: when she approves it (or autopilot picks it) and again right before it goes out.

import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { pickCv } from "../core/cv-pick";
import { checkSend, inSendWindow, scheduleSend, type Blocklist, type CheckResult, type SendHistoryItem } from "../core/guardrails";
import { SOURCE_LABELS } from "../core/normalize";
import { merge } from "../core/templates";
import type { DB } from "../db";
import { schema } from "../db";
import { notifyAdmin, notifyUser } from "../pipeline/notify";
import type { Transport } from "../mail/transport";
import { getProfile } from "./profile";
import { getSettings } from "./settings";

export type Application = typeof schema.applications.$inferSelect;

const COMMITTED = ["queued", "sent", "replied", "interview", "rejected", "offer"] as const;

export async function sendHistory(db: DB, excludeId?: number): Promise<SendHistoryItem[]> {
  const rows = await db
    .select()
    .from(schema.applications)
    .where(and(inArray(schema.applications.status, [...COMMITTED]), inArray(schema.applications.lane, ["email", "curated"])));
  return rows
    .filter((r) => r.id !== excludeId && r.toEmail)
    .map((r) => ({
      jobId: r.jobId,
      company: r.company,
      recipient: r.toEmail!,
      at: r.sentAt ?? r.sendAt ?? r.createdAt,
      spontaneous: r.spontaneousCompanyId != null,
    }));
}

export async function getBlocklist(db: DB): Promise<Blocklist> {
  const rows = await db.select().from(schema.blocklist);
  return {
    companies: rows.filter((r) => r.kind === "company").map((r) => r.value),
    domains: rows.filter((r) => r.kind === "domain").map((r) => r.value),
    keywords: rows.filter((r) => r.kind === "keyword").map((r) => r.value),
  };
}

async function cvSizes(db: DB) {
  return db
    .select({ id: schema.cvs.id, label: schema.cvs.label, roleFamily: schema.cvs.roleFamily, isDefault: schema.cvs.isDefault, size: schema.cvs.size })
    .from(schema.cvs)
    .orderBy(asc(schema.cvs.id));
}

/** Run the guardrails for an application as it stands now. */
export async function evaluate(db: DB, app: Application, mode: "manual" | "autopilot", now = new Date()): Promise<CheckResult> {
  const settings = await getSettings(db);
  const job = app.jobId ? await db.query.jobs.findFirst({ where: eq(schema.jobs.id, app.jobId) }) : null;
  const cv = app.cvId ? (await cvSizes(db)).find((c) => c.id === app.cvId) : null;
  return checkSend(
    {
      jobId: app.jobId,
      company: app.company,
      title: app.role ?? job?.title ?? "",
      description: job?.description ?? "",
      recipient: app.toEmail ?? "",
      spontaneous: app.spontaneousCompanyId != null,
      level: job?.level ?? null,
      scamFlags: job?.scamFlags ?? [],
      attachmentBytes: cv?.size ?? null,
    },
    { mode, settings: settings.guardrails, history: await sendHistory(db, app.id), blocklist: await getBlocklist(db), now },
  );
}

async function existingFor(db: DB, jobId: number): Promise<Application | undefined> {
  return db.query.applications.findFirst({
    where: and(eq(schema.applications.jobId, jobId), inArray(schema.applications.status, ["draft", ...COMMITTED, "applied_site"])),
  });
}

function sourcePhrase(sources: string[]): string {
  const s = sources[0];
  if (!s) return "il vostro annuncio";
  if (s.startsWith("email:linkedin") || s === "w1") return "il vostro annuncio online";
  if (s.startsWith("email:indeed")) return "il vostro annuncio su Indeed";
  if (s.startsWith("email:infojobs")) return "il vostro annuncio su InfoJobs";
  if (s.startsWith("ats:")) return "il vostro annuncio sul sito aziendale";
  return `il vostro annuncio (${SOURCE_LABELS[s] ?? "online"})`;
}

/** Lane 1: prepare an e-mail application for a job that accepts applications by e-mail. */
export async function prepareEmailApplication(
  db: DB,
  jobId: number,
  opts: { mode?: "manual" | "autopilot"; cvId?: number; templateId?: number; lane?: "email" | "curated"; subject?: string; body?: string } = {},
): Promise<Application | null> {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) });
  if (!job?.applicationEmail) return null;
  const existing = await existingFor(db, jobId);
  if (existing) return existing;

  const profile = await getProfile(db);
  const cvs = await cvSizes(db);
  const cv = opts.cvId ? cvs.find((c) => c.id === opts.cvId) : pickCv(cvs, { title: job.title, sector: job.sector });
  const tpl = opts.templateId
    ? await db.query.templates.findFirst({ where: eq(schema.templates.id, opts.templateId) })
    : ((await db.query.templates.findFirst({ where: and(eq(schema.templates.kind, "job"), eq(schema.templates.isDefault, true)) })) ??
      (await db.query.templates.findFirst({ where: eq(schema.templates.kind, "job") })));
  const sources = (await db.select({ s: schema.jobSources.source }).from(schema.jobSources).where(eq(schema.jobSources.jobId, jobId))).map((r) => r.s);
  const values = { azienda: job.company, ruolo: job.title, citta: job.city, fonte: sourcePhrase(sources), nome: profile.name };

  const [app] = await db
    .insert(schema.applications)
    .values({
      jobId,
      lane: opts.lane ?? "email",
      mode: opts.mode ?? "manual",
      status: "draft",
      company: job.company,
      role: job.title,
      toEmail: job.applicationEmail,
      subject: opts.subject ?? merge(tpl?.subject ?? "Candidatura per {ruolo} | {nome}", values),
      body: opts.body ?? merge(tpl?.body ?? "", values),
      cvId: cv?.id ?? null,
      templateId: tpl?.id ?? null,
      updatedAt: new Date(),
    })
    .returning();
  const check = await evaluate(db, app, "manual");
  await db.update(schema.applications).set({ warnings: [...check.warnings, ...check.blockers] }).where(eq(schema.applications.id, app.id));
  return { ...app, warnings: [...check.warnings, ...check.blockers] };
}

/** Spontaneous application to a company that publishes an address for that purpose. */
export async function prepareSpontaneous(db: DB, companyId: number): Promise<Application | null> {
  const c = await db.query.spontaneousCompanies.findFirst({ where: eq(schema.spontaneousCompanies.id, companyId) });
  if (!c || c.status !== "approved" || !c.active) return null;
  const open = await db.query.applications.findFirst({
    where: and(eq(schema.applications.spontaneousCompanyId, companyId), inArray(schema.applications.status, ["draft", "queued"])),
  });
  if (open) return open;
  const profile = await getProfile(db);
  const cvs = await cvSizes(db);
  const cv = cvs.find((x) => x.isDefault) ?? cvs[0];
  const tpl = await db.query.templates.findFirst({ where: eq(schema.templates.kind, "spontaneous") });
  const values = { azienda: c.name, ruolo: profile.roles[0] ?? null, citta: c.city, fonte: "il vostro sito", nome: profile.name };
  const [app] = await db
    .insert(schema.applications)
    .values({
      spontaneousCompanyId: c.id,
      lane: "email",
      status: "draft",
      company: c.name,
      role: "Candidatura spontanea",
      toEmail: c.email,
      subject: merge(tpl?.subject ?? "Candidatura spontanea | {nome}", values),
      body: merge(tpl?.body ?? "", values),
      cvId: cv?.id ?? null,
      templateId: tpl?.id ?? null,
      updatedAt: new Date(),
    })
    .returning();
  const check = await evaluate(db, app, "manual");
  await db.update(schema.applications).set({ warnings: [...check.warnings, ...check.blockers] }).where(eq(schema.applications.id, app.id));
  return app;
}

export interface ApproveResult {
  ok: boolean;
  sendAt?: Date;
  blockers?: { code: string; message: string }[];
}

/** "Invia": guardrails, then into the queue with a send time >= 15 minutes away. */
export async function approveApplication(db: DB, appId: number, now = new Date(), rng: () => number = Math.random, mode: "manual" | "autopilot" = "manual"): Promise<ApproveResult> {
  const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, appId) });
  if (!app || app.status !== "draft") return { ok: false, blockers: [{ code: "not-draft", message: "Questa candidatura non è più da inviare." }] };
  const check = await evaluate(db, app, mode, now);
  if (!check.ok) {
    await db.update(schema.applications).set({ warnings: [...check.warnings, ...check.blockers], updatedAt: now }).where(eq(schema.applications.id, appId));
    return { ok: false, blockers: check.blockers };
  }
  const settings = await getSettings(db);
  const scheduled = (await sendHistory(db, appId)).map((h) => h.at).filter((d) => d.getTime() > now.getTime() - 2 * 86400000);
  const sendAt = scheduleSend(now, settings.guardrails, scheduled, rng);
  if (!sendAt) return { ok: false, blockers: [{ code: "no-slot", message: "Nei prossimi giorni non ci sono posti liberi per inviare." }] };
  await db.update(schema.applications).set({ status: "queued", sendAt, mode, warnings: check.warnings, updatedAt: now }).where(eq(schema.applications.id, appId));
  return { ok: true, sendAt };
}

/** "Invia tutte (N)": approve every ready draft, best matches first. */
export async function approveAll(db: DB, now = new Date(), rng: () => number = Math.random): Promise<{ queued: number; blocked: number }> {
  const drafts = await listDrafts(db);
  let queued = 0;
  let blocked = 0;
  for (const d of drafts) {
    const r = await approveApplication(db, d.app.id, now, rng);
    if (r.ok) queued++;
    else blocked++;
  }
  return { queued, blocked };
}

/** "Annulla" during the undo window: back to "Da inviare". */
export async function cancelApplication(db: DB, appId: number, now = new Date()): Promise<boolean> {
  const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, appId) });
  if (!app || app.status !== "queued" || (app.sendAt && app.sendAt <= now)) return false;
  await db.update(schema.applications).set({ status: "draft", sendAt: null, updatedAt: now }).where(eq(schema.applications.id, appId));
  await db.insert(schema.sendLog).values({
    applicationId: appId,
    toEmail: app.toEmail ?? "",
    company: app.company,
    role: app.role,
    status: "cancelled",
    detail: "Annullata durante l'attesa",
    at: now,
  });
  return true;
}

export async function skipApplication(db: DB, appId: number): Promise<void> {
  await db.update(schema.applications).set({ status: "skipped", updatedAt: new Date() }).where(and(eq(schema.applications.id, appId), eq(schema.applications.status, "draft")));
}

export async function updateDraft(db: DB, appId: number, patch: { subject?: string; body?: string; cvId?: number | null }): Promise<void> {
  await db.update(schema.applications).set({ ...patch, updatedAt: new Date() }).where(and(eq(schema.applications.id, appId), eq(schema.applications.status, "draft")));
}

/** Kill switch: stop everything, and pull queued e-mails back to "Da inviare". */
export async function setKillSwitch(db: DB, on: boolean): Promise<number> {
  const { updateGuardrails } = await import("./settings");
  await updateGuardrails(db, { killSwitch: on });
  if (!on) return 0;
  const queued = await db.select({ id: schema.applications.id }).from(schema.applications).where(eq(schema.applications.status, "queued"));
  if (queued.length) {
    await db.update(schema.applications).set({ status: "draft", sendAt: null }).where(eq(schema.applications.status, "queued"));
  }
  return queued.length;
}

export async function listDrafts(db: DB) {
  const rows = await db
    .select({ app: schema.applications, job: schema.jobs })
    .from(schema.applications)
    .leftJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(eq(schema.applications.status, "draft"))
    .orderBy(sql`case ${schema.jobs.level} when 'molto' then 0 when 'adatta' then 1 else 2 end`, asc(schema.applications.createdAt));
  return rows;
}

export async function listQueued(db: DB) {
  return db.select().from(schema.applications).where(eq(schema.applications.status, "queued")).orderBy(asc(schema.applications.sendAt));
}

export async function listMine(db: DB) {
  return db
    .select({ app: schema.applications, job: schema.jobs })
    .from(schema.applications)
    .leftJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(inArray(schema.applications.status, ["sent", "applied_site", "replied", "interview", "rejected", "offer", "failed"]))
    .orderBy(desc(sql`coalesce(${schema.applications.sentAt}, ${schema.applications.updatedAt}, ${schema.applications.createdAt})`));
}

// --- Queue runner ---------------------------------------------------------------------------------

export interface QueueSummary {
  sent: number;
  failed: number;
  held: number;
}

/** Send every queued e-mail whose time has come. Re-checks every guardrail first. */
export async function processQueue(db: DB, transport: Transport, now = new Date(), rng: () => number = Math.random): Promise<QueueSummary> {
  const settings = await getSettings(db);
  const out: QueueSummary = { sent: 0, failed: 0, held: 0 };
  if (settings.guardrails.killSwitch) return out;
  const due = await db
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.status, "queued"), lte(schema.applications.sendAt, now)))
    .orderBy(asc(schema.applications.sendAt));
  for (const app of due) {
    if (!inSendWindow(now, settings.guardrails)) {
      const sendAt = scheduleSend(now, settings.guardrails, [], rng);
      await db.update(schema.applications).set({ sendAt }).where(eq(schema.applications.id, app.id));
      out.held++;
      continue;
    }
    const check = await evaluate(db, app, app.mode, now);
    if (!check.ok) {
      await db.update(schema.applications).set({ status: "draft", sendAt: null, warnings: [...check.warnings, ...check.blockers] }).where(eq(schema.applications.id, app.id));
      out.held++;
      continue;
    }
    const cv = app.cvId ? await db.query.cvs.findFirst({ where: eq(schema.cvs.id, app.cvId) }) : null;
    const tpl = app.templateId ? await db.query.templates.findFirst({ where: eq(schema.templates.id, app.templateId) }) : null;
    try {
      const res = await transport.send({
        kind: "application",
        to: app.toEmail!,
        subject: app.subject ?? "",
        text: app.body ?? "",
        attachment: cv ? { filename: cv.filename, content: Buffer.from(cv.data), contentType: cv.mime } : undefined,
      });
      await db
        .update(schema.applications)
        .set({ status: "sent", sentAt: now, messageId: res.messageId, simulated: res.simulated, updatedAt: now })
        .where(eq(schema.applications.id, app.id));
      if (app.jobId) await db.update(schema.jobs).set({ status: "applied" }).where(eq(schema.jobs.id, app.jobId));
      await db.insert(schema.sendLog).values({
        applicationId: app.id,
        toEmail: app.toEmail!,
        company: app.company,
        role: app.role,
        cvLabel: cv?.label ?? null,
        templateName: tpl?.name ?? null,
        status: res.simulated ? "simulated" : "sent",
        detail: res.simulated ? "Modalità prova: e-mail non partita davvero" : `Message-ID ${res.messageId}`,
        at: now,
      });
      out.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 160) : "errore";
      await db.update(schema.applications).set({ status: "failed", lastError: msg, updatedAt: now }).where(eq(schema.applications.id, app.id));
      await db.insert(schema.sendLog).values({ applicationId: app.id, toEmail: app.toEmail!, company: app.company, role: app.role, status: "failed", detail: msg, at: now });
      await notifyAdmin(db, `Invio non riuscito a ${app.company ?? "un'azienda"}: ${msg}`, "/admin/registro");
      out.failed++;
    }
  }
  if (out.sent > 0) {
    await notifyUser(db, out.sent === 1 ? "1 candidatura è partita." : `${out.sent} candidature sono partite.`, "/candidature");
  }
  return out;
}

// --- Autopilot ------------------------------------------------------------------------------------

/** Mode B: queue "Molto adatta" jobs with an application e-mail that pass every guardrail. */
export async function runAutopilot(db: DB, now = new Date(), rng: () => number = Math.random): Promise<{ queued: number; held: number }> {
  const settings = await getSettings(db);
  if (!settings.guardrails.autopilot || settings.guardrails.killSwitch) return { queued: 0, held: 0 };
  const candidates = await db
    .select()
    .from(schema.jobs)
    .where(and(eq(schema.jobs.level, "molto"), inArray(schema.jobs.status, ["new", "seen"]), sql`${schema.jobs.applicationEmail} is not null`))
    .orderBy(desc(schema.jobs.score));
  let queued = 0;
  let held = 0;
  for (const job of candidates) {
    if (await existingFor(db, job.id)) continue;
    const app = await prepareEmailApplication(db, job.id, { mode: "autopilot" });
    if (!app) continue;
    const r = await approveApplication(db, app.id, now, rng, "autopilot");
    if (r.ok) queued++;
    else held++; // stays in "Da inviare" for her to look at
  }
  return { queued, held };
}

// --- Lanes 2 and 3 ----------------------------------------------------------------------------------

/** Lane 3: she applied on the site herself. */
export async function markAppliedOnSite(db: DB, jobId: number, now = new Date()): Promise<void> {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) });
  if (!job) return;
  const existing = await db.query.applications.findFirst({ where: and(eq(schema.applications.jobId, jobId), eq(schema.applications.lane, "site")) });
  if (!existing) {
    await db.insert(schema.applications).values({ jobId, lane: "site", status: "applied_site", company: job.company, role: job.title, sentAt: now, updatedAt: now });
  }
  await db.update(schema.jobs).set({ status: "applied" }).where(eq(schema.jobs.id, jobId));
}

/** Lane 2: the text tailored in the Claude chat comes back. E-mail jobs go to "Da inviare". */
export async function saveCurated(db: DB, jobId: number, input: { subject: string; body: string }): Promise<"queued-for-approval" | "use-site"> {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) });
  if (!job) return "use-site";
  if (!job.applicationEmail) return "use-site";
  const existing = await existingFor(db, jobId);
  if (existing?.status === "draft") {
    await db.update(schema.applications).set({ subject: input.subject, body: input.body, lane: "curated", updatedAt: new Date() }).where(eq(schema.applications.id, existing.id));
  } else if (!existing) {
    await prepareEmailApplication(db, jobId, { lane: "curated", subject: input.subject, body: input.body });
  }
  return "queued-for-approval";
}

export async function setStatus(db: DB, appId: number, status: Application["status"]): Promise<void> {
  await db.update(schema.applications).set({ status, updatedAt: new Date() }).where(eq(schema.applications.id, appId));
}

export async function sentTodayCount(db: DB, now = new Date()): Promise<number> {
  const { romeDateKey } = await import("../core/time");
  const rows = await db.select({ at: schema.applications.sentAt }).from(schema.applications).where(eq(schema.applications.status, "sent"));
  return rows.filter((r) => r.at && romeDateKey(r.at) === romeDateKey(now)).length;
}
