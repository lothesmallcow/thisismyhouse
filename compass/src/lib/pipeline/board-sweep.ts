// The hourly sweep: every employer board in the catalog that hires in a country someone chose, read
// again, so an offer published after the last refresh shows up within the hour. Boards of the same
// system share its API host: each host is read one board at a time with a pause between requests,
// the hosts side by side. Offers on boards nobody chose are kept only when they carry one of the roles
// people look for; offers a whole board no longer lists are closed (server/feeds.ts closeMissing).
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { atsEndpoint, fetchAts, type AtsType } from "../sources/ats";
import { BlockedError, type FetchLike } from "../sources/http";
import type { RawJob } from "../core/normalize";
import type { DB } from "../db";
import { schema } from "../db";
import { closeMissing } from "../server/feeds";
import { rankContexts, rankJobForAll } from "../server/jobs";
import { isPaused, runWithHealth } from "./health";
import { store } from "./ingest";
import { whatPeopleWant } from "./wanted";

/** Systems read in the sweep: quick to read (Avature needs a page per offer, Eightfold answers no one). */
export const SWEEP_ATS: AtsType[] = ["greenhouse", "lever", "ashby", "workable", "recruitee", "smartrecruiters", "personio", "workday", "oracle", "teamtailor"];

export interface SweepSummary {
  boards: number;
  read: number;
  failed: number;
  kept: number;
  newJobs: number;
  closed: number;
  skipped?: string;
}

export async function runBoardSweep(
  db: DB,
  fetchImpl: FetchLike,
  now = new Date(),
  opts: { budgetMs?: number; gapMs?: number; lanes?: number; sleep?: (ms: number) => Promise<void>; clock?: () => number } = {},
): Promise<SweepSummary> {
  const summary: SweepSummary = { boards: 0, read: 0, failed: 0, kept: 0, newJobs: 0, closed: 0 };
  const contexts = (await rankContexts(db)).filter((c) => c.profile.onboardedAt);
  if (!contexts.length) return { ...summary, skipped: "nobody to search for" };
  const { countries, keywords, relevant } = whatPeopleWant(contexts);
  const c = schema.catalogCompanies;
  const boards = await db
    .select({ id: c.id, name: c.name, ats: c.ats, slug: c.atsSlug })
    .from(c)
    .where(and(isNotNull(c.ats), isNotNull(c.atsSlug), sql`${c.atsSlug} != ''`, inArray(c.ats, SWEEP_ATS), inArray(c.country, countries)));
  // Boards someone chose: all their offers count, whatever the title.
  const liked = new Set(
    (
      await db
        .selectDistinct({ id: schema.userPrefs.refId })
        .from(schema.userPrefs)
        .where(and(eq(schema.userPrefs.kind, "company"), eq(schema.userPrefs.stance, "like")))
    ).map((r) => r.id),
  );
  summary.boards = boards.length;
  const clock = opts.clock ?? Date.now;
  const start = clock();
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const byHost = new Map<string, typeof boards>();
  for (const b of boards) {
    const host = new URL(atsEndpoint(b.ats as AtsType, b.slug!)).host;
    byHost.set(host, [...(byHost.get(host) ?? []), b]);
  }
  const hosts = [...byHost.entries()];
  const found: RawJob[] = [];

  await runWithHealth(
    db,
    "sweep",
    async () => {
      const lane = async () => {
        for (let next = hosts.shift(); next; next = hosts.shift()) {
          const [host, list] = next;
          if (await isPaused(db, `host:${host}`, now)) continue;
          for (const b of list) {
            if (clock() - start > (opts.budgetMs ?? 20 * 60_000)) return;
            try {
              const jobs = await fetchAts(fetchImpl, b.ats as AtsType, b.slug!, b.name, countries, { keywords, details: 2 });
              summary.read++;
              for (const id of await closeMissing(db, { ats: b.ats as AtsType, slug: b.slug! }, jobs.map((j) => j.url ?? ""), now)) {
                summary.closed++;
                await rankJobForAll(db, id, now, contexts);
              }
              found.push(...(liked.has(b.id) ? jobs : jobs.filter(relevant)));
            } catch (e) {
              summary.failed++;
              if (e instanceof BlockedError) {
                // The host said stop: pause it (the health record) and leave its other boards for later.
                await runWithHealth(db, `host:${host}`, async () => { throw e; }, now);
                break;
              }
            }
            await sleep(opts.gapMs ?? 400);
          }
        }
      };
      await Promise.all(Array.from({ length: opts.lanes ?? 6 }, lane));
      const s = await store(db, found, now, contexts);
      summary.kept = s.total;
      summary.newJobs = s.created;
      return { items: s.total, failures: summary.failed };
    },
    now,
  );
  return summary;
}
