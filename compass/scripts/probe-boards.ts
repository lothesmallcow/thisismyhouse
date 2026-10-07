// Live check of the employer-board readers against real public boards (run on GitHub Actions, which
// can reach them): for each board, how many offers came back, a sample (public job titles only), or
// the error. Also how career sites publish their job lists (sitemaps, feeds). Prints counts and titles only.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 4: the filters of Workday boards without a "country" one; the RSS search feed of Avature
// career sites (fields, paging, keywords) and their job pages.
import { fetchEnterprise } from "../src/lib/sources/ats/enterprise";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0; +https://github.com/lothesmallcow/thisismyhouse)", Accept: "application/json, text/html;q=0.9, */*;q=0.5" };
const short = (s: unknown, n = 90) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);

async function readers() {
  // Workday boards without a "country" facet: what their filters are called and look like.
  for (const [host, site] of [["barclays.wd3.myworkdayjobs.com", "External_Career_Site_Barclays"], ["nvidia.wd5.myworkdayjobs.com", "NVIDIAExternalCareerSite"]]) {
    try {
      const r = await fetch(`https://${host}/wday/cxs/${host.split(".")[0]}/${site}/jobs`, { method: "POST", headers: { ...UA, "Content-Type": "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }) });
      type V = { id?: string; descriptor?: string; count?: number; facetParameter?: string; values?: V[] };
      const d = (await r.json()) as { total?: number; facets?: V[] };
      log(`WD ${host} total ${d.total}`);
      for (const f of d.facets ?? []) {
        const vals = f.values ?? [];
        log(`WD  ${f.facetParameter} (${vals.length}): ${vals.slice(0, 3).map((v) => `${short(v.descriptor, 30)}${v.facetParameter ? `[${v.facetParameter}]` : ""}${v.values ? `{${v.values.length}}` : ""}`).join(" | ")}`);
        for (const v of vals) {
          const inner = (v.values ?? []).filter((x) => /ital|milan|united kingdom|london/i.test(x.descriptor ?? "")).slice(0, 3);
          if (inner.length) log(`WD   nested ${v.facetParameter ?? f.facetParameter}/${short(v.descriptor, 25)}: ${inner.map((x) => `${short(x.descriptor, 40)}=${x.id} (${x.count})`).join(" | ")}`);
        }
        const hit = vals.filter((x) => /ital|milan|united kingdom|london/i.test(x.descriptor ?? "")).slice(0, 4);
        if (hit.length) log(`WD   hit: ${hit.map((x) => `${short(x.descriptor, 40)}=${x.id} (${x.count})`).join(" | ")}`);
      }
    } catch (e) {
      log(`WD ${host}: error ${short((e as Error).message, 120)}`);
    }
  }
  const boards: [Parameters<typeof fetchEnterprise>[1], string, string, string[]][] = [["workday", "citi.wd5.myworkdayjobs.com/2", "Citi", ["Analyst"]]];
  for (const [ats, slug, company, keywords] of boards) {
    const jobs = await fetchEnterprise(fetch, ats, slug, company, { keywords, countries: ["IT"], details: 1 });
    log(`R ${company} IT: ${jobs.length} · ${jobs.slice(0, 2).map((j) => `${short(j.title, 40)} @ ${short(j.location, 30)}`).join(" | ")}`);
  }
}

async function text(url: string) {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  return { status: res.status, url: res.url, body: await res.text() };
}

function pageFields(html: string) {
  const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)`, "i"))?.[1];
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return `title="${short(html.match(/<title[^>]*>([^<]*)/i)?.[1], 70)}" og:title="${short(meta("og:title"), 60)}" og:desc ${String(meta("og:description") ?? meta("description") ?? "").length} chars · JSON-LD ${ld.length} JobPosting ${ld.some((s) => /JobPosting/.test(s)) ? "yes" : "no"} · ${html.length} bytes`;
}

async function avature() {
  // The search feed (RSS) of Avature career sites: what an item carries, paging and keyword parameters.
  const feeds = ["https://careers.unicredit.eu/it_IT/jobsuche/SearchJobs/feed/", "https://jobs.enel.com/it_IT/careers/SearchJobs/feed/"];
  for (const base of feeds) {
    for (const q of ["", "?jobRecordsPerPage=100", "?search=analyst", "?keyword=analyst", "?listFilterMode=1&jobRecordsPerPage=50&jobOffset=0"]) {
      try {
        const f = await text(base + q);
        const items = [...f.body.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
        const titles = items.map((i) => short(i.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, ""), 40));
        log(`AV ${short(base, 60)}${q}: ${f.status} · ${/<rss|<feed/i.test(f.body) ? "rss" : `not rss (${short(f.body.replace(/<[^>]+>/g, " "), 80)})`} · ${items.length} items · ${titles.slice(0, 3).join(" | ")}`);
        if (!q && items[0]) log(`AV  item tags: ${[...new Set([...items[0].matchAll(/<([a-zA-Z:]+)[ >]/g)].map((m) => m[1]))].join(",")} · ${short(items[0].replace(/<description>[\s\S]*?<\/description>/, "<description>…</description>"), 400)} · desc ${items[0].match(/<description>([\s\S]*?)<\/description>/)?.[1]?.length ?? 0} chars`);
        if (!q && items[0]) {
          const link = items[0].match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
          if (link) {
            const p = await text(link);
            log(`AV  job page ${short(link, 100)} ${p.status}: ${pageFields(p.body)} · location-ish: ${short([...p.body.matchAll(/(?:Location|Sede|Standort|Città|City)[^<]{0,20}<\/[^>]+>\s*<[^>]+>([^<]{2,60})/gi)].slice(0, 3).map((m) => m[1]).join(" ; "), 160)}`);
          }
        }
      } catch (e) {
        log(`AV ${base}${q}: error ${short((e as Error).message, 120)}`);
      }
    }
  }
}

async function radancy() {
  try {
    const sm = await text("https://careers.pwc.com/sitemap.xml");
    const locs = [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]).filter((l) => /\/job\//.test(l));
    for (const u of locs.slice(0, 2)) {
      const p = await text(u);
      log(`RD ${short(u, 110)} ${p.status}: ${pageFields(p.body)} · data-* ${short([...p.body.matchAll(/data-(?:job-?id|org-?id|location|city|country)[^=]*="[^"]*"/gi)].slice(0, 5).map((m) => m[0]).join(" "), 200)}`);
    }
  } catch (e) {
    log(`RD error ${short((e as Error).message, 120)}`);
  }
}

await readers().catch((e) => log(`R error ${e.message}`));
await avature().catch((e) => log(`AV error ${e.message}`));
