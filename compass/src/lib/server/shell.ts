// Data every screen of her app needs: what's new, and "always say what's happening".
import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import { formatWhen } from "../core/time";
import { getSettings } from "./settings";
import { realSendingActive } from "../mail/transport";

export async function shellData(db: DB, now = new Date()) {
  const settings = await getSettings(db);
  const [{ drafts }] = await db.select({ drafts: sql<number>`count(*)` }).from(schema.applications).where(eq(schema.applications.status, "draft"));
  const [{ replies }] = await db
    .select({ replies: sql<number>`count(*)` })
    .from(schema.replies)
    .where(and(eq(schema.replies.confirmed, false), eq(schema.replies.dismissed, false)));
  const notes = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.audience, "user"), eq(schema.notifications.read, false)))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(3);
  const last = settings.lastIngestAt ? new Date(settings.lastIngestAt) : null;
  return {
    demo: env.demoMode,
    realSending: !env.demoMode && settings.realSending,
    sendingPaused: !env.demoMode && !realSendingActive(settings.realSending),
    killSwitch: settings.guardrails.killSwitch,
    adminStop: settings.guardrails.adminKillSwitch,
    lastUpdate: last ? `Ultimo aggiornamento: ${formatWhen(last, now)}` : "Prima ricerca in corso: le offerte arrivano entro domani mattina.",
    notes: notes.map((n) => ({ id: n.id, text: n.text, href: n.href })),
    badges: { "/da-inviare": Number(drafts), "/candidature": Number(replies) },
  };
}
