// Live check of the employer-board readers against real public boards (run on GitHub Actions, which
// can reach them): for each board, how many offers came back, a sample (public job titles only), or
// the error. Prints counts and titles only.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 5: the readers as the app runs them (fetchAts: country targeting, details, country filter),
// including Avature career sites read through their search feed.
import { fetchAts, type AtsType } from "../src/lib/sources/ats";
import type { CountryCode } from "../src/lib/core/geo";

const short = (s: unknown, n = 90) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);

const boards: [AtsType, string, string, string[], CountryCode[]][] = [
  ["workday", "barclays.wd3.myworkdayjobs.com/External_Career_Site_Barclays", "Barclays", ["Analyst"], ["IT"]],
  ["workday", "barclays.wd3.myworkdayjobs.com/External_Career_Site_Barclays", "Barclays", ["Analyst"], ["GB"]],
  ["workday", "nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", "NVIDIA", ["Engineer"], ["IT"]],
  ["workday", "citi.wd5.myworkdayjobs.com/2", "Citi", ["Analyst", "Associate"], ["IT"]],
  ["oracle", "jpmc.fa.oraclecloud.com/CX_1001", "J.P. Morgan", ["Analyst", "Associate"], ["IT"]],
  ["avature", "careers.unicredit.eu/jobsuche", "UniCredit", ["Analyst", "Risk"], ["IT"]],
  ["avature", "careers.unicredit.eu/jobsuche", "UniCredit", [""], ["IT"]],
];

for (const [ats, slug, company, keywords, countries] of boards) {
  try {
    const t = Date.now();
    const jobs = await fetchAts(fetch, ats, slug, company, countries, { keywords });
    const full = jobs.filter((j) => !j.thin);
    log(`${ats} ${company} ${countries.join("+")} [${keywords.join(",")}]: ${jobs.length} offers in ${Date.now() - t} ms · full ${full.length} · posted ${jobs.slice(0, 3).map((j) => j.postedAt?.toISOString().slice(0, 10) ?? "-").join("/")} · closes ${full.slice(0, 3).map((j) => j.hints?.closesAt?.toISOString().slice(0, 10) ?? "-").join("/")}`);
    for (const j of jobs.slice(0, 5)) log(`   ${short(j.title, 55)} @ ${short(j.location, 45)} · ${short(j.company, 20)} · desc ${(j.description ?? "").length}`);
  } catch (e) {
    log(`${ats} ${company}: error ${short((e as Error).message, 140)}`);
  }
}
