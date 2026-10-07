// Live check of the employer-board readers against real public boards (run on GitHub Actions, which
// can reach them). Prints counts, public job titles and page structure only.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 6: where Avature job pages say the place (their JobPosting data has none), and the search
// page's filters (country / location field names), on UniCredit's career site.
const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0; +https://github.com/lothesmallcow/thisismyhouse)" };
const short = (s: unknown, n = 90) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);
const get = async (u: string) => (await fetch(u, { headers: UA })).text();
const SITE = "https://careers.unicredit.eu";

const feed = await get(`${SITE}/jobsuche/SearchJobs/feed/?search=analyst`);
const links = [...feed.matchAll(/<link>(https:[^<]+JobDetail[^<]+)<\/link>/g)].map((m) => m[1]).slice(0, 3);
log(`feed (no locale) ${feed.length} bytes · ${links.length} links`);
for (const link of links.slice(0, 2)) {
  const html = await get(link);
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const s of ld) {
    try {
      const o = JSON.parse(s.trim());
      log(`LD keys ${Object.keys(o).join(",")} · jobLocation ${short(JSON.stringify(o.jobLocation), 200)} · org ${short(JSON.stringify(o.hiringOrganization), 80)} · validThrough ${o.validThrough}`);
    } catch {
      log(`LD unparsable ${short(s, 100)}`);
    }
  }
  // Labelled fields: Avature shows "<label>: <value>" blocks (class names with "field")
  const fields = [...html.matchAll(/class="[^"]*(?:field|detail|info)[^"]*"[^>]*>([\s\S]{0,300}?)<\/(?:div|li|dd|span)>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter((t) => t && t.length < 120);
  log(`fields: ${short([...new Set(fields)].slice(0, 25).join(" ‖ "), 1500)}`);
  const around = [...html.matchAll(/(Location|Località|Sede|Standort|Ort|City|Città|Country|Paese|Land)\b/g)].slice(0, 6).map((m) => short(html.slice(m.index!, m.index! + 160).replace(/<[^>]+>/g, " "), 120));
  log(`around labels: ${around.join(" ‖ ")}`);
}
const search = await get(`${SITE}/it_IT/jobsuche/SearchJobs/`);
const selects = [...search.matchAll(/<select[^>]*name="([^"]+)"[\s\S]*?<\/select>/g)].map((m) => `${m[1]}: ${short([...m[0].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)/g)].slice(0, 8).map((o) => `${o[2].trim()}=${o[1]}`).join(", "), 300)}`);
log(`search page ${search.length} bytes · selects: ${selects.join(" ‖ ")}`);
const inputs = [...new Set([...search.matchAll(/name="([^"]+)"/g)].map((m) => m[1]))].slice(0, 40);
log(`inputs: ${inputs.join(", ")}`);
const filterLinks = [...new Set([...search.matchAll(/href="([^"]*SearchJobs\/?\?[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&")))].slice(0, 12);
log(`filter links: ${filterLinks.map((l) => short(l, 140)).join(" ‖ ")}`);
const italia = [...search.matchAll(/([^<>]{0,80}(?:Italia|Italy|Milano)[^<>]{0,80})/g)].slice(0, 6).map((m) => short(m[1], 120));
log(`italia mentions: ${italia.join(" ‖ ")}`);
export {};
