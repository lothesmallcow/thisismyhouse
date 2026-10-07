// Live check of job sources (run on GitHub Actions, which can reach them). Prints counts, public job
// titles and page structure only; writes nothing.
//   npx tsx scripts/probe-boards.ts   (on GitHub: any change to this file runs .github/workflows/compass-probe.yml)
// Round 15: how Teamtailor lists offers (the markup around a job link), what a Factorial career page
// carries (Next.js data, job links), and where Intervieweb's announcement page gets its list.
const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompassJobsBot/1.0; +https://github.com/lothesmallcow/thisismyhouse)", Accept: "text/html,application/json;q=0.9,*/*;q=0.5" };
const short = (s: unknown, n = 100) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
const log = (...a: unknown[]) => console.log(...a);
const get = async (url: string) => {
  const r = await fetch(url, { headers: UA, redirect: "follow" });
  return { status: r.status, type: r.headers.get("content-type") ?? "", body: await r.text() };
};

// Teamtailor: the list markup
for (const host of ["above.teamtailor.com", "aabenbryg.teamtailor.com"]) {
  const r = await get(`https://${host}/jobs`);
  const i = r.body.search(/href="[^"]*\/jobs\/\d+-/);
  log(`TT ${host} list ${r.status}: around first job link: ${short(r.body.slice(Math.max(0, i - 200), i + 900).replace(/\s+/g, " "), 1100)}`);
  const s = await get(`https://${host}/sitemap.xml`);
  log(`TT ${host} sitemap ${s.status}: ${(s.body.match(/<loc>/g) ?? []).length} locs · e.g. ${short([...s.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/jobs\/\d/.test(u)).slice(0, 2).join(" | "), 200)}`);
  const rss = await get(`https://${host}/jobs.rss`);
  log(`TT ${host} jobs.rss ${rss.status} ${short(rss.type, 30)} · ${(rss.body.match(/<item>/g) ?? []).length} items · ${short(rss.body.match(/<item>[\s\S]{0,400}/)?.[0], 400)}`);
}

// Factorial: Next.js data and job links
for (const host of ["adaptingsocial.factorialhr.com", "absoluteinternship.factorialhr.com", "careers.factorialhr.com"]) {
  const r = await get(`https://${host}/`);
  const next = r.body.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const links = [...new Set([...r.body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => /job|posting|vacan|offert/i.test(h)))];
  log(`FA ${host} ${r.status} · ${r.body.length} bytes · NEXT_DATA ${next ? next.length + " chars, keys " + short(Object.keys(JSON.parse(next)?.props?.pageProps ?? {}).join(","), 200) : "no"} · links ${short(links.slice(0, 5).join(" | "), 300)}`);
  const pd = next ? JSON.stringify(JSON.parse(next)?.props?.pageProps ?? {}) : "";
  const m = pd.match(/"(?:jobPostings|job_postings|postings|jobs)":\[[\s\S]{0,500}/);
  if (m) log(`FA ${host} postings: ${short(m[0], 500)}`);
}

// Intervieweb: inline scripts of the announcement page
{
  const r = await get("https://enav.intervieweb.it/annunci.php");
  const inline = [...r.body.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  const addrs = [...new Set([...inline.matchAll(/["'`]([^"'`\s]*(?:\.php|ajax|api|json|module=|annunc)[^"'`\s]*)["'`]/gi)].map((m) => m[1]))].slice(0, 30);
  log(`IW annunci.php ${r.status} · inline js ${inline.length} chars · addresses: ${short(addrs.join(" | "), 1200)}`);
  const visible = r.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  log(`IW annunci.php text: ${short(visible, 600)}`);
  const anchors = [...new Set([...r.body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))].slice(0, 30);
  log(`IW annunci.php links: ${short(anchors.join(" | "), 1200)}`);
}
export {};
