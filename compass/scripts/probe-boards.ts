// Live check of job sources (run on GitHub Actions, which can reach them). Prints counts and public
// job titles only; writes nothing.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 12 (round 9 again; American places with European names, and Italian town names inside
// other names, no longer count as Europe): the board index as the weekly job runs it, without the database: every board in the
// latest Common Crawl, then a sample of each system checked for offers in Italy, UK, Germany, France.
import { crawlFeeds } from "../src/lib/sources/ats/crawl-index";
import { fetchAts } from "../src/lib/sources/ats";
import { topCountry, INDEX_COUNTRIES } from "../src/lib/pipeline/board-index";
import { feedName } from "../src/lib/server/feeds";
import type { Feed } from "../src/lib/sources/ats/feeds";

const log = (...a: unknown[]) => console.log(...a);
const t0 = Date.now();
const { crawl, feeds, pages, failed } = await crawlFeeds(fetch, { onError: (what, e) => log(`  failed ${what}: ${String((e as Error).message ?? e).slice(0, 120)}`) });
const by = new Map<string, Feed[]>();
for (const f of feeds) by.set(f.ats, [...(by.get(f.ats) ?? []), f]);
log(`crawl ${crawl}: ${feeds.length} boards from ${pages} pages (${failed} failed) in ${Math.round((Date.now() - t0) / 1000)} s · ${[...by].map(([a, l]) => `${a} ${l.length}`).join(", ")}`);

const SAMPLE = 60;
for (const [ats, list] of by) {
  const t = Date.now();
  const counts: Record<string, number> = {};
  let checked = 0;
  let errors = 0;
  const italian: string[] = [];
  const sample = list.filter((_, i) => i % Math.max(1, Math.floor(list.length / SAMPLE)) === 0).slice(0, SAMPLE);
  const queue = [...sample];
  await Promise.all(
    [0, 1].map(async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        try {
          const jobs = await fetchAts(fetch, f.ats, f.slug, feedName(f), INDEX_COUNTRIES, { keywords: [""], details: 0 });
          checked++;
          const c = topCountry(jobs.map((j) => j.location));
          if (c) counts[c] = (counts[c] ?? 0) + 1;
          if (c === "IT" && italian.length < 8) italian.push(`${feedName(f)} (${jobs.length}: ${jobs.find((j) => j.location)?.location?.slice(0, 40)})`);
        } catch {
          errors++;
        }
      }
    }),
  );
  const hit = Object.values(counts).reduce((a, b) => a + b, 0);
  log(`${ats}: sample ${checked}/${sample.length} (${errors} errors) in ${Math.round((Date.now() - t) / 1000)} s · with offers in covered countries ${hit} (${Math.round((hit / Math.max(1, checked)) * 100)}%) ${JSON.stringify(counts)} → about ${Math.round((hit / Math.max(1, checked)) * list.length)} of ${list.length} · Italy e.g. ${italian.join(", ")}`);
}
export {};
