// Applying: the three lanes and the send queue, per person. Every e-mail goes through checkSend()
// twice: when they approve it (or autopilot picks it) and again right before it goes out.
// Every function that takes `userId` only touches that person's rows.

import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { pickCv } from "../core/cv-pick";
import { checkSend, effectiveDailyCap, inSendWindow, isStopped, scheduleSend, type Blocklist, type CheckResult, type SendHistoryItem } from "../core/guardrails";
import { SOURCE_LABELS } from "../core/normalize";
import { scamFlags } from "../core/scam-rules";
import { merge } from "../core/templates";
import { romeDateKey } from "../core/time";
import type { DB } from "../db";
import { schema } from "../db";
import { notifyAdmin, notifyUser } from "../pipeline/notify";
import type { Transport } from "../mail/transport";
import { env } from "../env";
import { getJob } from "./jobs";
import { getProfile } from "./profile";
import { guardrailsFor, updateGuardrails, updateUserSettings } from "./settings";

export type Application = typeof schema.applications.$inferSelect;

const COMMITTED = ["queued", "sending", "sent", "replied", "interview", "rejected", "offer"] as const;

const mine = (userId: number, appId: number) => and(eq(schema.applications.id, appId), eq(schema.applications.userId, userId));

async function own(db: DB, userId: number, appId: number): Promise<Application | undefined> {
  return db.query.applications.findFirst({ where: mine(userId, appId) });
}

/** One person's e-mails (committed or sent): the basis for repeats, cooldowns and spacing. */
export async function sendHistory(db: DB, userId: number, excludeId?: number): Promise<SendHistoryItem[]> {
  const rows = await db
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), inArray(schema.applications.status, [...COMMITTED]), inArray(schema.applications.lane, ["email", "curated"])));
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

export async function cvList(db: DB, userId: number) {
  return db
    .select({ id: schema.cvs.id, label: schema.cvs.label, roleFamily: schema.cvs.roleFamily, isDefault: schema.cvs.isDefault, size: schema.cvs.size, filename: schema.cvs.filename })
    .from(schema.cvs)
    .where(eq(schema.cvs.userId, userId))
    .orderBy(asc(schema.cvs.id));
}

/** Run the guardrails for an application as it stands now. */
export async function evaluate(db: DB, app: Application, mode: "manual" | "autopilot", now = new Date()): Promise<CheckResult> {
  const userId = app.userId!;
  const data = app.jobId ? await getJob(db, userId, app.jobId) : null;
  const job = data?.job ?? null;
  const cv = app.cvId ? (await cvList(db, userId)).find((c) => c.id === app.cvId) : null;
  return checkSend(
    {
      jobId: app.jobId,
      company: app.company,
      title: app.role ?? job?.title ?? "",
      description: job?.description ?? "",
      recipient: app.toEmail ?? "",
      spontaneous: app.spontaneousCompanyId != null,
      level: job?.level ?? null,
      // Recomputed now from the current ad and the actual recipient (the stored flags may predate
      // an e-mail address added later by another source, by hand, or a spontaneous application).
      scamFlags: scamFlags({
        title: app.role ?? job?.title ?? "",
        company: app.company,
        description: job?.description ?? "",
        applicationEmail: app.toEmail,
        maxAnnualGross: job?.salaryMax ?? null,
      }),
      attachmentBytes: cv?.size ?? null,
    },
    { mode, settings: await guardrailsFor(db, userId), history: await sendHistory(db, userId, app.id), blocklist: await getBlocklist(db), now },
  );
}

