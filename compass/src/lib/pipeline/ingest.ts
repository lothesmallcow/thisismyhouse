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
import { atsEndpoint, fetchAts, type AtsType } from "../sources/ats";
import { BlockedError, type FetchLike } from "../sources/http";
import type { Mailbox } from "../sources/mail/types";
import { extractJobsFromHtml, jobLinks } from "../sources/web/jsonld";
import { PoliteFetcher } from "../sources/web/polite-fetch";
import { dedupeCandidates, rankContexts, rankJobForAll, upsertRawJob, type RankContext } from "../server/jobs";
import { prioritizedCompanies, todaysPicks } from "../server/career";
import { getSettings, setSetting } from "../server/settings";
import { freshQueries, markSearched, searchCodeFor } from "./search-terms";
import type { CodeQuery } from "../core/search-code";
import { homeCountries } from "../core/geo";
import type { RawJob } from "../core/normalize";
import { isPaused, runWithHealth } from "./health";
import { scanMailbox, type MailboxSummary } from "./mailbox-scan";

export interface MailboxRun {
  key: string;
  mailbox: Mailbox;
  /** The people who use this mailbox: its alerts are private to them, its replies match their applications. */
  owners: number[];
}

/** Job API calls per run, whatever the number of people (free quotas are small). */
/** Company career feeds read per run (the admin's watchlist always; chosen companies by fit, in rotation). */
export const ATS_PER_RUN = 25;
export const API_CALLS_PER_RUN = 9;

export interface IngestDeps {
  db: DB;
  fetchImpl: FetchLike;
  mailboxes: MailboxRun[];
  demo: boolean;
  now?: Date;
  /** For tests: skip the 5-second politeness wait. */
  politeSleep?: (ms: number) => Promise<void>;
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
      await runWithHealth(db, source, async () => ({ items: r.alerts, failures: 0 }), now);
    } catch (e) {
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
  for (let i = 0; i < 9; i++) for (const list of codes) if (list[i]) calls.set(list[i].key, list[i]);
  const apiCalls = (await freshQueries(db, [...calls.values()], now)).slice(0, API_CALLS_PER_RUN);
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
  for (const ctx of contexts) byPerson.push((await prioritizedCompanies(db, ctx.userId)).map((x) => x.company).filter((c) => c.ats && c.atsSlug));
  const ordered: { name: string; ats: string; slug: string }[] = [];
  for (let i = 0; byPerson.some((l) => l[i]); i++) for (const l of byPerson) if (l[i]) ordered.push({ name: l[i].name, ats: l[i].ats!, slug: l[i].atsSlug! });
  const known = new Set(chosen.map((c) => `${c.ats}:${c.slug}`));
  const chosenFeeds = [...ordered.filter((o) => known.has(`${o.ats}:${o.slug}`)), ...chosen.map((c) => ({ name: c.name, ats: c.ats!, slug: c.slug! }))];
  const unique = <T extends { ats: string; slug: string }>(l: T[]) => l.filter((w, i, all) => all.findIndex((x) => x.ats === w.ats && x.slug === w.slug) === i);
  const day = Math.floor(now.getTime() / 86_400_000);
  const watch = unique([...listed.map((w) => ({ name: w.name, ats: w.ats, slug: w.slug })), ...todaysPicks(unique(chosenFeeds), Math.max(0, ATS_PER_RUN - listed.length), day)]);
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
        jobs = await fetchAts(fetchImpl, w.ats as AtsType, w.slug, w.name, atsCountries);
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
        const s = await store(db, jobs, now, contexts);
        summary.newJobs += s.created;
        return { items: s.total, failures };
      }, now);
      summary.sources[`w2:${host}`] = r?.items ?? null;
    }
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

  await setSetting(db, "lastIngestAt", now.toISOString());
  return summary;
}
