// Live check of job sources (run on GitHub Actions, which can reach them). Prints counts, public job
// titles and response shapes only.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 8: what other job apps use. (1) Common Crawl's public URL index to discover employers' boards
// (Greenhouse, Lever, Ashby, Workday…) without a company list; (2) EURES, the European Commission's
// job portal (public employment services of 31 countries), its public search endpoint and robots.txt.
const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0; +https://github.com/lothesmallcow/thisismyhouse)" };
const short = (s: unknown, n = 90) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);

async function commonCrawl() {
  const info = (await (await fetch("https://index.commoncrawl.org/collinfo.json", { headers: UA })).json()) as { id: string; name: string }[];
  const crawl = info[0].id;
  log(`CC latest ${crawl} (${info[0].name})`);
  const patterns = ["boards.greenhouse.io/*", "job-boards.greenhouse.io/*", "jobs.lever.co/*", "jobs.ashbyhq.com/*", "*.myworkdayjobs.com", "apply.workable.com/*", "*.recruitee.com", "*.avature.net", "*.teamtailor.com", "*.factorialhr.com", "*.inrecruiting.com", "*.intervieweb.it"];
  for (const p of patterns) {
    try {
      const base = `https://index.commoncrawl.org/${crawl}-index?url=${encodeURIComponent(p)}&output=json&fl=url`;
      const pages = await (await fetch(`${base}&showNumPages=true`, { headers: UA })).text();
      const t = Date.now();
      const res = await fetch(`${base}&page=0`, { headers: UA });
      const lines = (await res.text()).split("\n").filter(Boolean);
      const urls = lines.map((l) => { try { return (JSON.parse(l) as { url: string }).url; } catch { return ""; } }).filter(Boolean);
      const tokens = new Set(urls.map((u) => { try { const x = new URL(u); return p.startsWith("*.") ? x.hostname : x.pathname.split("/")[1]; } catch { return ""; } }).filter(Boolean));
      log(`CC ${p}: pages ${short(pages, 60)} · page 0: ${res.status} ${urls.length} urls in ${Date.now() - t} ms → ${tokens.size} boards · e.g. ${[...tokens].slice(0, 6).join(", ")}`);
    } catch (e) {
      log(`CC ${p}: error ${short((e as Error).message, 100)}`);
    }
  }
}

async function eures() {
  const robots = await (await fetch("https://europa.eu/robots.txt", { headers: UA })).text();
  log(`EURES robots: ${short(robots.split("\n").filter((l) => /eures|^user-agent: \*|^disallow: \/$/i.test(l)).join(" ; "), 400)}`);
  const body = (kw: string) => ({
    resultsPerPage: 10, page: 1, sortSearch: "MOST_RECENT",
    keywords: kw ? [{ keyword: kw, specificSearchCode: "EVERYWHERE" }] : [],
    publicationPeriod: null, occupationUris: [], skillUris: [], requiredExperienceCodes: [], positionScheduleCodes: [], sectorCodes: [],
    educationAndQualificationLevelCodes: [], positionOfferingCodes: [], locationCodes: ["it"], euresFlagCodes: [], otherBenefitsCodes: [],
    requiredLanguages: [], minNumberPost: null, sessionId: "compass-probe",
  });
  for (const kw of ["", "sales manager", "analyst", "commerciale"]) {
    try {
      const res = await fetch("https://europa.eu/eures/api/jv-searchengine/search", { method: "POST", headers: { ...UA, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body(kw)) });
      const text = await res.text();
      let d: Record<string, unknown> = {};
      try { d = JSON.parse(text); } catch { log(`EURES "${kw}": ${res.status} not json ${short(text, 150)}`); continue; }
      const jvs = (d.jvs ?? d.jobVacancies ?? d.results ?? []) as Record<string, unknown>[];
      log(`EURES "${kw}" IT: ${res.status} · keys ${Object.keys(d).join(",")} · total ${d.numberRecords ?? d.total ?? "?"} · first keys ${Object.keys(jvs[0] ?? {}).join(",").slice(0, 300)}`);
      for (const j of jvs.slice(0, 4)) log(`   ${short(j.title, 60)} · ${short(JSON.stringify(j.employer ?? j.employerName ?? ""), 60)} · ${short(JSON.stringify(j.locationMap ?? j.locations ?? ""), 80)} · ${j.creationDate ?? j.lastModificationDate ?? ""}`);
    } catch (e) {
      log(`EURES "${kw}": error ${short((e as Error).message, 120)}`);
    }
  }
}

await commonCrawl().catch((e) => log(`CC error ${e.message}`));
await eures().catch((e) => log(`EURES error ${e.message}`));
export {};
