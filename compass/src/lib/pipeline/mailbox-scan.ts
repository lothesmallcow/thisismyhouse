// One pass over the dedicated mailbox: replies to our applications first, then job alerts.
// Processed Message-IDs are stored so nothing is parsed twice.
import { eq } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { parseAlert, isJobAlert } from "../sources/alerts";
import { looksLikeAlert } from "../sources/alerts/generic";
import type { Mailbox } from "../sources/mail/types";
import { upsertRawJob, dedupeCandidates } from "../server/jobs";
import { matchReply, recordReply } from "../server/replies";
import { runWithHealth } from "./health";

export interface MailboxSummary {
  alerts: number;
  jobsNew: number;
  jobsMerged: number;
  replies: number;
}

export async function scanMailbox(db: DB, mailbox: Mailbox, now = new Date(), lookbackDays = 4): Promise<MailboxSummary> {
  const summary: MailboxSummary = { alerts: 0, jobsNew: 0, jobsMerged: 0, replies: 0 };
  const emails = await mailbox.fetchSince(new Date(now.getTime() - lookbackDays * 86400000));
  const cache = await dedupeCandidates(db);
  const perParser = new Map<string, { items: number; failures: number; broken: boolean }>();

  for (const e of emails.sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const done = await db.query.processedMessages.findFirst({ where: eq(schema.processedMessages.messageId, e.messageId) });
    if (done) continue;

    const reply = await matchReply(db, e);
    // A thread match is always a reply. A sender-domain match is only trusted when the e-mail
    // does not look like a job newsletter (an agency she wrote to may also send alerts).
    if (reply && !isJobAlertStrict(e) && (reply.matchedBy === "thread" || !looksLikeAlert(e))) {
      if (await recordReply(db, e, reply)) summary.replies++;
      await db.insert(schema.processedMessages).values({ messageId: e.messageId, kind: "reply", parser: reply.matchedBy, processedAt: now });
      continue;
    }
    if (!isJobAlert(e)) {
      // Not yet a reply we can match, not an alert: leave it for a later pass (an application
      // may be sent later), but don't keep re-reading very old mail.
      if (now.getTime() - e.date.getTime() > 3 * 86400000) {
        await db.insert(schema.processedMessages).values({ messageId: e.messageId, kind: "other", parser: null, processedAt: now });
      }
      continue;
    }
    const r = parseAlert(e);
    summary.alerts++;
    const stat = perParser.get(r.parser) ?? { items: 0, failures: 0, broken: false };
    stat.items += r.jobs.length;
    stat.failures += r.failures;
    stat.broken ||= r.templateBroken;
    perParser.set(r.parser, stat);
    for (const raw of r.jobs) {
      const res = await upsertRawJob(db, raw, now, cache);
      if (res.created) summary.jobsNew++;
      else summary.jobsMerged++;
    }
    await db.insert(schema.processedMessages).values({ messageId: e.messageId, kind: "alert", parser: r.parser, processedAt: now });
  }

  for (const [parser, s] of perParser) {
    await runWithHealth(db, parser, async () => ({ items: s.items, failures: s.failures, templateBroken: s.broken }), now);
  }
  return summary;
}

/** Alerts come from platforms; a matched reply that is clearly an alert stays an alert. */
function isJobAlertStrict(e: Parameters<typeof isJobAlert>[0]): boolean {
  return /linkedin\.com|indeed\.|infojobs\./.test(e.from.address);
}
