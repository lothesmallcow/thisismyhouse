// W1 discovery job: official search API, hard daily query cap enforced in code.
import { and, eq, sql } from "drizzle-orm";
import { romeDateKey } from "../core/time";
import type { DB } from "../db";
import { schema } from "../db";
import { buildQueries, buildStudentQueries, hitToRawJob, isJobPage, spontaneousSuggestion, type SearchProvider, type SearchQuery } from "../sources/web/w1";
import { dedupeCandidates, rankContexts, upsertRawJob } from "../server/jobs";
import { rankPrefs } from "../server/catalog";
import { getSettings } from "../server/settings";
import { runWithHealth } from "./health";
import { searchPlan } from "./search-terms";
import { countryName } from "../core/geo";
import { prioritizedCompanies, todaysPicks } from "../server/career";

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

/** Every person's queries, interleaved so one shared daily cap is split fairly. */
async function plannedQueries(db: DB, max: number, now: Date): Promise<{ q: SearchQuery; userId: number }[]> {
  const per: { q: SearchQuery; userId: number }[][] = [];
  for (const ctx of await rankContexts(db)) {
    if (!ctx.profile.onboardedAt) continue;
    const plan = searchPlan(ctx.profile, await rankPrefs(db, ctx.userId));
    // Companies to look at today: best fits first, the rest in rotation (ADR 0018).
    const day = Math.floor(now.getTime() / 86_400_000);
    const picks = todaysPicks((await prioritizedCompanies(db, ctx.userId)).map((x) => x.company.name), 4, day);
    // One list per chosen place (home city, another city, a region, or the country), interleaved.
    const lists = plan.places.map((pl) => {
      const where = pl.where || countryName(pl.country);
      const terms = pl.country === plan.places[0].country ? [...ctx.profile.roles, ...ctx.profile.synonyms] : plan.searches.filter((s) => s.country === pl.country).map((s) => s.what);
      return ctx.profile.track === "stage"
        ? buildStudentQueries(plan.interests.length ? plan.interests : ["finance"], picks, where, max)
        : buildQueries(terms.length ? terms : ctx.profile.roles, where, max);
    });
    const qs: SearchQuery[] = [];
    for (let i = 0; qs.length < max && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && qs.length < max) qs.push(l[i]);
    per.push(qs.map((q) => ({ q, userId: ctx.userId })));
  }
  const out: { q: SearchQuery; userId: number }[] = [];
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
    for (const { q, userId } of queries) {
      if ((await usageToday(db, "w1-queries", now)) >= cap) {
        out.capReached = true;
        break;
      }
      await bump(db, "w1-queries", now);
      out.queries++;
      const all = await provider.search(q);
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
    }
    return { items: out.found, failures: 0 };
  }, now);
  if ((await usageToday(db, "w1-queries", now)) >= cap) out.capReached = true;
  return out;
}
