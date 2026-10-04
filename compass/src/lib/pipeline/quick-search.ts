// The first search for one person, right after the questionnaire (and on "Cerca ora"), so nobody
// waits until the next morning. It uses what works without keys (company job boards, found on their
// own when needed) and the keyed sources when they are set; then the daily runs carry on.
import { eq } from "drizzle-orm";
import { homeCountries } from "../core/geo";
import type { CodeQuery } from "../core/search-code";
import type { DB } from "../db";
import { schema } from "../db";
import { fetchAdzuna } from "../sources/api/adzuna";
import { fetchAts, type AtsType } from "../sources/ats";
import { discoverAts } from "../sources/ats/discover";
import type { FetchLike } from "../sources/http";
import { hitToRawJob, isJobPage, type SearchProvider } from "../sources/web/w1";
import { prioritizedCompanies } from "../server/career";
import { directoryPool, getPrefs } from "../server/catalog";
import { scrapeCareers } from "../sources/web/careers";
import { PoliteFetcher } from "../sources/web/polite-fetch";
import { dedupeCandidates, rankContexts, rerankUser, upsertRawJob } from "../server/jobs";
import { getProfile } from "../server/profile";
import { getSettings } from "../server/settings";
import { bump, usageToday, W1_HARD_MAX } from "./discover";
import { freshQueries, markSearched, searchCodeFor } from "./search-terms";

/** At most one quick search per person in this many minutes ("Cerca ora" can be pressed often). */
export const QUICK_SEARCH_EVERY_MIN = 10;
/** Company websites read per click (in parallel; each site at its own polite pace). */
const SITES = 6;
/** Stop starting new page requests after this long, so a click answers within a minute. */
const BUDGET_MS = 45_000;
const COMPANIES = 12; // chosen companies looked at, best fits first
const FEEDS = 8; // job boards read
const RECHECK_DAYS = 30; // a company without a public board is looked for again after this
const WEB = 5; // web searches on the job sites (from the shared daily cap)
const API = 2; // job API calls

export interface QuickDeps {
  fetchImpl: FetchLike;
  /** Tests: no 5-second politeness wait. */
  politeSleep?: (ms: number) => Promise<void>;
  web: SearchProvider | null;
  adzuna: { appId: string; appKey: string } | null;
  now?: Date;
}

export interface QuickResult {
  skipped?: "recent";
  boardsFound: number;
  feeds: number;
  /** Company websites scraped, and the pages read. */
  sites: number;
  pages: number;
  web: number;
  api: number;
  found: number;
  created: number;
  /** When it ended (the start is the rate-limit stamp). */
  finishedAt?: string;
}

export async function lastQuickSearch(db: DB, userId: number): Promise<Date | null> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, `quick_search_${userId}`) });
  return typeof row?.value === "string" ? new Date(row.value) : null;
}

