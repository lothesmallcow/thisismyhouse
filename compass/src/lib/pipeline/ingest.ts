// Scheduled ingestion: each mailbox (alerts + replies), job APIs (one plan per person), ATS feeds
// (admin watchlist + chosen catalog companies with a known feed), W2 approved sites.
// Each source runs inside runWithHealth(), so one broken source never stops the others.
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { geocode, GEOCODE_MAX_PER_RUN } from "../sources/geocode";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import { fetchAdzuna } from "../sources/api/adzuna";
import { fetchJooble } from "../sources/api/jooble";
import { atsEndpoint, fetchAts, keepInCountries, type AtsType } from "../sources/ats";
import { BlockedError, type FetchLike } from "../sources/http";
import type { Mailbox } from "../sources/mail/types";
import { extractJobsFromHtml, jobLinks } from "../sources/web/jsonld";
import { PoliteFetcher } from "../sources/web/polite-fetch";
import { scrapeCareers } from "../sources/web/careers";
import { dedupeCandidates, mergeDuplicateJobs, purgeOldJobs, rankContexts, rankJobForAll, upsertRawJob, type RankContext } from "../server/jobs";
import { closeMissing, discoveredFeeds, learnFeeds } from "../server/feeds";
import { roleTerms, titleMatches } from "../core/relevance";
import { isProgrammeTitle } from "./programmes";
import { lookUpMissingCompanies } from "../server/company-guess";
import { pageCompanyClues } from "../core/page-company";

import { todaysPicks } from "../server/career";
import { searchTargets } from "./targets";
import { getSettings, setSetting } from "../server/settings";
import { freshQueries, markSearched, searchCodeFor, searchKeywords } from "./search-terms";
import { queryWords, type CodeQuery } from "../core/search-code";
import { homeCountries } from "../core/geo";
import type { RawJob } from "../core/normalize";
import { isPaused, runWithHealth } from "./health";
import { scanMailbox, type MailboxSummary } from "./mailbox-scan";
import { refreshTrackerLeads, verifyLeads } from "./programmes";
import { W1_HARD_MAX } from "./discover";
import type { SearchProvider } from "../sources/web/w1";

export interface MailboxRun {
  key: string;
  mailbox: Mailbox;
  /** The people who use this mailbox: its alerts are private to them, its replies match their applications. */
  owners: number[];
  /** Called after each read (with the error when it failed): a connected Gmail records it. */
  done?: (error: unknown) => Promise<void>;
}

/** Job API calls per run, whatever the number of people (free quotas are small). */
/** Company career feeds read per run (the admin's watchlist always; chosen companies by fit, in rotation). */
export const ATS_PER_RUN = 40;
export const API_CALLS_PER_RUN = 9;
/** Company career pages scraped per daily run. */
export const CAREER_SITES_PER_RUN = 15;
/** Employer boards found on their own (from links and searches), read per run in rotation. */
export const DISCOVERED_PER_RUN = 25;


/** Firms whose official pages are read per daily run (each one at most weekly). */
const PROGRAMME_LEADS_PER_RUN = 12;

/** Pages visited per run to find the company of offers that do not name it. */
const COMPANY_LOOKUPS_PER_RUN = 25;

export interface IngestDeps {
  db: DB;
  fetchImpl: FetchLike;
  mailboxes: MailboxRun[];
  demo: boolean;
  now?: Date;
  /** For tests: skip the 5-second politeness wait. */
  politeSleep?: (ms: number) => Promise<void>;
  /** Web search (its key set): finds the official pages of programmes. */
  web?: SearchProvider | null;
}

export interface IngestSummary {
  mailbox: MailboxSummary | null;
  sources: Record<string, number | null>;
  newJobs: number;
}

async function store(db: DB, jobs: RawJob[], now: Date, contexts: RankContext[]): Promise<{ created: number; total: number }> {
  const cache = await dedupeCandidates(db);
  let created = 0;
  for (const j of jobs) if ((await upsertRawJob(db, j, now, { cache, contexts })).created) created++;
  // Every employer board behind these links joins the registry: next runs read the whole board.
  await learnFeeds(db, jobs).catch(() => 0);
  return { created, total: jobs.length };
}

