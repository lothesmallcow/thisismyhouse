// Every employer board the public web archive has seen. Common Crawl (commoncrawl.org, a non-profit)
// publishes an index of every address it crawled each month; asking it for "boards.greenhouse.io/*",
// "*.myworkdayjobs.com"… lists thousands of employers' boards at once, without a company list and
// without touching the employers' sites. The same method the nightly job indexes other apps run use.
import { request, BlockedError, type FetchLike } from "../http";
import { feedFromUrl, type Feed } from "./feeds";

/** Board addresses of the systems Compass can read in bulk (Oracle and Avature are searched, not indexed). */
export const CRAWL_PATTERNS = [
  "boards.greenhouse.io/*",
  "job-boards.greenhouse.io/*",
  "jobs.lever.co/*",
  "jobs.eu.lever.co/*",
  "jobs.ashbyhq.com/*",
  "apply.workable.com/*",
  "jobs.smartrecruiters.com/*",
  "*.recruitee.com",
  "*.jobs.personio.de",
  "*.myworkdayjobs.com",
  "*.teamtailor.com",
];

const INDEX = "https://index.commoncrawl.org";

/** The boards behind the addresses of one index page (one JSON object per line). */
export function feedsFromCdx(text: string): Feed[] {
  const out = new Map<string, Feed>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let url = "";
    try {
      url = (JSON.parse(line) as { url?: string }).url ?? "";
    } catch {
      continue;
    }
    const f = url ? feedFromUrl(url) : null;
    if (f && /^[\w.-]+(\/[\w.-]+)?$/.test(f.slug)) out.set(`${f.ats}:${f.slug.toLowerCase()}`, f);
  }
  return [...out.values()];
}

export interface CrawlResult {
  crawl: string;
  feeds: Feed[];
  pages: number;
  failed: number;
}

/**
 * Every board in the latest monthly crawl. One request at a time (the index is a shared public
 * service); a page that fails is skipped, a refusal (403/429) stops the run.
 */
export async function crawlFeeds(
  fetchImpl: FetchLike,
  opts: { maxPagesPerPattern?: number; patterns?: string[]; pauseMs?: number; sleep?: (ms: number) => Promise<void>; onError?: (what: string, e: unknown) => void } = {},
): Promise<CrawlResult> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  // A pause before each request, longer after a busy answer (the index asks callers to slow down).
  const get = async (url: string) => {
    await sleep(opts.pauseMs ?? 1500);
    const res = await request(fetchImpl, url, {}, { timeoutMs: 120_000, retries: 3, backoffMs: 10_000, sleep });
    if (!res.ok) throw new Error(`index answered ${res.status}`);
    return res.text();
  };
  const info = JSON.parse(await get(`${INDEX}/collinfo.json`)) as { id: string }[];
  const crawl = info[0]?.id;
  if (!crawl) throw new Error("Common Crawl: no crawl listed");
  const feeds = new Map<string, Feed>();
  let pages = 0;
  let failed = 0;
  for (const pattern of opts.patterns ?? CRAWL_PATTERNS) {
    const base = `${INDEX}/${crawl}-index?url=${encodeURIComponent(pattern)}&output=json&fl=url`;
    let n = 1;
    try {
      n = (JSON.parse(await get(`${base}&showNumPages=true`)) as { pages?: number }).pages ?? 1;
    } catch (e) {
      if (e instanceof BlockedError) throw e;
      opts.onError?.(`${pattern} pages`, e);
      failed++;
    }
    for (let p = 0; p < Math.min(n, opts.maxPagesPerPattern ?? 20); p++) {
      try {
        const text = await get(`${base}&page=${p}`);
        pages++;
        for (const f of feedsFromCdx(text)) feeds.set(`${f.ats}:${f.slug.toLowerCase()}`, f);
      } catch (e) {
        if (e instanceof BlockedError) throw e;
        opts.onError?.(`${pattern} page ${p}`, e);
        failed++;
      }
    }
  }
  return { crawl, feeds: [...feeds.values()], pages, failed };
}
