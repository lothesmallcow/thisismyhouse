// A person's plan and the searches they started by hand (kept in settings: one small row each).
import { eq } from "drizzle-orm";
import { planOf, scanStatus, type Plan, type PlanKey, type ScanStatus } from "../core/plans";
import type { DB } from "../db";
import { schema } from "../db";

const get = async (db: DB, key: string) => (await db.query.settings.findFirst({ where: eq(schema.settings.key, key) }))?.value;
const put = (db: DB, key: string, value: unknown) => db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });

export async function getPlan(db: DB, userId: number): Promise<Plan & { since: Date | null; trial: boolean }> {
  const v = (await get(db, `plan_${userId}`)) as { plan?: string; since?: string; trial?: boolean } | undefined;
  return { ...planOf(v?.plan), since: v?.since ? new Date(v.since) : null, trial: Boolean(v?.trial) };
}

/** Payments are not live: a paid plan starts as a free trial. */
export async function setPlan(db: DB, userId: number, plan: PlanKey, now = new Date()): Promise<void> {
  await put(db, `plan_${userId}`, { plan, since: now.toISOString(), trial: plan !== "free" });
}

async function history(db: DB, userId: number): Promise<Date[]> {
  const v = await get(db, `scans_${userId}`);
  return Array.isArray(v) ? (v as string[]).map((s) => new Date(s)) : [];
}

export async function getScanStatus(db: DB, userId: number, now = new Date()): Promise<ScanStatus & { plan: Plan }> {
  const plan = await getPlan(db, userId);
  return { ...scanStatus(plan, await history(db, userId), now), plan };
}

/** Count a search started by hand (only the last day is kept). */
export async function recordScan(db: DB, userId: number, now = new Date()): Promise<void> {
  const kept = (await history(db, userId)).filter((d) => now.getTime() - d.getTime() < 86_400_000);
  await put(db, `scans_${userId}`, [...kept, now].map((d) => d.toISOString()));
}