export async function runQuickSearch(db: DB, userId: number, deps: QuickDeps): Promise<QuickResult> {
  const now = deps.now ?? new Date();
  const out: QuickResult = { boardsFound: 0, feeds: 0, sites: 0, pages: 0, web: 0, api: 0, found: 0, created: 0 };
  const deadline = Date.now() + BUDGET_MS;
  const last = await lastQuickSearch(db, userId);
  if (last && now.getTime() - last.getTime() < QUICK_SEARCH_EVERY_MIN * 60_000) return { ...out, skipped: "recent" };
  const stamp = now.toISOString();
  await db.insert(schema.settings).values({ key: `quick_search_${userId}`, value: stamp }).onConflictDoUpdate({ target: schema.settings.key, set: { value: stamp } });

  const profile = await getProfile(db, userId);
  const countries = homeCountries(profile.countries, profile.city);
  const contexts = (await rankContexts(db)).filter((c) => c.userId === userId);
  const cache = await dedupeCandidates(db);
  const save = async (jobs: Parameters<typeof upsertRawJob>[1][]) => {
    for (const j of jobs) {
      out.found++;
      if ((await upsertRawJob(db, j, now, { cache, contexts })).created) out.created++;
    }
  };

  // 1. The chosen companies' own job boards: found once on their own, then read.
  const picks = (await prioritizedCompanies(db, userId)).slice(0, COMPANIES).map((p) => p.company);
  const stale = (d: Date | null) => !d || now.getTime() - d.getTime() > RECHECK_DAYS * 86_400_000;
  await Promise.all(
    picks
      .filter((c) => !c.ats && stale(c.atsCheckedAt ?? null))
      .map(async (c) => {
        const found = await discoverAts(deps.fetchImpl, c.name);
        await db.update(schema.catalogCompanies).set({ atsCheckedAt: now, ...(found ? { ats: found.ats, atsSlug: found.slug } : {}) }).where(eq(schema.catalogCompanies.id, c.id));
        if (found) {
          out.boardsFound++;
          Object.assign(c, { ats: found.ats, atsSlug: found.slug });
        }
      }),
  );
  for (const c of picks.filter((x) => x.ats && x.atsSlug).slice(0, FEEDS)) {
    try {
      await save(await fetchAts(deps.fetchImpl, c.ats as AtsType, c.atsSlug!, c.name, countries));
      out.feeds++;
    } catch {
      // One board down never stops the others; the daily run tries again.
    }
  }

  // 1b. Web scraping of the companies' own career pages: chosen companies first, then the listed
  // companies of the chosen sectors (in their countries), those not read recently first.
  const prefs = await getPrefs(db, userId);
  const likedSectors = [...prefs.sectors.entries()].filter(([, v]) => v === "like").map(([id]) => id);
  const pool = await directoryPool(db, likedSectors, { countries, regions: profile.regions, limit: 20 });
  const seenIds = new Set<number>();
  const recent = (d: Date | null | undefined) => d != null && now.getTime() - d.getTime() < RECHECK_DAYS * 86_400_000;
  const sites = [...picks, ...pool]
    .filter((c) => !seenIds.has(c.id) && seenIds.add(c.id))
    .filter((c) => !(c.ats && c.atsSlug)) // their job board was read above
    .filter((c) => c.careersUrl || (c.website && !recent(c.careersCheckedAt)))
    .sort((a, b) => (a.careersCheckedAt?.getTime() ?? 0) - (b.careersCheckedAt?.getTime() ?? 0))
    .slice(0, SITES);
  if (sites.length && Date.now() < deadline) {
    const polite = new PoliteFetcher(db, deps.fetchImpl, { sleep: deps.politeSleep });
    const results = await Promise.all(sites.map(async (c) => ({ c, r: await scrapeCareers(polite, c, now, deadline) })));
    for (const { c, r } of results) {
      out.pages += r.pages;
      if (r.pages > 0) out.sites++;
      await db.update(schema.catalogCompanies).set({ careersCheckedAt: now, careersUrl: r.careersUrl }).where(eq(schema.catalogCompanies.id, c.id));
      await save(r.jobs.map((j) => ({ ...j, company: j.company || c.name })));
    }
  }

  // 2. Web search on the job sites (its key set): this person's searches, within the shared daily cap.
  const code = await searchCodeFor(db, userId, now);
  const settings = await getSettings(db);
  if (deps.web && settings.w1Enabled) {
    const cap = Math.min(settings.w1DailyCap, W1_HARD_MAX);
    const planned = (await freshQueries(db, code.queries.filter((q) => q.channel === "web"), now)).slice(0, WEB);
    for (const q of planned) {
      if ((await usageToday(db, "w1-queries", now)) >= cap) break;
      await bump(db, "w1-queries", now);
      try {
        const what = profile.track === "lavoro" && q.sites?.length ? `"${q.what}"` : q.what;
        const hits = await deps.web.search({ q: `${what} ${q.where}`.trim(), ...(q.sites?.length ? { includeDomains: q.sites } : {}) });
        await markSearched(db, q.key, hits.length, now);
        await save(hits.filter((h) => isJobPage(h.url)).map(hitToRawJob));
        out.web++;
      } catch {
        // Try again in the daily run.
      }
    }
  }

  // 3. Job API (its key set).
  if (deps.adzuna && settings.adzunaEnabled) {
    const planned: CodeQuery[] = (await freshQueries(db, code.queries.filter((q) => q.channel === "api"), now)).slice(0, API);
    for (const q of planned) {
      try {
        const jobs = await fetchAdzuna(deps.fetchImpl, deps.adzuna, q);
        await markSearched(db, q.key, jobs.length, now);
        await save(jobs);
        out.api++;
      } catch {
        // Try again in the daily run.
      }
    }
  }

  await rerankUser(db, userId, now);
  const summary = JSON.stringify({ ...out, finishedAt: new Date().toISOString() });
  await db.insert(schema.settings).values({ key: `quick_search_result_${userId}`, value: summary }).onConflictDoUpdate({ target: schema.settings.key, set: { value: summary } });
  return out;
}

/** What the last search for this person found (shown on Offerte). */
export async function lastQuickResult(db: DB, userId: number): Promise<QuickResult | null> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, `quick_search_result_${userId}`) });
  try {
    return typeof row?.value === "string" ? (JSON.parse(row.value) as QuickResult) : null;
  } catch {
    return null;
  }
}