async function existingFor(db: DB, userId: number, jobId: number): Promise<Application | undefined> {
  return db.query.applications.findFirst({
    where: and(eq(schema.applications.userId, userId), eq(schema.applications.jobId, jobId), inArray(schema.applications.status, ["draft", ...COMMITTED, "applied_site"])),
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

async function defaultTemplate(db: DB, userId: number, kind: "job" | "spontaneous") {
  return (
    (await db.query.templates.findFirst({ where: and(eq(schema.templates.userId, userId), eq(schema.templates.kind, kind), eq(schema.templates.isDefault, true)) })) ??
    (await db.query.templates.findFirst({ where: and(eq(schema.templates.userId, userId), eq(schema.templates.kind, kind)) }))
  );
}

/** Lane 1: prepare an e-mail application for a job that accepts applications by e-mail. */
export async function prepareEmailApplication(
  db: DB,
  userId: number,
  jobId: number,
  opts: { mode?: "manual" | "autopilot"; cvId?: number; templateId?: number; lane?: "email" | "curated"; subject?: string; body?: string } = {},
): Promise<Application | null> {
  const data = await getJob(db, userId, jobId);
  const job = data?.job;
  if (!job?.applicationEmail) return null;
  const existing = await existingFor(db, userId, jobId);
  if (existing) return existing;

  const profile = await getProfile(db, userId);
  const cvs = await cvList(db, userId);
  const cv = opts.cvId ? cvs.find((c) => c.id === opts.cvId) : pickCv(cvs, { title: job.title, sector: job.sector });
  const tpl = opts.templateId
    ? await db.query.templates.findFirst({ where: and(eq(schema.templates.id, opts.templateId), eq(schema.templates.userId, userId)) })
    : await defaultTemplate(db, userId, "job");
  const values = { azienda: job.company, ruolo: job.title, citta: job.city, fonte: sourcePhrase(data!.sources.map((s) => s.source)), nome: profile.name };

  const [app] = await db
    .insert(schema.applications)
    .values({
      userId,
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

/** Spontaneous application to a company (on this person's list) that publishes an address for that purpose. */
export async function prepareSpontaneous(db: DB, userId: number, companyId: number): Promise<Application | null> {
  const c = await db.query.spontaneousCompanies.findFirst({ where: and(eq(schema.spontaneousCompanies.id, companyId), eq(schema.spontaneousCompanies.userId, userId)) });
  if (!c || c.status !== "approved" || !c.active) return null;
  const open = await db.query.applications.findFirst({
    where: and(eq(schema.applications.userId, userId), eq(schema.applications.spontaneousCompanyId, companyId), inArray(schema.applications.status, ["draft", "queued"])),
  });
  if (open) return open;
  const profile = await getProfile(db, userId);
  const cvs = await cvList(db, userId);
  const cv = cvs.find((x) => x.isDefault) ?? cvs[0];
  const tpl = await defaultTemplate(db, userId, "spontaneous");
  const values = { azienda: c.name, ruolo: profile.roles[0] ?? null, citta: c.city, fonte: "il vostro sito", nome: profile.name };
  const [app] = await db
    .insert(schema.applications)
    .values({
      userId,
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
export async function approveApplication(db: DB, userId: number, appId: number, now = new Date(), rng: () => number = Math.random, mode: "manual" | "autopilot" = "manual"): Promise<ApproveResult> {
  const app = await own(db, userId, appId);
  if (!app || app.status !== "draft") return { ok: false, blockers: [{ code: "not-draft", message: "Questa candidatura non è più da inviare." }] };
  const check = await evaluate(db, app, mode, now);
  if (!check.ok) {
    await db.update(schema.applications).set({ warnings: [...check.warnings, ...check.blockers], updatedAt: now }).where(eq(schema.applications.id, appId));
    return { ok: false, blockers: check.blockers };
  }
  const g = await guardrailsFor(db, userId);
  const scheduled = (await sendHistory(db, userId, appId)).map((h) => h.at).filter((d) => d.getTime() > now.getTime() - 2 * 86400000);
  const sendAt = scheduleSend(now, g, scheduled, rng);
  if (!sendAt) return { ok: false, blockers: [{ code: "no-slot", message: "Nei prossimi giorni non ci sono posti liberi per inviare." }] };
  await db.update(schema.applications).set({ status: "queued", sendAt, mode, warnings: check.warnings, updatedAt: now }).where(eq(schema.applications.id, appId));
  return { ok: true, sendAt };
}

/** "Invia tutte (N)": approve exactly the drafts shown on the confirmation screen.
 *  Drafts with a scam warning are never part of a bulk send: they need their own "Invia". */
export async function approveAll(db: DB, userId: number, now = new Date(), rng: () => number = Math.random, ids?: number[]): Promise<{ queued: number; blocked: number }> {
  const drafts = (await bulkSendable(db, userId)).filter((d) => !ids || ids.includes(d.app.id));
  let queued = 0;
  let blocked = 0;
  for (const d of drafts) {
    const r = await approveApplication(db, userId, d.app.id, now, rng);
    if (r.ok) queued++;
    else blocked++;
  }
  return { queued, blocked };
}

/** Drafts that can go in "Invia tutte": no blocker and no scam warning. */
export async function bulkSendable(db: DB, userId: number) {
  return (await listDrafts(db, userId)).filter((d) => d.app.warnings.length === 0);
}

/** "Annulla" during the undo window: back to "Da inviare". */
export async function cancelApplication(db: DB, userId: number, appId: number, now = new Date()): Promise<boolean> {
  const app = await own(db, userId, appId);
  if (!app || app.status !== "queued" || (app.sendAt && app.sendAt <= now)) return false;
  await db.update(schema.applications).set({ status: "draft", sendAt: null, updatedAt: now }).where(eq(schema.applications.id, appId));
  await db.insert(schema.sendLog).values({
    userId,
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

export async function skipApplication(db: DB, userId: number, appId: number): Promise<void> {
  await db.update(schema.applications).set({ status: "skipped", updatedAt: new Date() }).where(and(mine(userId, appId), eq(schema.applications.status, "draft")));
}

export async function updateDraft(db: DB, userId: number, appId: number, patch: { subject?: string; body?: string; cvId?: number | null }): Promise<void> {
  if (patch.cvId != null && !(await cvList(db, userId)).some((c) => c.id === patch.cvId)) patch = { ...patch, cvId: undefined };
  await db.update(schema.applications).set({ ...patch, updatedAt: new Date() }).where(and(mine(userId, appId), eq(schema.applications.status, "draft")));
}

/**
 * Stop switch: stop and pull queued e-mails back to "Da inviare". A person's own stop (userId)
 * affects only them; the admin's stop (userId null, by "admin") affects everyone and only the
 * admin can lift it.
 */
export async function setKillSwitch(db: DB, userId: number | null, on: boolean, by: "user" | "admin" = "user"): Promise<number> {
  if (by === "admin") await updateGuardrails(db, { adminKillSwitch: on });
  else if (userId != null) await updateUserSettings(db, userId, { killSwitch: on });
  if (!on) return 0;
  const scope = by === "admin" || userId == null ? eq(schema.applications.status, "queued") : and(eq(schema.applications.status, "queued"), eq(schema.applications.userId, userId));
  const queued = await db.select({ id: schema.applications.id }).from(schema.applications).where(scope);
  if (queued.length) await db.update(schema.applications).set({ status: "draft", sendAt: null }).where(scope);
  return queued.length;
}

export async function listDrafts(db: DB, userId: number) {
  return db
    .select({ app: schema.applications, job: schema.jobs, level: schema.userJobs.level })
    .from(schema.applications)
    .leftJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .leftJoin(schema.userJobs, and(eq(schema.userJobs.jobId, schema.applications.jobId), eq(schema.userJobs.userId, userId)))
    .where(and(eq(schema.applications.userId, userId), eq(schema.applications.status, "draft")))
    .orderBy(sql`case ${schema.userJobs.level} when 'molto' then 0 when 'adatta' then 1 else 2 end`, asc(schema.applications.createdAt));
}

export async function listQueued(db: DB, userId: number) {
  return db
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), eq(schema.applications.status, "queued")))
    .orderBy(asc(schema.applications.sendAt));
}

export async function listMine(db: DB, userId: number) {
  return db
    .select({ app: schema.applications, job: schema.jobs })
    .from(schema.applications)
    .leftJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(and(eq(schema.applications.userId, userId), inArray(schema.applications.status, ["sending", "sent", "applied_site", "replied", "interview", "rejected", "offer", "failed"])))
    .orderBy(desc(sql`coalesce(${schema.applications.sentAt}, ${schema.applications.updatedAt}, ${schema.applications.createdAt})`));
}

export async function getApplication(db: DB, userId: number, appId: number) {
  return own(db, userId, appId);
}

// --- Queue runner ---------------------------------------------------------------------------------

export interface QueueSummary {
  sent: number;
  failed: number;
  held: number;
}

export type TransportFor = Transport | ((user: { id: number; mailboxKey: string | null; name: string }) => Transport);

/** Send every queued e-mail whose time has come, person by person. Re-checks every guardrail first. */
export async function processQueue(db: DB, transportFor: TransportFor, now = new Date(), rng: () => number = Math.random, opts: { allowSimulated?: boolean } = {}): Promise<QueueSummary> {
  const out: QueueSummary = { sent: 0, failed: 0, held: 0 };
  await recoverStaleSending(db, now);
  const users = await db
    .selectDistinct({ id: schema.users.id, mailboxKey: schema.users.mailboxKey, name: schema.users.name, active: schema.users.active })
    .from(schema.applications)
    .innerJoin(schema.users, eq(schema.users.id, schema.applications.userId))
    .where(eq(schema.applications.status, "queued"));
  for (const u of users) {
    if (!u.active) continue;
    const transport = typeof transportFor === "function" ? transportFor(u) : transportFor;
    const r = await processQueueFor(db, u.id, transport, now, rng, opts);
    out.sent += r.sent;
    out.failed += r.failed;
    out.held += r.held;
  }
  return out;
}

async function processQueueFor(db: DB, userId: number, transport: Transport, now: Date, rng: () => number, opts: { allowSimulated?: boolean }): Promise<QueueSummary> {
  const out: QueueSummary = { sent: 0, failed: 0, held: 0 };
  // The "first week at 3 per day" starts with this person's first REAL send, whatever happened in demo mode.
  if (transport.real && !(await guardrailsFor(db, userId)).goLiveAt) await updateUserSettings(db, userId, { goLiveAt: now });
  const g = await guardrailsFor(db, userId);
  if (isStopped(g)) return out;
  // Real mode with real sending switched off (or no mailbox): hold everything, never pretend to send.
  const allowSimulated = opts.allowSimulated ?? env.demoMode;
  if (!transport.real && !allowSimulated) return out;
  const due = await db
    .select()
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), eq(schema.applications.status, "queued"), lte(schema.applications.sendAt, now)))
    .orderBy(asc(schema.applications.sendAt));
  let sentThisRun = false;
  for (const app of due) {
    const history = () => sendHistory(db, userId, app.id).then((h) => h.map((x) => x.at).filter((d) => d.getTime() <= now.getTime() + 7 * 86400000));
    // Outside the window, over the cap, or one already sent in this run: move it to the next free,
    // properly spaced slot (never a burst at 08:30).
    const overCap = (await sentTodayCount(db, userId, now)) >= effectiveDailyCap(g, now);
    if (!inSendWindow(now, g) || overCap || sentThisRun) {
      const sendAt = scheduleSend(now, g, [...(await history()), ...(sentThisRun ? [now] : [])], rng, 0);
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
    // Atomic claim: only one runner can move it from "queued" to "sending" (no double sends).
    const claimed = await db
      .update(schema.applications)
      .set({ status: "sending", updatedAt: now })
      .where(and(eq(schema.applications.id, app.id), eq(schema.applications.status, "queued")))
      .returning({ id: schema.applications.id });
    if (claimed.length === 0) continue;
    const cv = app.cvId ? await db.query.cvs.findFirst({ where: and(eq(schema.cvs.id, app.cvId), eq(schema.cvs.userId, userId)) }) : null;
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
      if (app.jobId) await db.update(schema.userJobs).set({ status: "applied" }).where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, app.jobId)));
      await db.insert(schema.sendLog).values({
        userId,
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
      sentThisRun = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 160) : "errore";
      await db.update(schema.applications).set({ status: "failed", lastError: msg, updatedAt: now }).where(eq(schema.applications.id, app.id));
      await db.insert(schema.sendLog).values({ userId, applicationId: app.id, toEmail: app.toEmail!, company: app.company, role: app.role, status: "failed", detail: msg, at: now });
      await notifyAdmin(db, `Invio non riuscito a ${app.company ?? "un'azienda"}: ${msg}`, "/admin/registro");
      out.failed++;
    }
  }
  if (out.sent > 0) {
    await notifyUser(db, userId, out.sent === 1 ? "1 candidatura è partita." : `${out.sent} candidature sono partite.`, "/candidature");
  }
  return out;
}

// --- Autopilot ------------------------------------------------------------------------------------

/** Queue "Molto adatta" jobs with an application e-mail that pass every guardrail, for each person who turned it on. */
export async function runAutopilot(db: DB, now = new Date(), rng: () => number = Math.random): Promise<{ queued: number; held: number }> {
  const out = { queued: 0, held: 0 };
  const users = await db.select().from(schema.users).where(and(eq(schema.users.role, "user"), eq(schema.users.active, true)));
  for (const u of users) {
    const g = await guardrailsFor(db, u.id);
    if (!g.autopilot || isStopped(g)) continue;
    const profile = await getProfile(db, u.id);
    const candidates = await db
      .select({ jobId: schema.userJobs.jobId, presetMatch: schema.userJobs.presetMatch })
      .from(schema.userJobs)
      .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
      .where(and(eq(schema.userJobs.userId, u.id), eq(schema.userJobs.level, "molto"), inArray(schema.userJobs.status, ["new", "seen"]), sql`${schema.jobs.applicationEmail} is not null`))
      .orderBy(desc(schema.userJobs.score));
    for (const c of candidates) {
      // "Only my choices" also limits what autopilot may send.
      if (profile.focus === "preferite" && (profile.focusCompaniesOnly ? c.presetMatch !== "company" : !c.presetMatch)) continue;
      if (await existingFor(db, u.id, c.jobId)) continue;
      const app = await prepareEmailApplication(db, u.id, c.jobId, { mode: "autopilot" });
      if (!app) continue;
      const r = await approveApplication(db, u.id, app.id, now, rng, "autopilot");
      if (r.ok) out.queued++;
      else out.held++; // stays in "Da inviare" to look at
    }
  }
  return out;
}

// --- Lanes 2 and 3 ----------------------------------------------------------------------------------

/** Lane 3: they applied on the site themselves. */
export async function markAppliedOnSite(db: DB, userId: number, jobId: number, now = new Date()): Promise<boolean> {
  const data = await getJob(db, userId, jobId);
  if (!data) return false;
  const existing = await db.query.applications.findFirst({
    where: and(eq(schema.applications.userId, userId), eq(schema.applications.jobId, jobId), eq(schema.applications.lane, "site")),
  });
  if (!existing) {
    await db.insert(schema.applications).values({ userId, jobId, lane: "site", status: "applied_site", company: data.job.company, role: data.job.title, sentAt: now, updatedAt: now });
  }
  await db.update(schema.userJobs).set({ status: "applied" }).where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, jobId)));
  return true;
}

/** Lane 2: the text tailored in the Claude chat comes back. E-mail jobs go to "Da inviare". */
export async function saveCurated(db: DB, userId: number, jobId: number, input: { subject: string; body: string }): Promise<"queued-for-approval" | "use-site"> {
  const data = await getJob(db, userId, jobId);
  if (!data?.job.applicationEmail) return "use-site";
  const existing = await existingFor(db, userId, jobId);
  if (existing?.status === "draft") {
    await db.update(schema.applications).set({ subject: input.subject, body: input.body, lane: "curated", updatedAt: new Date() }).where(eq(schema.applications.id, existing.id));
  } else if (!existing) {
    await prepareEmailApplication(db, userId, jobId, { lane: "curated", subject: input.subject, body: input.body });
  }
  return "queued-for-approval";
}

/** A row stuck in "sending" (crash or timeout after the claim) becomes "failed" and the admin is told. */
export async function recoverStaleSending(db: DB, now = new Date(), staleMinutes = 10): Promise<number> {
  const stale = await db
    .update(schema.applications)
    .set({ status: "failed", lastError: "Invio interrotto (processo fermato a metà): controllare se è partita", updatedAt: now })
    .where(and(eq(schema.applications.status, "sending"), lte(schema.applications.updatedAt, new Date(now.getTime() - staleMinutes * 60000))))
    .returning({ id: schema.applications.id, company: schema.applications.company });
  for (const r of stale) await notifyAdmin(db, `Un invio a ${r.company ?? "un'azienda"} si è interrotto a metà: controlla nella casella se è partito.`, "/admin/registro");
  return stale.length;
}

/** E-mails one person actually sent (or is sending) today, Rome time. Replies keep counting: the send happened. */
export async function sentTodayCount(db: DB, userId: number, now = new Date()): Promise<number> {
  const rows = await db
    .select({ at: schema.applications.sentAt, status: schema.applications.status, updated: schema.applications.updatedAt })
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.userId, userId),
        inArray(schema.applications.status, ["sending", "sent", "replied", "interview", "rejected", "offer"]),
        inArray(schema.applications.lane, ["email", "curated"]),
      ),
    );
  return rows.filter((r) => (r.status === "sending" && r.updated && romeDateKey(r.updated) === romeDateKey(now)) || (r.at && romeDateKey(r.at) === romeDateKey(now))).length;
}

