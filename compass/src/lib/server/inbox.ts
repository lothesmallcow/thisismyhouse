// Each person's personal Compass address and what arrived to it: the platforms whose alerts reach
// Compass, and Gmail's forwarding confirmation code (shown to them to finish the setup).
import { and, eq, like, sql } from "drizzle-orm";
import { newAlertTag, personalAddress, type ForwardingConfirmation } from "../core/inbox-address";
import type { DB } from "../db";
import { schema } from "../db";
import { env, mailboxConfig } from "../env";

/** The mailbox personal addresses are built on: the main Compass mailbox (demo: a fake one). */
export function baseMailbox(): string | null {
  if (env.demoMode) return "compass.demo@example.com";
  return mailboxConfig("default")?.user ?? null;
}

/** Their personal address, created the first time it is asked for. Null when no mailbox is set up. */
export async function personalInbox(db: DB, userId: number): Promise<string | null> {
  const base = baseMailbox();
  if (!base) return null;
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!u) return null;
  // Someone who signs in with the very mailbox Compass reads: their alerts are already there.
  if (!env.demoMode && u.email.toLowerCase() === base.toLowerCase() && !u.mailboxKey) await db.update(schema.users).set({ mailboxKey: "default" }).where(eq(schema.users.id, userId));
  let tag = u.alertTag;
  for (let i = 0; !tag && i < 5; i++) {
    const t = newAlertTag();
    try {
      await db.update(schema.users).set({ alertTag: t }).where(eq(schema.users.id, userId));
      tag = t;
    } catch {
      // the rare clash with someone else's tag: try another
    }
  }
  return tag ? personalAddress(base, tag) : null;
}

const fwdKey = (userId: number) => `forwarding_${userId}`;

export async function saveForwardingConfirmation(db: DB, userId: number, c: ForwardingConfirmation, at: Date): Promise<void> {
  const v = JSON.stringify({ ...c, at: at.toISOString() });
  await db.insert(schema.settings).values({ key: fwdKey(userId), value: v }).onConflictDoUpdate({ target: schema.settings.key, set: { value: v } });
}

export async function forwardingConfirmationFor(db: DB, userId: number): Promise<(ForwardingConfirmation & { at: string }) | null> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, fwdKey(userId)) });
  try {
    return typeof row?.value === "string" ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

/** When each platform's alerts last reached this person ("email:linkedin" → date). */
export async function alertsReceived(db: DB, userId: number): Promise<Map<string, Date>> {
  const s = schema.jobSources;
  const rows = await db
    .select({ source: s.source, last: sql<number>`max(${s.seenAt})` })
    .from(s)
    .where(and(eq(s.userId, userId), like(s.source, "email:%")))
    .groupBy(s.source);
  return new Map(rows.map((r) => [r.source, new Date(Number(r.last))]));
}

export interface CollegaState {
  email?: "gmail" | "outlook" | "altro";
  emailDone?: boolean;
  accountsDone?: boolean;
}

/** Where someone is in Collega le fonti (their e-mail provider, the steps they finished). */
export async function collegaState(db: DB, userId: number): Promise<CollegaState> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, `collega_${userId}`) });
  try {
    return typeof row?.value === "string" ? (JSON.parse(row.value) as CollegaState) : {};
  } catch {
    return {};
  }
}

export async function saveCollegaState(db: DB, userId: number, s: CollegaState): Promise<void> {
  const v = JSON.stringify(s);
  await db.insert(schema.settings).values({ key: `collega_${userId}`, value: v }).onConflictDoUpdate({ target: schema.settings.key, set: { value: v } });
}

/** The alerts a person marked as created ("Fatto" on Collega le fonti). */
export async function alertsDone(db: DB, userId: number): Promise<Set<string>> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, `alerts_done_${userId}`) });
  try {
    return new Set(typeof row?.value === "string" ? (JSON.parse(row.value) as string[]) : []);
  } catch {
    return new Set();
  }
}
