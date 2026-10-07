// Live check of the employer-board readers against real public boards (run on GitHub Actions, which
// can reach them): for each board, how many offers came back, a sample (public job titles only), or
// the error. Also how career sites publish their job lists (sitemaps, feeds). Prints counts and titles only.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 3: the readers themselves with country targeting (Workday facets, Oracle country codes and
// details); Avature career sites (robots.txt, sitemaps, RSS feed, job pages); Radancy job pages.
import { fetchEnterprise } from "../src/lib/sources/ats/enterprise";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0; +https://github.com/lothesmallcow/thisismyhouse)", Accept: "application/json, text/html;q=0.9, */*;q=0.5" };
const short = (s: unknown, n = 90) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);

async function readers() {
  const boards: [Parameters<typeof fetchEnterprise>[1], string, string, string[]][] = [
    ["workday", "barclays.wd3.myworkdayjobs.com/External_Career_Site_Barclays", "Barclays", ["Analyst"]],
    ["workday", "citi.wd5.myworkdayjobs.com/2", "Citi", ["Analyst"]],
    ["workday", "nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", "NVIDIA", ["Engineer"]],
    ["oracle", "jpmc.fa.oraclecloud.com/CX_1001", "J.P. Morgan", ["Analyst"]],
  ];
  for (const [ats, slug, company, keywords] of boards) {
    for (const countries of [["IT"], ["GB"]] as ("IT" | "GB")[][]) {
      try {
        const t = Date.now();
        const jobs = await fetchEnterprise(fetch, ats, slug, company, { keywords, countries, details: 2 });
        const full = jobs.filter((j) => !j.thin);
        log(`R ${ats} ${company} ${countries[0]}: ${jobs.length} offers in ${Date.now() - t} ms · full ${full.length} (desc ${full.map((j) => (j.description ?? "").length).join("/")}, closes ${full.map((j) => j.hints?.closesAt?.toISOString().slice(0, 10) ?? "-").join("/")}) · ${jobs.slice(0, 4).map((j) => `${short(j.title, 40)} @ ${short(j.location, 40)}`).join(" | ")}`);
      } catch (e) {
        log(`R ${ats} ${company} ${countries[0]}: error ${short((e as Error).message, 120)}`);
      }
    }
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
  for (const site of ["https://careers.unicredit.eu", "https://jobs.enel.com"]) {
    try {
      const robots = await text(`${site}/robots.txt`);
      const lines = robots.body.split("\n").filter((l) => /^(sitemap|disallow|crawl-delay)/i.test(l.trim()));
      log(`AV ${site} robots ${robots.status}: ${short(lines.join(" ; "), 400)}`);
      const sitemaps = lines.filter((l) => /^sitemap/i.test(l)).map((l) => l.split(/:\s*/).slice(1).join(":").trim());
      const jobUrls: string[] = [];
      for (const sm of sitemaps.slice(0, 2)) {
        const idx = await text(sm);
        const locs = [...idx.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
        log(`AV sitemap ${sm}: ${idx.status} · ${locs.length} locs · ${locs.slice(0, 3).map((l) => short(l, 110)).join(" | ")}`);
        for (const sub of /<sitemapindex/i.test(idx.body) ? locs.slice(0, 13) : []) {
          const s = await text(sub);
          const inner = [...s.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
          const kinds = [...new Set(inner.map((l) => l.replace(site, "").split("/").slice(0, 4).join("/")))].slice(0, 4);
          log(`AV  sub ${short(sub, 100)}: ${inner.length} locs · paths ${kinds.join(" , ")}`);
          jobUrls.push(...inner.filter((l) => /JobDetail/i.test(l)));
        }
      }
      log(`AV ${site} JobDetail urls ${jobUrls.length} · e.g. ${jobUrls.slice(0, 3).map((l) => short(l, 130)).join(" | ")}`);
      for (const path of ["/it_IT/jobsuche/SearchJobs/feed/", "/it_IT/careers/SearchJobs/feed/", "/en_US/careers/SearchJobs/feed/", "/careers/SearchJobs/feed/"]) {
        const f = await text(site + path);
        const items = [...f.body.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g)];
        log(`AV feed ${path}: ${f.status} · ${/<rss|<feed/i.test(f.body) ? "rss" : "not rss"} · ${items.length} items · ${items.slice(0, 2).map((m) => `${short(m[1].replace(/<!\[CDATA\[|\]\]>/g, ""), 50)} → ${short(m[2], 90)}`).join(" | ")}`);
      }
      if (jobUrls[0]) {
        const p = await text(jobUrls[0]);
        log(`AV job page ${p.status}: ${pageFields(p.body)}`);
      }
    } catch (e) {
      log(`AV ${site}: error ${short((e as Error).message, 120)}`);
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
await radancy().catch((e) => log(`RD error ${e.message}`));
