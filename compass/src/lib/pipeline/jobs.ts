// Scheduled jobs, shared by the CLI runner (GitHub Actions cron) and the protected
// /api/cron/<job> routes (host cron). Demo mode wires fixtures; real mode wires the network.
import type { DB } from "../db";
import { schema } from "../db";
import { env, mailboxConfig } from "../env";
import { getTransport, serviceTransport } from "../mail/transport";
import { demoFetch } from "../sources/demo-fetch";
import { DemoMailbox } from "../sources/mail/demo";
import { ImapMailbox } from "../sources/mail/imap";
import { TavilyProvider } from "../sources/web/w1";
import { processQueue, runAutopilot } from "../server/applications";
import { getSettings } from "../server/settings";
import { runDigest } from "./digest";
import { runDiscover } from "./discover";
import { runIngest, type MailboxRun } from "./ingest";
import { scanMailbox } from "./mailbox-scan";
import { runWithHealth } from "./health";
import { runQuickSearch, type QuickResult } from "./quick-search";
import { and, eq, gte, isNotNull } from "drizzle-orm";

/** The first search for one person (after the questionnaire, or "Cerca ora"). Never throws. */
export async function quickSearchFor(db: DB, userId: number, now = new Date()): Promise<QuickResult | null> {
  const demo = env.demoMode;
  const fetchImpl = demo ? demoFetch() : fetch;
  const key = demo ? "demo" : env.tavilyKey;
  const adzuna = demo ? { appId: "demo", appKey: "demo" } : env.adzuna;
  try {
    return await runQuickSearch(db, userId, { fetchImpl, web: key ? new TavilyProvider(fetchImpl, key) : null, adzuna: adzuna.appId && adzuna.appKey ? adzuna : null, now });
  } catch {
    return null; // the daily run will do it
  }
}

export const JOB_NAMES = ["ingest", "discover", "queue", "replies", "digest"] as const;
export type JobName = (typeof JOB_NAMES)[number];

/** One run per mailbox key in use by an active person (demo: the demo inbox rows with that key). */
export async function mailboxRuns(db: DB): Promise<MailboxRun[]> {
  const people = await db
    .select({ id: schema.users.id, key: schema.users.mailboxKey })
    .from(schema.users)
    .where(and(eq(schema.users.role, "user"), eq(schema.users.active, true), isNotNull(schema.users.mailboxKey)));
  const byKey = new Map<string, number[]>();
  for (const p of people) byKey.set(p.key!.toLowerCase(), [...(byKey.get(p.key!.toLowerCase()) ?? []), p.id]);
  const out: MailboxRun[] = [];
  for (const [key, owners] of byKey) {
    if (env.demoMode) out.push({ key, owners, mailbox: new DemoMailbox(db, key) });
    else {
      const box = mailboxConfig(key);
      if (box) out.push({ key, owners, mailbox: new ImapMailbox(box) });
    }
  }
  return out;
}

export async function runJob(db: DB, name: JobName, now = new Date()): Promise<unknown> {
  const [run] = await db.insert(schema.jobRuns).values({ job: name, startedAt: now }).returning();
  try {
    const result = await dispatch(db, name, now);
    await emailNewAdminAlerts(db, run.startedAt);
    await db.update(schema.jobRuns).set({ finishedAt: new Date(), ok: true, summary: JSON.stringify(result).slice(0, 500) }).where(eq(schema.jobRuns.id, run.id));
    return result;
  } catch (e) {
    await db.update(schema.jobRuns).set({ finishedAt: new Date(), ok: false, summary: (e instanceof Error ? e.message : String(e)).slice(0, 200) }).where(eq(schema.jobRuns.id, run.id));
    throw e;
  }
}

async function dispatch(db: DB, name: JobName, now: Date): Promise<unknown> {
  const demo = env.demoMode;
  const fetchImpl = demo ? demoFetch() : fetch;
  switch (name) {
    case "ingest": {
      const summary = await runIngest({ db, fetchImpl, mailboxes: await mailboxRuns(db), demo, now });
      const auto = await runAutopilot(db, now);
      return { ...summary, autopilot: auto };
    }
    case "discover": {
      const key = demo ? "demo" : env.tavilyKey;
      return runDiscover(db, key ? new TavilyProvider(fetchImpl, key) : null, now);
    }
    case "queue": {
      const settings = await getSettings(db);
      return processQueue(db, (u) => getTransport(db, settings.realSending, u, u.name), now);
    }
    case "replies": {
      const runs = await mailboxRuns(db);
      if (runs.length === 0) return { skipped: "no mailbox configured" };
      const out: Record<string, unknown> = {};
      for (const m of runs) {
        await runWithHealth(db, m.key === "default" ? "mailbox" : `mailbox:${m.key}`, async () => {
          const s = await scanMailbox(db, m.mailbox, m.owners, now);
          out[m.key] = s;
          return { items: s.alerts + s.replies, failures: 0 };
        }, now);
      }
      return out;
    }
    case "digest": {
      // The morning e-mail is part of the interface: in real mode it goes out as soon as a mailbox
      // is configured, independently of the switch for job applications.
      return runDigest(db, (u) => serviceTransport(db, u), now);
    }
  }
}

/** New admin notifications from this run are also e-mailed (one e-mail per run, demo: outbox). */
async function emailNewAdminAlerts(db: DB, since: Date): Promise<void> {
  const to = env.adminAlertEmail || (env.demoMode ? "admin@example.com" : "");
  if (!to) return;
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.audience, "admin"), gte(schema.notifications.createdAt, since)));
  if (rows.length === 0) return;
  const transport = serviceTransport(db, null);
  await transport.send({
    kind: "admin-alert",
    to,
    subject: `Compass: ${rows.length === 1 ? "un avviso" : `${rows.length} avvisi`} sulle fonti`,
    text: rows.map((r) => `- ${r.text}`).join("\n") + `\n\nDettagli: ${env.appUrl}/admin/fonti`,
  });
}
