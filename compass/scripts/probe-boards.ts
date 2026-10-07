// Live check of job sources (run on GitHub Actions, which can reach them). Prints counts and public job
// titles only; writes nothing.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 16: the Teamtailor reader on real boards (feed, places from the offer pages), and how many
// Teamtailor boards in the archive hire in the covered countries.
import { fetchEnterprise } from "../src/lib/sources/ats/enterprise";
import { fetchAts } from "../src/lib/sources/ats";
import { crawlFeeds } from "../src/lib/sources/ats/crawl-index";
import { INDEX_COUNTRIES, topCountry } from "../src/lib/pipeline/board-index";

const short = (s: unknown, n = 60) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);
for (const slug of ["above", "aabenbryg"]) {
  const jobs = await fetchEnterprise(fetch, "teamtailor", slug, slug, { details: 3 });
  log(`TT ${slug}: ${jobs.length} offers · ${jobs.slice(0, 4).map((j) => `${short(j.title, 40)} @ ${short(j.location, 40)} (desc ${(j.description ?? "").length}, ${j.postedAt?.toISOString().slice(0, 10) ?? "-"})`).join(" | ")}`);
}
const { feeds, pages, failed } = await crawlFeeds(fetch, { patterns: ["*.teamtailor.com"], onError: (w, e) => log(`  failed ${w}: ${short((e as Error).message, 80)}`) });
log(`TT archive: ${feeds.length} boards from ${pages} pages (${failed} failed)`);
const counts: Record<string, number> = {};
const italian: string[] = [];
let checked = 0;
for (const f of feeds.slice(0, 80)) {
  try {
    const jobs = await fetchAts(fetch, f.ats, f.slug, f.slug, INDEX_COUNTRIES, { keywords: [""], details: 4 });
    checked++;
    const c = topCountry(jobs.map((j) => j.location));
    if (c) counts[c] = (counts[c] ?? 0) + 1;
    if (c === "IT" && italian.length < 8) italian.push(`${f.slug} (${jobs.length})`);
  } catch {
    /* next */
  }
}
log(`TT sample ${checked} boards: with offers in covered countries ${JSON.stringify(counts)} · Italy e.g. ${italian.join(", ")}`);
export {};
