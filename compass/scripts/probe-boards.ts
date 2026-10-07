// Live check of job sources (run on GitHub Actions, which can reach them). Prints counts, public job
// titles, robots.txt rules and page structure only; writes nothing.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 14 (13 again, the index asked with retries; what the Intervieweb page loads):
// Round 13: Italian companies' systems: Teamtailor, Intervieweb, inRecruiting (Zucchetti), Factorial,
// SuccessFactors. For each: robots.txt, where the job list is, a public feed or JSON, JobPosting data.
const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0; +https://github.com/lothesmallcow/thisismyhouse)", Accept: "text/html,application/json;q=0.9,*/*;q=0.5" };
const short = (s: unknown, n = 100) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);
async function get(url: string) {
  try {
    const r = await fetch(url, { headers: UA, redirect: "follow" });
    return { status: r.status, url: r.url, type: r.headers.get("content-type") ?? "", body: await r.text() };
  } catch (e) {
    return { status: 0, url, type: "", body: String((e as Error).message) };
  }
}
const ld = (html: string) => [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).filter((s) => /JobPosting/.test(s));

async function ccHosts(pattern: string, n: number, fallback: string[] = []): Promise<string[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const got = await ccHostsOnce(pattern, n);
    if (got.length) return got;
    await new Promise((r) => setTimeout(r, 8000));
  }
  return fallback;
}
async function ccHostsOnce(pattern: string, n: number): Promise<string[]> {
  try {
    const info = (await (await fetch("https://index.commoncrawl.org/collinfo.json", { headers: UA })).json()) as { id: string }[];
    const t = await (await fetch(`https://index.commoncrawl.org/${info[0].id}-index?url=${encodeURIComponent(pattern)}&output=json&fl=url&limit=3000`, { headers: UA })).text();
    const hosts = [...new Set(t.split("\n").map((l) => { try { return new URL((JSON.parse(l) as { url: string }).url).hostname; } catch { return ""; } }).filter((h) => h && !/^(www\.)?(teamtailor|factorialhr|intervieweb|inrecruiting)\./.test(h)))];
    return hosts.slice(0, n);
  } catch {
    return [];
  }
}

async function system(name: string, hosts: string[], candidates: (host: string) => string[], jobLink: RegExp) {
  log(`\n== ${name}: ${hosts.length} hosts (${hosts.slice(0, 6).join(", ")})`);
  let robotsShown = false;
  for (const host of hosts.slice(0, 4)) {
    if (!robotsShown) {
      const rb = await get(`https://${host}/robots.txt`);
      log(`${name} robots ${host} ${rb.status}: ${short(rb.body.split("\n").filter((l) => /^(user-agent|disallow|allow|sitemap|crawl-delay)/i.test(l.trim())).join(" ; "), 400)}`);
      robotsShown = true;
    }
    for (const u of candidates(host)) {
      const r = await get(u);
      const links = [...new Set([...r.body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => jobLink.test(h)))];
      const isJson = /json/.test(r.type) || /^\s*[[{]/.test(r.body);
      const isFeed = /<rss|<feed|<urlset|<sitemapindex/i.test(r.body);
      log(`${name} ${short(u, 90)} → ${r.status} ${short(r.type, 30)} · ${r.body.length} bytes${isJson ? " · JSON " + short(r.body, 160) : ""}${isFeed ? ` · feed (${(r.body.match(/<item>|<entry>|<url>/g) ?? []).length} items)` : ""} · job links ${links.length} e.g. ${short(links[0], 90)}`);
      if (links[0] && !isJson) {
        const jobUrl = links[0].startsWith("http") ? links[0] : new URL(links[0], r.url || u).toString();
        const p = await get(jobUrl);
        const j = ld(p.body)[0];
        let fields = "";
        if (j) {
          try {
            const o = JSON.parse(j.trim());
            const x = Array.isArray(o) ? o[0] : o["@graph"] ? o["@graph"].find((g: { "@type": string }) => /JobPosting/.test(g["@type"])) : o;
            fields = `title="${short(x?.title, 50)}" org="${short(x?.hiringOrganization?.name, 30)}" place="${short(JSON.stringify(x?.jobLocation?.address ?? x?.jobLocation?.[0]?.address ?? ""), 80)}" posted=${x?.datePosted ?? "-"} until=${x?.validThrough ?? "-"} desc=${String(x?.description ?? "").length}`;
          } catch {
            fields = "unparsable";
          }
        }
        log(`${name}   job page ${short(jobUrl, 100)} → ${p.status} · JobPosting ${j ? "yes " + fields : "no"} · <title> ${short(p.body.match(/<title[^>]*>([^<]*)/i)?.[1], 70)}`);
        break;
      }
    }
  }
}

// What the Intervieweb page loads: its scripts and any address that looks like data.
{
  const r = await get("https://enav.intervieweb.it/");
  const scripts = [...r.body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const urls = [...new Set([...r.body.matchAll(/["'](\/?[\w./?=&-]*(?:api|ajax|json|xml|annunci|jobs|module=)[\w./?=&%-]*)["']/gi)].map((m) => m[1]))].slice(0, 25);
  log(`IW page scripts: ${short(scripts.join(" | "), 500)}`);
  log(`IW data-looking addresses: ${short(urls.join(" | "), 900)}`);
  log(`IW visible text: ${short(r.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " "), 400)}`);
  for (const u of ["https://enav.intervieweb.it/annunci.php", "https://enav.intervieweb.it/app.php?module=iframeAnnunci", "https://enav.intervieweb.it/jobs.xml", "https://enav.intervieweb.it/feed", "https://enav.intervieweb.it/sitemap.xml", "https://enav.intervieweb.it/it/annunci"]) {
    const x = await get(u);
    log(`IW ${u} → ${x.status} ${short(x.type, 30)} ${x.body.length} bytes · ${short(x.body.replace(/<[^>]+>/g, " "), 160)}`);
  }
}
const tt = await ccHosts("*.teamtailor.com", 40, ["above.teamtailor.com", "aabenbryg.teamtailor.com"]);
await system("Teamtailor", tt.filter((h) => /\.(teamtailor)\.com$/.test(h)), (h) => [`https://${h}/jobs`, `https://${h}/jobs.rss`, `https://${h}/jobs.json`], /\/jobs\/\d+/);
const iw: string[] = []; // looked at above
await system("Intervieweb", iw, (h) => [`https://${h}/`, `https://${h}/annunci/`, `https://${h}/jobs/`], /annunci|job|offert|lavora/i);
const ir = await ccHosts("*.inrecruiting.com", 40);
await system("inRecruiting", ir, (h) => [`https://${h}/`, `https://${h}/jobs`, `https://${h}/it/jobs`], /job|annunc|position|offert/i);
const fa = await ccHosts("*.factorialhr.com", 40, ["absoluteinternship.factorialhr.com", "campmanyabogados.factorialhr.com"]);
await system("Factorial", fa, (h) => [`https://${h}/`, `https://${h}/jobs`], /job_posting|jobs\/|job-posting/i);
const sf = await ccHosts("career*.successfactors.eu", 40);
await system("SuccessFactors", sf, (h) => [`https://${h}/`], /career\?|jobReqId|job_req/i);
export {};
