// Live check of the employer-board readers against real public boards (run on GitHub Actions, which
// can reach them): for each board, how many offers came back, a sample (public job titles only), or
// the error. Also how career sites publish their job lists (sitemaps). Prints counts and titles only.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 2: location targeting on Workday and Oracle, sitemaps of Avature / SuccessFactors / Radancy
// career sites and whether their job pages carry JobPosting data.

const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0; +https://github.com/lothesmallcow/thisismyhouse)", Accept: "application/json, text/html;q=0.9, */*;q=0.5" };
const short = (s: unknown, n = 90) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);

async function json(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { ...UA, ...(init.headers ?? {}) } });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text.slice(0, 200) };
  }
}

async function workday() {
  const host = "citi.wd5.myworkdayjobs.com";
  const url = `https://${host}/wday/cxs/citi/2/jobs`;
  const post = (body: object) => json(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "", ...body }) });
  const a = await post({ searchText: "analyst" });
  const facets = (a.body?.facets ?? []) as { facetParameter: string; values?: { id: string; descriptor: string; count?: number; values?: unknown[] }[] }[];
  log(`WD facets: ${facets.map((f) => `${f.facetParameter}(${f.values?.length ?? 0})`).join(", ")} · total ${a.body?.total}`);
  for (const f of facets) {
    const hit = (f.values ?? []).filter((v) => /ital|milan|london|united kingdom/i.test(v.descriptor ?? "")).slice(0, 4);
    if (hit.length) log(`WD facet ${f.facetParameter}: ${hit.map((v) => `${v.descriptor}=${v.id} (${v.count})`).join(" | ")}`);
    // nested (locationMainGroup → values)
    for (const v of f.values ?? []) {
      const inner = ((v as { values?: { id: string; descriptor: string; count?: number }[] }).values ?? []).filter((x) => /ital|milan/i.test(x.descriptor ?? "")).slice(0, 3);
      if (inner.length) log(`WD nested ${f.facetParameter}/${v.descriptor}: ${inner.map((x) => `${x.descriptor}=${x.id} (${x.count})`).join(" | ")}`);
    }
  }
  const it = facets.flatMap((f) => (f.values ?? []).filter((v) => /^italy$|^italia$/i.test(v.descriptor ?? "")).map((v) => ({ p: f.facetParameter, id: v.id })))[0];
  if (it) {
    const b = await post({ searchText: "analyst", appliedFacets: { [it.p]: [it.id] } });
    log(`WD with ${it.p}=Italy: total ${b.body?.total} · ${((b.body?.jobPostings ?? []) as { title: string; locationsText: string }[]).slice(0, 3).map((j) => `${short(j.title, 50)} @ ${j.locationsText}`).join(" | ")}`);
  }
  const c = await post({ searchText: "analyst Milan" });
  log(`WD searchText "analyst Milan": total ${c.body?.total} · ${((c.body?.jobPostings ?? []) as { title: string; locationsText: string }[]).slice(0, 3).map((j) => `${short(j.title, 50)} @ ${j.locationsText}`).join(" | ")}`);
}

async function oracle() {
  const host = "jpmc.fa.oraclecloud.com";
  const base = `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations,flexFieldsFacet.values&finder=`;
  const f1 = `findReqs;siteNumber=CX_1001,facetsList=LOCATIONS;WORK_LOCATIONS;TITLES;CATEGORIES,limit=5,keyword="analyst",sortBy=POSTING_DATES_DESC`;
  const a = await json(base + encodeURIComponent(f1));
  const item = a.body?.items?.[0] ?? {};
  log(`OR status ${a.status} · keys ${Object.keys(item).join(",").slice(0, 300)}`);
  const locs = (item.locationsFacet ?? []) as { Id: number | string; Name: string; TotalCount?: number }[];
  log(`OR locationsFacet ${locs.length}: ${locs.filter((l) => /ital|milan|london/i.test(l.Name)).slice(0, 5).map((l) => `${l.Name}=${l.Id} (${l.TotalCount})`).join(" | ")}`);
  const it = locs.find((l) => /ital/i.test(l.Name));
  if (it) {
    const f2 = `findReqs;siteNumber=CX_1001,selectedLocationsFacet=${it.Id},limit=10,keyword="analyst",sortBy=POSTING_DATES_DESC`;
    const b = await json(base + encodeURIComponent(f2));
    const list = (b.body?.items?.[0]?.requisitionList ?? []) as { Title: string; PrimaryLocation: string }[];
    log(`OR Italy: ${b.body?.items?.[0]?.TotalJobsCount} · ${list.slice(0, 3).map((j) => `${short(j.Title, 50)} @ ${j.PrimaryLocation}`).join(" | ")}`);
  }
  // One requisition in full (description, dates)
  const id = item.requisitionList?.[0]?.Id;
  if (id) {
    const d = await json(`https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=${encodeURIComponent(`ById;Id="${id}",siteNumber=CX_1001`)}`);
    const r = d.body?.items?.[0] ?? {};
    log(`OR detail ${d.status} · keys ${Object.keys(r).slice(0, 40).join(",")} · desc ${String(r.ExternalDescriptionStr ?? "").length} chars`);
  }
}

