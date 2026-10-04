// Accounts: creation (by the admin, or "Crea un account" with an invitation or open sign-up),
// invitation codes, deactivation. Each new person gets a profile and starter letter templates.
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { isValidEmail } from "../core/extract";
import { romeDateKey } from "../core/time";
import { templatesFor } from "../core/templates";
import type { DB } from "../db";
import { schema } from "../db";
import type { Track } from "../db/schema";
import { rerankUser } from "./jobs";
import { hashPassword, tokenId } from "./passwords";
import { getSettings } from "./settings";

export const MIN_PASSWORD = 10;
/** Open sign-up is capped per day so a public page cannot be used to flood the database. */
export const OPEN_SIGNUPS_PER_DAY = 20;
export const INVITE_DAYS = 14;

export type CreateResult = { ok: true; userId: number } | { ok: false; error: "email" | "password" | "exists" | "invite" | "closed" | "limit" };

export async function createAccount(
  db: DB,
  input: { email: string; password: string; name: string; track: Track; role?: "user" | "admin"; mailboxKey?: string | null },
): Promise<CreateResult> {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, error: "email" };
  if (input.password.length < MIN_PASSWORD) return { ok: false, error: "password" };
  if (await db.query.users.findFirst({ where: eq(schema.users.email, email) })) return { ok: false, error: "exists" };
  const [u] = await db
    .insert(schema.users)
    .values({ role: input.role ?? "user", email, name: input.name.trim().slice(0, 80), passwordHash: await hashPassword(input.password), mailboxKey: input.mailboxKey ?? null })
    .returning({ id: schema.users.id });
  if ((input.role ?? "user") === "user") await setUpPerson(db, u.id, input.name, input.track);
  return { ok: true, userId: u.id };
}

/** Profile + starter templates + their view of the jobs already known. */
export async function setUpPerson(db: DB, userId: number, name: string, track: Track): Promise<void> {
  await db.insert(schema.profile).values({ userId, track, name: name.trim().slice(0, 80) }).onConflictDoNothing();
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.templates).where(eq(schema.templates.userId, userId));
  if (Number(n) === 0) {
    await db.insert(schema.templates).values(templatesFor(track).map((t, i) => ({ ...t, userId, isDefault: i === 0 || t.kind === "spontaneous" })));
  }
  await rerankUser(db, userId);
}

/** A new invitation. The code is shown once; only its hash is stored. */
export async function createInvite(db: DB, note = "", now = new Date()): Promise<string> {
  const code = randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toUpperCase();
  await db.insert(schema.invites).values({ codeHash: tokenId(`invite:${code}`), note: note.slice(0, 80), expiresAt: new Date(now.getTime() + INVITE_DAYS * 86400000) });
  return code;
}

async function validInvite(db: DB, code: string, now: Date) {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  return db.query.invites.findFirst({
    where: and(eq(schema.invites.codeHash, tokenId(`invite:${clean}`)), eq(schema.invites.revoked, false), isNull(schema.invites.usedAt), gt(schema.invites.expiresAt, now)),
  });
}

/** "Crea un account" from the public page, following the admin's registration setting. */
export async function register(
  db: DB,
  input: { email: string; password: string; name: string; track: Track; invite?: string },
  now = new Date(),
): Promise<CreateResult> {
  const mode = (await getSettings(db)).registration;
  if (mode === "closed") return { ok: false, error: "closed" };
  let inviteId: number | null = null;
  if (mode === "invite") {
    const inv = await validInvite(db, input.invite ?? "", now);
    if (!inv) return { ok: false, error: "invite" };
    inviteId = inv.id;
  } else {
    const day = romeDateKey(now);
    const row = await db.query.usageCounters.findFirst({ where: and(eq(schema.usageCounters.counter, "signups"), eq(schema.usageCounters.day, day)) });
    if ((row?.count ?? 0) >= OPEN_SIGNUPS_PER_DAY) return { ok: false, error: "limit" };
  }
  const r = await createAccount(db, { ...input, role: "user" });
  if (!r.ok) return r;
  if (inviteId != null) {
    // Claim the code atomically: a code works once even if two people submit at the same moment.
    const claimed = await db
      .update(schema.invites)
      .set({ usedAt: now, usedByUserId: r.userId })
      .where(and(eq(schema.invites.id, inviteId), isNull(schema.invites.usedAt)))
      .returning({ id: schema.invites.id });
    if (claimed.length === 0) {
      await db.delete(schema.profile).where(eq(schema.profile.userId, r.userId));
      await db.delete(schema.templates).where(eq(schema.templates.userId, r.userId));
      await db.delete(schema.userJobs).where(eq(schema.userJobs.userId, r.userId));
      await db.delete(schema.users).where(eq(schema.users.id, r.userId));
      return { ok: false, error: "invite" };
    }
  } else {
    await db
      .insert(schema.usageCounters)
      .values({ counter: "signups", day: romeDateKey(now), count: 1 })
      .onConflictDoUpdate({ target: [schema.usageCounters.counter, schema.usageCounters.day], set: { count: sql`${schema.usageCounters.count} + 1` } });
  }
  return r;
}

export async function setActive(db: DB, userId: number, active: boolean): Promise<void> {
  await db.update(schema.users).set({ active }).where(and(eq(schema.users.id, userId), eq(schema.users.role, "user")));
  if (!active) await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export async function listPeople(db: DB) {
  return db
    .select({ user: schema.users, track: schema.profile.track, onboardedAt: schema.profile.onboardedAt, profileName: schema.profile.name })
    .from(schema.users)
    .leftJoin(schema.profile, eq(schema.profile.userId, schema.users.id))
    .where(eq(schema.users.role, "user"))
    .orderBy(schema.users.id);
}