export async function runIngest(deps: IngestDeps): Promise<IngestSummary> {
  const { db, fetchImpl, demo } = deps;
  const now = deps.now ?? new Date();
  const settings = await getSettings(db);
  const contexts = await rankContexts(db);
  const summary: IngestSummary = { mailbox: null, sources: {}, newJobs: 0 };

  // 1. Mailboxes (first source), one per configured key in use
  for (const m of deps.mailboxes) {
    const source = m.key === "default" ? "mailbox" : `mailbox:${m.key}`;
    try {
      const r = await scanMailbox(db, m.mailbox, m.owners, now, { contexts });
      summary.mailbox = summary.mailbox
        ? { alerts: summary.mailbox.alerts + r.alerts, jobsNew: summary.mailbox.jobsNew + r.jobsNew, jobsMerged: summary.mailbox.jobsMerged + r.jobsMerged, replies: summary.mailbox.replies + r.replies }
        : r;
      summary.newJobs += r.jobsNew;
      await m.done?.(null);
      await runWithHealth(db, source, async () => ({ items: r.alerts, failures: 0 }), now);
    } catch (e) {
      await m.done?.(e);
      await runWithHealth(db, source, async () => { throw e; }, now);
    }
  }

  // Each person's search code (ADR 0021): people with the same brackets share the same searches,
  // and a search made in the last 20 hours (by anyone) is not made again.
  const codes = [];
  for (const ctx of contexts) {
    if (!ctx.profile.onboardedAt) continue;
    codes.push((await searchCodeFor(db, ctx.userId, now)).queries.filter((q) => q.channel === "api"));
  }
  const calls = new Map<string, CodeQuery>();
  // Each person's API searches interleaved, all of them in turn (the shared daily cache runs each once a day).
  for (let i = 0; codes.some((l) => l[i]); i++) for (const list of codes) if (list[i]) calls.set(list[i].key, list[i]);
  // The API gets the role plus its extra words ("Sales manager moda", "Analyst da remoto").
  const apiCalls = (await freshQueries(db, [...calls.values()], now)).slice(0, API_CALLS_PER_RUN).map((q) => ({ ...q, what: queryWords(q) }));
  // Company career feeds: keep the offers located in any country someone chose.
  const atsCountries = [...new Set(contexts.flatMap((c) => homeCountries(c.profile.countries, c.profile.city)))];

  // 2. Adzuna
  const adzuna = demo ? { appId: "demo", appKey: "demo" } : env.adzuna;
  if (settings.adzunaEnabled && adzuna.appId && adzuna.appKey && apiCalls.length) {
    const r = await runWithHealth(db, "api:adzuna", async () => {
      let items = 0;
      for (const c of apiCalls) {
        const jobs = await fetchAdzuna(fetchImpl, adzuna, c);
        await markSearched(db, c.key, jobs.length, now);
        const s = await store(db, jobs, now, contexts);
        items += s.total;
        summary.newJobs += s.created;
      }
      return { items, failures: 0 };
    }, now);
    summary.sources["api:adzuna"] = r?.items ?? null;
  }

  // 3. Jooble (tiny lifetime quota: off by default, one call per run)
  const joobleKey = demo ? "demo" : env.joobleKey;
  if (settings.joobleEnabled && joobleKey && apiCalls.length) {
    const r = await runWithHealth(db, "api:jooble", async () => {
      const c = apiCalls.find((x) => x.country === "IT") ?? apiCalls[0]; // Jooble's key is for Italy
      const jobs = await fetchJooble(fetchImpl, joobleKey, { keywords: c.what, location: c.where, radiusKm: c.distanceKm });
      const s = await store(db, jobs, now, contexts);
      summary.newJobs += s.created;
      return { items: s.total, failures: 0 };
    }, now);
    summary.sources["api:jooble"] = r?.items ?? null;
  }

  // 4. ATS feeds: the admin's watchlist, plus catalog companies someone chose that have a known feed.
  // 403/429 pauses the whole HOST (e.g. boards-api.greenhouse.io), not just one company.
  const listed = await db.select().from(schema.companyWatchlist).where(eq(schema.companyWatchlist.active, true));
  const chosen = await db
    .selectDistinct({ name: schema.catalogCompanies.name, ats: schema.catalogCompanies.ats, slug: schema.catalogCompanies.atsSlug })
    .from(schema.catalogCompanies)
    .innerJoin(schema.userPrefs, and(eq(schema.userPrefs.kind, "company"), eq(schema.userPrefs.refId, schema.catalogCompanies.id), eq(schema.userPrefs.stance, "like")))
    .innerJoin(schema.users, and(eq(schema.users.id, schema.userPrefs.userId), eq(schema.users.active, true)))
    .where(and(isNotNull(schema.catalogCompanies.ats), isNotNull(schema.catalogCompanies.atsSlug), sql`${schema.catalogCompanies.atsSlug} != ''`));
  // Chosen companies in order of fit for each person, people interleaved; at most ATS_PER_RUN feeds a
  // run (best fits every day, the rest in rotation), so hundreds of choices never mean hundreds of calls.
  const byPerson = [];
  // Each person's targets: chosen companies, then every company of their positions' sectors.
  const targetsOf = new Map<number, Awaited<ReturnType<typeof searchTargets>>>();
  for (const ctx of contexts) if (ctx.profile.onboardedAt) targetsOf.set(ctx.userId, await searchTargets(db, ctx.userId));
  for (const ctx of contexts) byPerson.push((targetsOf.get(ctx.userId) ?? []).filter((c) => c.ats && c.atsSlug));
  const ordered: { name: string; ats: string; slug: string }[] = [];
  for (let i = 0; byPerson.some((l) => l[i]); i++) for (const l of byPerson) if (l[i]) ordered.push({ name: l[i].name, ats: l[i].ats!, slug: l[i].atsSlug! });
  // Every person's targets in order of fit (chosen first, then their sectors), then any other chosen feed.
  const chosenFeeds = [...ordered, ...chosen.map((c) => ({ name: c.name, ats: c.ats!, slug: c.slug! }))];
  const unique = <T extends { ats: string; slug: string }>(l: T[]) => l.filter((w, i, all) => all.findIndex((x) => x.ats === w.ats && x.slug === w.slug) === i);
  // Rotation by 3-hour slot: the run every 3 hours reads different boards and sites each time.
  const day = Math.floor(now.getTime() / (3 * 3_600_000));
  // Boards found on their own (from offer links and searches), in rotation, for everyone's roles.
  const discovered = (await discoveredFeeds(db)).map((c) => ({ name: c.name, ats: c.ats!, slug: c.atsSlug! }));
  const keepAll = new Set([...listed.map((w) => `${w.ats}:${w.slug}`), ...chosen.map((c) => `${c.ats}:${c.slug}`)]);
  const watch = unique([
    ...listed.map((w) => ({ name: w.name, ats: w.ats, slug: w.slug })),
    ...todaysPicks(unique(chosenFeeds), Math.max(0, ATS_PER_RUN - listed.length), day),
    ...todaysPicks(discovered, DISCOVERED_PER_RUN, day),
  ]);
  // What everyone looks for: big boards are searched with these words, and boards nobody chose keep
  // only offers carrying one of these roles (students: programmes too).
  const allKeywords = [...new Set(contexts.flatMap((c) => searchKeywords(c.profile.roles, c.profile.synonyms, 3)))].slice(0, 8);
  const allTerms = roleTerms(contexts.flatMap((c) => [...c.profile.roles, ...c.profile.synonyms]));
  const students = contexts.some((c) => c.profile.track === "stage");
  const relevant = (j: RawJob) => titleMatches(j.title, allTerms) || (students && isProgrammeTitle(j.title));
  for (const w of watch) {
    const key = `ats:${w.ats}:${w.slug}`;
    const host = new URL(atsEndpoint(w.ats as AtsType, w.slug)).host;
    if (await isPaused(db, `host:${host}`, now)) {
      summary.sources[key] = null;
      continue;
    }
    const r = await runWithHealth(db, key, async () => {
      let jobs;
      try {
        jobs = await fetchAts(fetchImpl, w.ats as AtsType, w.slug, w.name, atsCountries, { keywords: allKeywords });
        // A whole board just read: our offers no longer on it were taken down by the employer.
        for (const id of await closeMissing(db, { ats: w.ats as AtsType, slug: w.slug }, jobs.map((j) => j.url ?? ""), now)) await rankJobForAll(db, id, now, contexts);
        if (!keepAll.has(`${w.ats}:${w.slug}`)) jobs = jobs.filter(relevant);
      } catch (e) {
        if (e instanceof BlockedError) await runWithHealth(db, `host:${host}`, async () => { throw e; }, now);
        throw e;
      }
      const s = await store(db, jobs, now, contexts);
      summary.newJobs += s.created;
      return { items: s.total, failures: 0 };
    }, now);
    summary.sources[key] = r?.items ?? null;
  }

  // 4a. Searches on employers' boards are part of everyone's search code (pipeline/discover.ts): the
  // boards they reveal join the registry there and are read here, in rotation.

  // 4b. Career pages of the chosen companies found by the web scraping ("Fai web scraping"),
  // people interleaved, in rotation: a few sites a day, each at its polite pace.
  const careers: { id: number; name: string; careersUrl: string }[] = [];
  const perPerson = [];
  for (const ctx of contexts) perPerson.push((targetsOf.get(ctx.userId) ?? []).filter((c) => c.careersUrl && !(c.ats && c.atsSlug)));
  for (let i = 0; perPerson.some((l) => l[i]); i++) for (const l of perPerson) if (l[i] && !careers.some((c) => c.id === l[i].id)) careers.push({ id: l[i].id, name: l[i].name, careersUrl: l[i].careersUrl! });
  const todaysSites = todaysPicks(careers, CAREER_SITES_PER_RUN, day);
  if (todaysSites.length) {
    const polite = new PoliteFetcher(db, fetchImpl, { sleep: deps.politeSleep });
    const deadline = Date.now() + 20 * 60_000;
    await Promise.all(
      todaysSites.map(async (c) => {
        const host = new URL(c.careersUrl).host;
        const r = await runWithHealth(db, `careers:${host}`, async () => {
          const res = await scrapeCareers(polite, { careersUrl: c.careersUrl }, now, deadline);
          const s = await store(db, res.jobs.filter(keepInCountries(atsCountries)).map((j) => ({ ...j, company: j.company || c.name })), now, contexts);
          summary.newJobs += s.created;
          return { items: s.total, failures: 0 };
        }, now);
        summary.sources[`careers:${host}`] = r?.items ?? null;
      }),
    );
  }

  // 4c. Early-careers programmes, for students: firm names from public trackers once a week (names
  // only), then each firm's official page or job board for the offer itself (pipeline/programmes.ts).
  if (contexts.some((c) => c.profile.track === "stage")) {
    const polite = new PoliteFetcher(db, fetchImpl, { sleep: deps.politeSleep });
    const r = await runWithHealth(db, "programmi", async () => {
      const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, "programme_trackers_at") });
      const last = typeof row?.value === "string" ? new Date(row.value).getTime() : 0;
      if (now.getTime() - last > 7 * 86_400_000) {
        await refreshTrackerLeads(db, polite, now);
        const v = now.toISOString();
        await db.insert(schema.settings).values({ key: "programme_trackers_at", value: v }).onConflictDoUpdate({ target: schema.settings.key, set: { value: v } });
      }
      const v = await verifyLeads(
        db,
        {
          polite,
          fetchImpl,
          web: settings.w1Enabled ? (deps.web ?? null) : null,
          now,
          countries: atsCountries,
          searchCap: Math.min(settings.w1DailyCap, W1_HARD_MAX),
          save: async (jobs) => {
            const s = await store(db, jobs, now, contexts);
            summary.newJobs += s.created;
          },
        },
        PROGRAMME_LEADS_PER_RUN,
      );
      return { items: v.offers, failures: 0 };
    }, now);
    summary.sources.programmi = r?.items ?? null;
  }

  // 5. W2: approved sites only (polite fetcher, JSON-LD first)
  const sites = await db.select().from(schema.approvedSites).where(eq(schema.approvedSites.approved, true));
  if (sites.length) {
    const polite = new PoliteFetcher(db, fetchImpl, { sleep: deps.politeSleep });
    for (const site of sites.filter((s) => s.active)) {
      const host = new URL(site.startUrl).host;
      const r = await runWithHealth(db, `w2:${host}`, async () => {
        const { body } = await polite.get(site.startUrl);
        let jobs = extractJobsFromHtml(body, site.startUrl, now);
        let failures = 0;
        if (jobs.length === 0) {
          for (const link of jobLinks(body, site.startUrl, 20)) {
            if (polite.isBlocked(host)) break;
            try {
              const page = await polite.get(link);
              const found = extractJobsFromHtml(page.body, link, now);
              if (found.length === 0) failures++;
              jobs = jobs.concat(found);
            } catch (e) {
              if (e instanceof BlockedError || polite.isBlocked(host)) throw e;
              failures++;
            }
          }
        }
        // No hiring organisation in the data: whose site it is (its name, title, logo, address).
        const owner = pageCompanyClues(body, site.startUrl)[0] ?? null;
        const s = await store(db, jobs.map((j) => ({ ...j, company: j.company || owner })), now, contexts);
        summary.newJobs += s.created;
        return { items: s.total, failures };
      }, now);
      summary.sources[`w2:${host}`] = r?.items ?? null;
    }
  }

  // 5b. Offers still without a company: the name from their own page's code (structured data, site
  // name, tab title, logo, copyright, address), one polite visit each; job platforms are never visited.
  {
    const polite = new PoliteFetcher(db, fetchImpl, { sleep: deps.politeSleep });
    const r = await runWithHealth(db, "aziende", async () => {
      const fixed = await lookUpMissingCompanies(db, polite, { max: COMPANY_LOOKUPS_PER_RUN, until: Date.now() + 3 * 60_000, now });
      for (const id of fixed) await rankJobForAll(db, id, now, contexts);
      if (fixed.length) await mergeDuplicateJobs(db, now); // now named, it may be an offer we already had
      return { items: fixed.length, failures: 0 };
    }, now);
    summary.sources.aziende = r?.items ?? null;
  }

  // 6. Geocoder fallback for jobs whose city is not in the offline dataset (off by default)
  if (settings.geocoderEnabled) {
    const missing = await db
      .select()
      .from(schema.jobs)
      .where(and(isNotNull(schema.jobs.city), isNull(schema.jobs.lat)))
      .limit(GEOCODE_MAX_PER_RUN);
    await runWithHealth(db, "geocoder", async () => {
      let found = 0;
      for (const j of missing) {
        const p = await geocode(db, fetchImpl, j.city!, deps.politeSleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))));
        if (!p) continue;
        found++;
        await db.update(schema.jobs).set({ lat: p.lat, lng: p.lng }).where(eq(schema.jobs.id, j.id));
        await rankJobForAll(db, j.id, now, contexts);
      }
      return { items: found, failures: 0 };
    }, now);
  }

  // Offers no source has shown for a week go (except those saved, applied to or still open).
  summary.sources.pulizia = await purgeOldJobs(db, now);

  await setSetting(db, "lastIngestAt", now.toISOString());
  return summary;
}