async function eightfold() {
  for (const [host, domain] of [["aexp.eightfold.ai", "americanexpress.com"], ["aexp.eightfold.ai", "aexp.com"]]) {
    const r = await fetch(`https://${host}/api/apply/v2/jobs?domain=${domain}&start=0&num=5&query=analyst`, { headers: { ...UA, "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" } });
    log(`EF ${host} ${domain}: ${r.status} ${short(await r.text(), 120)}`);
  }
}

async function sitemaps() {
  const starts = [
    "https://careers.unicredit.eu/jobsuche/sitemap_index.xml",
    "https://jobs.enel.com/careers/sitemap_index.xml",
    "https://jobs.sap.com/en/sitemap.xml",
    "https://careers.pwc.com/sitemap.xml",
  ];
  for (const start of starts) {
    try {
      let url = start;
      let locs: string[] = [];
      for (let hop = 0; hop < 3; hop++) {
        const res = await fetch(url, { headers: UA });
        const body = await res.text();
        locs = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
        const isIndex = /<sitemapindex/i.test(body);
        log(`SM ${url}: ${res.status} · ${isIndex ? "index" : "urlset"} · ${locs.length} locs · e.g. ${short(locs[0], 140)}`);
        if (!isIndex) break;
        url = locs.find((l) => /job|position|offer|vacanc|career/i.test(l)) ?? locs[0];
      }
      const job = locs.find((l) => /job|position|offer|vacanc|stelle|lavor/i.test(l) && !/\.xml/.test(l)) ?? locs[0];
      if (!job) continue;
      const res = await fetch(job, { headers: UA });
      const html = await res.text();
      const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
      const posting = ld.find((s) => /JobPosting/.test(s));
      let fields = "";
      if (posting) {
        try {
          const o = JSON.parse(posting.trim());
          const p = Array.isArray(o) ? o.find((x) => /JobPosting/.test(x["@type"])) : o["@graph"] ? o["@graph"].find((x: { "@type": string }) => /JobPosting/.test(x["@type"])) : o;
          fields = `title="${short(p?.title, 50)}" org="${short(p?.hiringOrganization?.name, 30)}" place="${short(JSON.stringify(p?.jobLocation?.address ?? p?.jobLocation?.[0]?.address ?? ""), 80)}" posted=${p?.datePosted ?? "-"} until=${p?.validThrough ?? "-"}`;
        } catch {
          fields = "unparsable";
        }
      }
      log(`SM job page ${short(job, 120)}: ${res.status} · ${html.length} bytes · JSON-LD ${ld.length} · JobPosting ${posting ? "yes" : "no"} ${fields} · <title> ${short(html.match(/<title>([^<]*)/)?.[1], 80)}`);
    } catch (e) {
      log(`SM ${start}: error ${short((e as Error).message, 100)}`);
    }
  }
}

await workday().catch((e) => log(`WD error ${e.message}`));
await oracle().catch((e) => log(`OR error ${e.message}`));
await eightfold().catch((e) => log(`EF error ${e.message}`));
await sitemaps().catch((e) => log(`SM error ${e.message}`));
