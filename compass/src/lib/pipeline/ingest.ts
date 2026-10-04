// Scheduled ingestion: mailbox (alerts + replies), job APIs, ATS watchlist, W2 approved sites.
// Each source runs inside runWithHealth(), so one broken source never stops the others.
import { eq } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import { fetchAdzuna } from "../sources/api/adzuna";
import { fetchJooble } from "../sources/api/jooble";
import { fetchAts, type AtsType } from "../sources/ats";
import { BlockedError, type FetchLike } from "../sources/http";
import type { Mailbox } from "../sources/mail/types";
import { extractJobsFromHtml, jobLinks } from "../sources/web/jsonld";
import { PoliteFetcher } from "../sources/web/polite-fetch";
import { dedupeCandidates, upsertRawJob } from "../server/jobs";
import { getProfile } from "../server/profile";
import { getSettings, setSetting } from "../server/settings";
import type { RawJob } from "../core/normalize";
import { runWithHealth } from "./health";
import { scanMailbox, type MailboxSummary } from "./mailbox-scan";

export interface IngestDeps {
  db: DB;
  fetchImpl: FetchLike;
  mailbox: Mailbox | null;
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

async function store(db: DB, jobs: RawJob[], now: Date): Promise<{ created: number; total: number }> {
  const cache = await dedupeCandidates(db);
  let created = 0;
  for (const j of jobs) if ((await upsertRawJob(db, j, now, cache)).created) created++;
  return { created, total: jobs.length };
}

export async function runIngest(deps: IngestDeps): Promise<IngestSummary> {
  const { db, fetchImpl, mailbox, demo } = deps;
  const now = deps.now ?? new Date();
  const settings = await getSettings(db);
  const profile = await getProfile(db);
  const summary: IngestSummary = { mailbox: null, sources: {}, newJobs: 0 };

  // 1. Mailbox (first source)
  if (mailbox) {
    try {
      summary.mailbox = await scanMailbox(db, mailbox, now);
      summary.newJobs += summary.mailbox.jobsNew;
      await runWithHealth(db, "mailbox", async () => ({ items: summary.mailbox!.alerts, failures: 0 }), now);
    } catch (e) {
      await runWithHealth(db, "mailbox", async () => { throw e; }, now);
    }
  }

  const roles = profile.roles.slice(0, 3);
  const city = profile.city || "Torino";

  // 2. Adzuna
  const adzuna = demo ? { appId: "demo", appKey: "demo" } : env.adzuna;
  if (settings.adzunaEnabled && adzuna.appId && adzuna.appKey && roles.length) {
    const r = await runWithHealth(db, "api:adzuna", async () => {
      let items = 0;
      for (const what of roles) {
        const jobs = await fetchAdzuna(fetchImpl, adzuna, { what, where: city, distanceKm: profile.maxKm });
        const s = await store(db, jobs, now);
        items += s.total;
        summary.newJobs += s.created;
      }
      return { items, failures: 0 };
    }, now);
    summary.sources["api:adzuna"] = r?.items ?? null;
  }

  // 3. Jooble (tiny lifetime quota: off by default)
  const joobleKey = demo ? "demo" : env.joobleKey;
  if (settings.joobleEnabled && joobleKey && roles.length) {
    const r = await runWithHealth(db, "api:jooble", async () => {
      const jobs = await fetchJooble(fetchImpl, joobleKey, { keywords: roles[0], location: city, radiusKm: profile.maxKm });
      const s = await store(db, jobs, now);
      summary.newJobs += s.created;
      return { items: s.total, failures: 0 };
    }, now);
    summary.sources["api:jooble"] = r?.items ?? null;
  }

  // 4. ATS watchlist
  const watch = await db.select().from(schema.companyWatchlist).where(eq(schema.companyWatchlist.active, true));
  for (const w of watch) {
    const key = `ats:${w.ats}:${w.slug}`;
    const r = await runWithHealth(db, key, async () => {
      const jobs = await fetchAts(fetchImpl, w.ats as AtsType, w.slug, w.name);
      const s = await store(db, jobs, now);
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
        const s = await store(db, jobs, now);
        summary.newJobs += s.created;
        return { items: s.total, failures };
      }, now);
      summary.sources[`w2:${host}`] = r?.items ?? null;
    }
  }

  await setSetting(db, "lastIngestAt", now.toISOString());
  return summary;
}
