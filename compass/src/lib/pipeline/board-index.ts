// The index of employers' boards (weekly): every board the public web archive knows (Common Crawl,
// sources/ats/crawl-index.ts) that Compass does not have yet is read once; those with at least one
// offer in a country Compass covers join the catalog as found on their own ("scoperta"), with the
// country they hire most in. The hourly sweep (board-sweep.ts) then reads them for everyone.
import { and, isNotNull } from "drizzle-orm";
import { inCountries, fetchAts, type AtsType } from "../sources/ats";
import { crawlFeeds } from "../sources/ats/crawl-index";
import type { Feed } from "../sources/ats/feeds";
import { BlockedError, type FetchLike } from "../sources/http";
import type { CountryCode } from "../core/geo";
import type { DB } from "../db";
import { schema } from "../db";
import { feedName, registerFeed } from "../server/feeds";

export const INDEX_COUNTRIES: CountryCode[] = ["IT", "GB", "DE", "FR"];
/** Read whole, or searched with their own country filter: one or two requests to check a board. */
const INDEXABLE = new Set<AtsType>(["greenhouse", "lever", "ashby", "workable", "recruitee", "smartrecruiters", "personio", "workday"]);

export interface IndexSummary {
  crawl: string | null;
  found: number;
  checked: number;
  added: number;
  byCountry: Partial<Record<CountryCode, number>>;
  failed: number;
}

/** Where a board hires most among the covered countries (null: nowhere). */
export function topCountry(locations: (string | null | undefined)[], countries: CountryCode[] = INDEX_COUNTRIES): CountryCode | null {
  const n = new Map<CountryCode, number>();
  for (const loc of locations) {
    const c = countries.find((x) => inCountries(loc, false, [x]));
    if (c) n.set(c, (n.get(c) ?? 0) + 1);
  }
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function runBoardIndex(
  db: DB,
  fetchImpl: FetchLike,
  opts: { crawl?: () => Promise<{ crawl: string; feeds: Feed[] }>; budgetMs?: number; workers?: number; now?: () => number } = {},
): Promise<IndexSummary> {
  const clock = opts.now ?? Date.now;
  const start = clock();
  const { crawl, feeds } = await (opts.crawl ?? (() => crawlFeeds(fetchImpl)))();
  const c = schema.catalogCompanies;
  const known = new Set(
    (await db.select({ ats: c.ats, slug: c.atsSlug }).from(c).where(and(isNotNull(c.ats), isNotNull(c.atsSlug)))).map((r) => `${r.ats}:${(r.slug ?? "").toLowerCase()}`),
  );
  const todo = feeds.filter((f) => INDEXABLE.has(f.ats) && !known.has(`${f.ats}:${f.slug.toLowerCase()}`));
  const summary: IndexSummary = { crawl, found: feeds.length, checked: 0, added: 0, byCountry: {}, failed: 0 };

  // One queue per system (they share an API host), the systems side by side.
  const queues = new Map<string, Feed[]>();
  for (const f of todo) queues.set(f.ats, [...(queues.get(f.ats) ?? []), f]);
  const lanes = [...queues.values()];
  const workers = opts.workers ?? 2;
  await Promise.all(
    lanes.flatMap((lane) =>
      Array.from({ length: workers }, async () => {
        for (let f = lane.shift(); f; f = lane.shift()) {
          if (clock() - start > (opts.budgetMs ?? 40 * 60_000)) return;
          try {
            const jobs = await fetchAts(fetchImpl, f.ats, f.slug, feedName(f), INDEX_COUNTRIES, { keywords: [""], details: 0 });
            summary.checked++;
            const country = topCountry(jobs.map((j) => j.location));
            if (!country) continue;
            if ((await registerFeed(db, f, null, country)) != null) {
              summary.added++;
              summary.byCountry[country] = (summary.byCountry[country] ?? 0) + 1;
            }
          } catch (e) {
            summary.failed++;
            if (e instanceof BlockedError) lane.length = 0; // that system said stop: the rest waits for next week
          }
        }
      }),
    ),
  );
  return summary;
}
