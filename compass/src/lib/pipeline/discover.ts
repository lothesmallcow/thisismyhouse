// W1 discovery job: official search API, hard daily query cap enforced in code.
import { and, eq, sql } from "drizzle-orm";
import { romeDateKey } from "../core/time";
import type { DB } from "../db";
import { schema } from "../db";
import { buildQueries, hitToRawJob, isJobPage, type SearchProvider } from "../sources/web/w1";
import { dedupeCandidates, upsertRawJob } from "../server/jobs";
import { getProfile } from "../server/profile";
import { getSettings } from "../server/settings";
import { runWithHealth } from "./health";

export const W1_HARD_MAX = 100; // even if the admin types more, never above this

export async function usageToday(db: DB, counter: string, now = new Date()): Promise<number> {
  const row = await db.query.usageCounters.findFirst({
    where: and(eq(schema.usageCounters.counter, counter), eq(schema.usageCounters.day, romeDateKey(now))),
  });
  return row?.count ?? 0;
}

/** Count BEFORE calling the provider, so a crash can never cause extra unpaid-for queries. */
async function bump(db: DB, counter: string, now: Date): Promise<void> {
  await db
    .insert(schema.usageCounters)
    .values({ counter, day: romeDateKey(now), count: 1 })
    .onConflictDoUpdate({ target: [schema.usageCounters.counter, schema.usageCounters.day], set: { count: sql`${schema.usageCounters.count} + 1` } });
}

export async function runDiscover(db: DB, provider: SearchProvider | null, now = new Date()): Promise<{ queries: number; found: number; created: number; capReached: boolean }> {
  const settings = await getSettings(db);
  const out = { queries: 0, found: 0, created: 0, capReached: false };
  if (!settings.w1Enabled || !provider) return out;
  const cap = Math.min(settings.w1DailyCap, W1_HARD_MAX);
  const profile = await getProfile(db);
  if (!profile.roles.length) return out;
  const used = await usageToday(db, "w1-queries", now);
  const remaining = Math.max(0, cap - used);
  if (remaining === 0) return { ...out, capReached: true };

  await runWithHealth(db, "w1", async () => {
    const cache = await dedupeCandidates(db);
    for (const q of buildQueries([...profile.roles, ...profile.synonyms], profile.city || "Torino", remaining)) {
      if ((await usageToday(db, "w1-queries", now)) >= cap) {
        out.capReached = true;
        break;
      }
      await bump(db, "w1-queries", now);
      out.queries++;
      const hits = (await provider.search(q)).filter((h) => isJobPage(h.url));
      for (const h of hits) {
        out.found++;
        if ((await upsertRawJob(db, hitToRawJob(h), now, cache)).created) out.created++;
      }
    }
    return { items: out.found, failures: 0 };
  }, now);
  return out;
}
