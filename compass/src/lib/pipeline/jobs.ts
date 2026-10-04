// Scheduled jobs, shared by the CLI runner (GitHub Actions cron) and the protected
// /api/cron/<job> routes (host cron). Demo mode wires fixtures; real mode wires the network.
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import { getTransport } from "../mail/transport";
import { demoFetch } from "../sources/demo-fetch";
import { DemoMailbox } from "../sources/mail/demo";
import { ImapMailbox } from "../sources/mail/imap";
import type { Mailbox } from "../sources/mail/types";
import { TavilyProvider } from "../sources/web/w1";
import { processQueue, runAutopilot } from "../server/applications";
import { getProfile } from "../server/profile";
import { getSettings } from "../server/settings";
import { runDigest } from "./digest";
import { runDiscover } from "./discover";
import { runIngest } from "./ingest";
import { scanMailbox } from "./mailbox-scan";
import { runWithHealth } from "./health";
import { eq } from "drizzle-orm";

export const JOB_NAMES = ["ingest", "discover", "queue", "replies", "digest"] as const;
export type JobName = (typeof JOB_NAMES)[number];

function mailboxFor(db: DB): Mailbox | null {
  if (env.demoMode) return new DemoMailbox(db);
  return env.mailbox.configured ? new ImapMailbox() : null;
}

export async function runJob(db: DB, name: JobName, now = new Date()): Promise<unknown> {
  const [run] = await db.insert(schema.jobRuns).values({ job: name, startedAt: now }).returning();
  try {
    const result = await dispatch(db, name, now);
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
      const summary = await runIngest({ db, fetchImpl, mailbox: mailboxFor(db), demo, now });
      const auto = await runAutopilot(db, now);
      return { ...summary, autopilot: auto };
    }
    case "discover": {
      const key = demo ? "demo" : env.tavilyKey;
      return runDiscover(db, key ? new TavilyProvider(fetchImpl, key) : null, now);
    }
    case "queue": {
      const settings = await getSettings(db);
      const profile = await getProfile(db);
      return processQueue(db, getTransport(db, settings.realSending, profile.name), now);
    }
    case "replies": {
      const mb = mailboxFor(db);
      if (!mb) return { skipped: "mailbox not configured" };
      let out: unknown = null;
      await runWithHealth(db, "mailbox", async () => {
        const s = await scanMailbox(db, mb, now);
        out = s;
        return { items: s.alerts + s.replies, failures: 0 };
      }, now);
      return out;
    }
    case "digest": {
      const settings = await getSettings(db);
      const profile = await getProfile(db);
      return runDigest(db, getTransport(db, settings.realSending, profile.name), now);
    }
  }
}
