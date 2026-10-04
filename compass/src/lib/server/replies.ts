// Reply detection on the dedicated mailbox: thread/Message-ID first, sender domain as fallback.
import { and, eq, inArray } from "drizzle-orm";
import { emailDomain } from "../core/extract";
import { FREE_MAIL_DOMAINS } from "../core/scam-rules";
import { fold } from "../core/text";
import type { DB } from "../db";
import { schema } from "../db";
import type { InboundEmail } from "../sources/mail/types";
import type { ApplicationStatus } from "../db/schema";
import { notifyUser } from "../pipeline/notify";

export interface ReplyMatch {
  applicationId: number;
  matchedBy: "thread" | "domain";
}

const SENT = ["sent", "replied", "interview", "rejected", "offer"] as const;

export async function matchReply(db: DB, e: InboundEmail): Promise<ReplyMatch | null> {
  const sent = await db
    .select({ id: schema.applications.id, messageId: schema.applications.messageId, toEmail: schema.applications.toEmail, sentAt: schema.applications.sentAt })
    .from(schema.applications)
    .where(inArray(schema.applications.status, [...SENT]));
  const ids = new Set([e.inReplyTo, ...e.references].filter(Boolean) as string[]);
  const byThread = sent.find((a) => a.messageId && ids.has(a.messageId));
  if (byThread) return { applicationId: byThread.id, matchedBy: "thread" };

  // Fallback: same sender domain as an address we wrote to (not for free-mail domains).
  const domain = emailDomain(e.from.address);
  if (!domain || FREE_MAIL_DOMAINS.has(domain)) {
    const exact = sent.find((a) => a.toEmail?.toLowerCase() === e.from.address);
    return exact ? { applicationId: exact.id, matchedBy: "domain" } : null;
  }
  const byDomain = sent
    .filter((a) => a.toEmail && emailDomain(a.toEmail) === domain && a.sentAt && a.sentAt <= e.date)
    .sort((a, b) => b.sentAt!.getTime() - a.sentAt!.getTime())[0];
  return byDomain ? { applicationId: byDomain.id, matchedBy: "domain" } : null;
}

/** Suggest a status from the reply text. She confirms with one tap. */
export function suggestStatus(text: string): ApplicationStatus {
  const t = fold(text);
  if (/colloquio|incontro|intervista|appuntamento|conoscerla|conoscerti|videochiamata|call conoscitiva|interview/.test(t)) return "interview";
  if (/purtroppo|non (?:e|sara) possibile|altri candidati|altro profilo|non rientra|non proseguire|non procedere|esito negativo|unfortunately/.test(t)) return "rejected";
  if (/proposta di assunzione|offerta di lavoro|lettera di assunzione|siamo lieti di offrir|job offer/.test(t)) return "offer";
  return "replied";
}

export async function recordReply(db: DB, e: InboundEmail, m: ReplyMatch): Promise<boolean> {
  const exists = await db.query.processedMessages.findFirst({ where: eq(schema.processedMessages.messageId, e.messageId) });
  if (exists) return false;
  const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, m.applicationId) });
  if (!app) return false;
  const suggested = suggestStatus(`${e.subject}\n${e.text}`);
  await db.insert(schema.replies).values({
    applicationId: app.id,
    fromEmail: e.from.address,
    fromName: e.from.name || null,
    subject: e.subject,
    snippet: e.text.replace(/\s+/g, " ").slice(0, 400),
    matchedBy: m.matchedBy,
    suggestedStatus: suggested,
    receivedAt: e.date,
  });
  await db.update(schema.applications).set({ replyAt: app.replyAt ?? e.date, status: app.status === "sent" ? "replied" : app.status }).where(eq(schema.applications.id, app.id));
  await notifyUser(db, `Hai ricevuto una risposta da ${app.company ?? e.from.name ?? "un'azienda"}!`, "/candidature");
  return true;
}

/** One tap: accept the suggested status (or pick another). */
export async function confirmReply(db: DB, replyId: number, status?: ApplicationStatus): Promise<void> {
  const r = await db.query.replies.findFirst({ where: eq(schema.replies.id, replyId) });
  if (!r?.applicationId) return;
  await db.update(schema.applications).set({ status: status ?? r.suggestedStatus ?? "replied", updatedAt: new Date() }).where(eq(schema.applications.id, r.applicationId));
  await db.update(schema.replies).set({ confirmed: true }).where(eq(schema.replies.id, replyId));
}

export async function dismissReply(db: DB, replyId: number): Promise<void> {
  await db.update(schema.replies).set({ dismissed: true }).where(eq(schema.replies.id, replyId));
}

export async function pendingReplies(db: DB) {
  return db
    .select({ reply: schema.replies, app: schema.applications })
    .from(schema.replies)
    .innerJoin(schema.applications, eq(schema.applications.id, schema.replies.applicationId))
    .where(and(eq(schema.replies.confirmed, false), eq(schema.replies.dismissed, false)));
}
