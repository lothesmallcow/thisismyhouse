// Data every screen of the app needs for the signed-in person: counts, notes, status.
import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import { formatWhen } from "../core/time";
import { getSettings, getUserSettings } from "./settings";
import { realSendingActive } from "../mail/transport";

export async function shellData(db: DB, userId: number, now = new Date()) {
  const settings = await getSettings(db);
  const us = await getUserSettings(db, userId);
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  const [{ drafts }] = await db
    .select({ drafts: sql<number>`count(*)` })
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), eq(schema.applications.status, "draft")));
  const [{ replies }] = await db
    .select({ replies: sql<number>`count(*)` })
    .from(schema.replies)
    .where(and(eq(schema.replies.userId, userId), eq(schema.replies.confirmed, false), eq(schema.replies.dismissed, false)));
  const notes = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.audience, "user"), eq(schema.notifications.userId, userId), eq(schema.notifications.read, false)))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(3);
  const last = settings.lastIngestAt ? new Date(settings.lastIngestAt) : null;
  return {
    demo: env.demoMode,
    realSending: !env.demoMode && settings.realSending,
    sendingPaused: !env.demoMode && !realSendingActive(settings.realSending, user?.mailboxKey ?? null),
    hasMailbox: env.demoMode || Boolean(user?.mailboxKey),
    killSwitch: us.killSwitch,
    adminStop: settings.guardrails.adminKillSwitch,
    lastUpdate: last ? `Aggiornato ${formatWhen(last, now)}` : "Prima ricerca in corso",
    notes: notes.map((n) => ({ id: n.id, text: n.text, href: n.href })),
    badges: { "/da-inviare": Number(drafts), "/candidature": Number(replies) },
  };
}
