// Live check of the employer-board readers against real public boards (run on GitHub Actions, which
// can reach them): for each board, how many offers came back, a sample (public job titles only), or
// the error. Also how career sites publish their job lists (sitemaps). Prints counts and titles only.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
import { fetchEnterprise, type EnterpriseAts } from "../src/lib/sources/ats/enterprise";
import { fetchAts, type AtsType } from "../src/lib/sources/ats";

const BOARDS: [AtsType, string, string, string[]][] = [
  ["workday", "barclays.wd3.myworkdayjobs.com/External_Career_Site_Barclays", "Barclays", ["analyst"]],
  ["workday", "citi.wd5.myworkdayjobs.com/2", "Citi", ["analyst"]],
  ["workday", "nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", "NVIDIA", ["engineer"]],
  ["workday", "salesforce.wd12.myworkdayjobs.com/External_Career_Site", "Salesforce", ["sales"]],
  ["workday", "bnpparibas.wd3.myworkdayjobs.com/BNPP_Careers", "BNP Paribas", ["analyst"]],
  ["oracle", "jpmc.fa.oraclecloud.com/CX_1001", "J.P. Morgan", ["analyst"]],
  ["oracle", "eeho.fa.us2.oraclecloud.com/CX_1", "Oracle", ["sales"]],
  ["eightfold", "aexp.eightfold.ai/aexp.com", "American Express", ["analyst"]],
  ["eightfold", "paypal.eightfold.ai/paypal.com", "PayPal", ["manager"]],
  ["eightfold", "starbucks.eightfold.ai/starbucks.com", "Starbucks", ["manager"]],
  ["greenhouse", "stripe", "Stripe", []],
  ["lever", "palantir", "Palantir", []],
  ["ashby", "ramp", "Ramp", []],
  ["smartrecruiters", "Bosch", "Bosch", []],
];

const SITEMAP_HOSTS = ["jobs.sap.com", "careers.unicredit.eu", "jobs.intesasanpaolo.com", "careers.generali.com", "jobs.enel.com", "careers.deloitte.it", "jobs.kpmg.it", "careers.pwc.com"];

const short = (s: unknown, n = 80) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);

async function main() {
  for (const [ats, slug, company, keywords] of BOARDS) {
    const t = Date.now();
    try {
      const jobs = ["workday", "oracle", "eightfold", "recruitee"].includes(ats)
        ? await fetchEnterprise(fetch, ats as EnterpriseAts, slug, company, { keywords, details: 1 })
        : await fetchAts(fetch, ats, slug, company, ["IT", "GB", "DE", "FR"]);
      const first = jobs[0];
      console.log(`OK   ${ats} ${slug}: ${jobs.length} offers in ${Date.now() - t} ms` + (first ? ` · e.g. "${short(first.title)}" · ${short(first.location, 40)} · ${short(first.company, 30)} · desc ${first.description?.length ?? 0} chars · posted ${first.postedAt?.toISOString?.().slice(0, 10) ?? "-"} · ${short(first.url, 120)}` : ""));
    } catch (e) {
      console.log(`FAIL ${ats} ${slug}: ${short((e as Error).message, 200)}`);
    }
  }
  for (const host of SITEMAP_HOSTS) {
    for (const path of ["/robots.txt", "/sitemap.xml", "/sitemal.xml"]) {
      try {
        const res = await fetch(`https://${host}${path}`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0)" }, redirect: "follow" });
        const body = res.ok ? await res.text() : "";
        const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        const sitemaps = [...body.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
        console.log(`SITE ${host}${path}: ${res.status} · ${locs.length} locs (${locs.filter((l) => /job/i.test(l)).length} with "job")${locs[0] ? ` · e.g. ${short(locs.find((l) => /job/i.test(l)) ?? locs[0], 140)}` : ""}${sitemaps.length ? ` · sitemaps: ${sitemaps.slice(0, 3).join(" ")}` : ""}`);
      } catch (e) {
        console.log(`SITE ${host}${path}: error ${short((e as Error).message, 100)}`);
      }
    }
  }
}

await main();
