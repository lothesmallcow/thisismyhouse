// W1 discovery job: official search API, hard daily query cap enforced in code.
import { queryWords } from "../core/search-code";
import { learnFeeds } from "../server/feeds";
import { and, eq, sql } from "drizzle-orm";
import { romeDateKey } from "../core/time";
import type { DB } from "../db";
import { schema } from "../db";
import { hitToRawJob, isJobPage, spontaneousSuggestion, type SearchProvider, type SearchQuery } from "../sources/web/w1";
import { dedupeCandidates, rankContexts, upsertRawJob } from "../server/jobs";
import { getSettings } from "../server/settings";
import { runWithHealth } from "./health";
import { freshQueries, markSearched, searchCodeFor } from "./search-terms";
import { countryName } from "../core/geo";

export const W1_HARD_MAX = 100; // even if the admin types more, never above this

export async function usageToday(db: DB, counter: string, now = new Date()): Promise<number> {
  const row = await db.query.usageCounters.findFirst({
    where: and(eq(schema.usageCounters.counter, counter), eq(schema.usageCounters.day, romeDateKey(now))),
  });
  return row?.count ?? 0;
}

/** Count BEFORE calling the provider, so a crash can never cause extra unpaid-for queries. */
export async function bump(db: DB, counter: string, now: Date): Promise<void> {
  await db
    .insert(schema.usageCounters)
    .values({ counter, day: romeDateKey(now), count: 1 })
    .onConflictDoUpdate({ target: [schema.usageCounters.counter, schema.usageCounters.day], set: { count: sql`${schema.usageCounters.count} + 1` } });
}

/**
 * Every person's web searches from their search code (ADR 0021), interleaved so one shared daily
 * cap is split fairly; the same search for two people is made once, and not again within a day.
 */
async function plannedQueries(db: DB, max: number, now: Date): Promise<{ q: SearchQuery; userId: number; key: string }[]> {
  const per: { q: SearchQuery; userId: number; key: string }[][] = [];
  const seen = new Set<string>();
  for (const ctx of await rankContexts(db)) {
    if (!ctx.profile.onboardedAt) continue;
    const web = (await searchCodeFor(db, ctx.userId, now)).queries.filter((x) => x.channel === "web" && !seen.has(x.key));
    web.forEach((x) => seen.add(x.key));
    const fresh = await freshQueries(db, web, now);
    const quote = ctx.profile.track === "lavoro";
    per.push(
      fresh.map((x) => {
        const where = x.where || countryName(x.country);
        // A role and its place, plus the company or sector when there is one: "Sales manager" Gucci Milano.
        const where2 = x.kind === "azienda" && !x.where ? "" : where;
        return { q: { q: `${queryWords(x, quote && Boolean(x.sites?.length))} ${where2}`.trim(), ...(x.sites?.length ? { includeDomains: x.sites } : {}) }, userId: ctx.userId, key: x.key };
      }),
    );
  }
  const out: { q: SearchQuery; userId: number; key: string }[] = [];
  for (let i = 0; out.length < max && per.some((l) => l[i]); i++) for (const l of per) if (l[i] && out.length < max) out.push(l[i]);
  return out;
}

export async function runDiscover(db: DB, provider: SearchProvider | null, now = new Date()): Promise<{ queries: number; found: number; created: number; suggested: number; capReached: boolean }> {
  const settings = await getSettings(db);
  const out = { queries: 0, found: 0, created: 0, suggested: 0, capReached: false };
  if (!settings.w1Enabled || !provider) return out;
  const cap = Math.min(settings.w1DailyCap, W1_HARD_MAX);
  const used = await usageToday(db, "w1-queries", now);
  const remaining = Math.max(0, cap - used);
  if (remaining === 0) return { ...out, capReached: true };
  const queries = await plannedQueries(db, remaining, now);
  if (queries.length === 0) return out;

  await runWithHealth(db, "w1", async () => {
    const cache = await dedupeCandidates(db);
    const contexts = await rankContexts(db);
    for (const { q, userId, key } of queries) {
      if ((await usageToday(db, "w1-queries", now)) >= cap) {
        out.capReached = true;
        break;
      }
      await bump(db, "w1-queries", now);
      out.queries++;
      const all = await provider.search(q);
      await markSearched(db, key, all.length, now);
      for (const h of all) {
        const sug = spontaneousSuggestion(h);
        if (!sug) continue;
        const known = await db.query.spontaneousCompanies.findFirst({ where: and(eq(schema.spontaneousCompanies.email, sug.email), eq(schema.spontaneousCompanies.userId, userId)) });
        if (!known) {
          await db.insert(schema.spontaneousCompanies).values({ ...sug, userId, status: "suggested" });
          out.suggested++;
        }
      }
      const hits = all.filter((h) => isJobPage(h.url));
      for (const h of hits) {
        out.found++;
        if ((await upsertRawJob(db, hitToRawJob(h), now, { cache, contexts })).created) out.created++;
      }
      // Results on an employer's board reveal the whole board: it joins the registry, read every run.
      await learnFeeds(db, hits.map(hitToRawJob)).catch(() => 0);
    }
    return { items: out.found, failures: 0 };
  }, now);
  if ((await usageToday(db, "w1-queries", now)) >= cap) out.capReached = true;
  return out;
}
