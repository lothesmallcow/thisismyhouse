// Web scraping of companies' own career pages ("Lavora con noi"): from the company's website to its
// careers page, then the job postings (schema.org JobPosting, which most career sites publish for
// search engines). Always through the PoliteFetcher: robots.txt, one request every 5 s per site, no
// job platforms. Few pages per company, so a click stays within a minute.
import { parse } from "node-html-parser";
import type { RawJob } from "../../core/normalize";
import { extractJobsFromHtml, jobLinks } from "./jsonld";
import type { PoliteFetcher } from "./polite-fetch";
import type { AtsType } from "../ats";

/** Job boards with an official public feed, recognised from a link on the company's site. */
const ATS_LINKS: [AtsType, RegExp][] = [
  ["greenhouse", /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/i],
  ["lever", /jobs\.lever\.co\/([a-z0-9_.-]+)/i],
  ["ashby", /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/i],
  ["smartrecruiters", /(?:jobs|careers)\.smartrecruiters\.com\/([a-z0-9_-]+)/i],
  ["workable", /apply\.workable\.com\/([a-z0-9_-]+)/i],
  ["personio", /\/\/([a-z0-9-]+)\.jobs\.personio\.(?:de|com)/i],
];
const NOT_SLUGS = new Set(["embed", "api", "v1", "j", "jobs", "careers", "www"]);

/** The company's job board, when its site links to one (links, iframes, scripts). */
export function atsFromHtml(html: string): { ats: AtsType; slug: string } | null {
  for (const [ats, re] of ATS_LINKS) {
    const m = html.match(re);
    if (m && !NOT_SLUGS.has(m[1].toLowerCase())) return { ats, slug: decodeURIComponent(m[1]) };
  }
  return null;
}

const CAREER_WORDS = /(career|carrier|lavora[\s_-]*con[\s_-]*noi|work[\s_-]*with[\s_-]*us|join[\s_-]*(us|the[\s_-]*team)|\bjobs?\b|opportunit|posizioni[\s_-]*aperte|offerte[\s_-]*di[\s_-]*lavoro|talent|recruit|karriere|emploi|recrutement)/i;
const FALLBACK_PATHS = ["/careers", "/lavora-con-noi"];

/** "www.example.com" or "https://example.com/it" → "https://example.com/it". */
export function siteUrl(website: string): string | null {
  const w = website.trim();
  if (!w) return null;
  try {
    return new URL(/^https?:\/\//i.test(w) ? w : `https://${w}`).href;
  } catch {
    return null;
  }
}

/** The careers link of a home page: the first link whose address or text says careers. */
export function careersLink(html: string, pageUrl: string): string | null {
  const base = new URL(pageUrl);
  for (const a of parse(html).querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("#")) continue;
    const text = a.text.replace(/\s+/g, " ").trim().slice(0, 60);
    try {
      const u = new URL(href, base);
      if (!/^https?:$/.test(u.protocol)) continue;
      if (CAREER_WORDS.test(u.pathname + " " + u.host.split(".")[0]) || CAREER_WORDS.test(text)) {
        u.hash = "";
        return u.href;
      }
    } catch {
      /* bad href */
    }
  }
  return null;
}

export interface CareersResult {
  careersUrl: string | null;
  /** The official job board the site links to: read through its feed instead of scraping pages. */
  ats: { ats: AtsType; slug: string } | null;
  jobs: RawJob[];
  pages: number;
}

/**
 * From a website (or a careers page found before) to the job postings. Stops at `deadline`.
 * Errors (robots disallow, 403/429, timeouts) end this company's turn, never the whole run.
 */
export async function scrapeCareers(polite: PoliteFetcher, start: { website?: string | null; careersUrl?: string | null }, now: Date, deadline: number, maxJobPages = 3): Promise<CareersResult> {
  const out: CareersResult = { careersUrl: start.careersUrl ?? null, ats: null, jobs: [], pages: 0 };
  const time = () => Date.now() < deadline;
  const get = async (url: string) => {
    out.pages++;
    return (await polite.get(url)).body;
  };
  try {
    let page: { url: string; body: string } | null = null;
    if (out.careersUrl) page = { url: out.careersUrl, body: await get(out.careersUrl) };
    else {
      const site = start.website ? siteUrl(start.website) : null;
      if (!site) return out;
      const home = await get(site);
      out.ats = atsFromHtml(home);
      if (out.ats) return out;
      const link = careersLink(home, site);
      if (link && time()) page = { url: link, body: await get(link) };
      for (const path of link ? [] : FALLBACK_PATHS) {
        if (!time()) break;
        const url = new URL(path, site).href;
        try {
          page = { url, body: await get(url) };
          break;
        } catch {
          /* not there */
        }
      }
      if (page) out.careersUrl = page.url;
    }
    if (!page) return out;
    out.ats = atsFromHtml(page.body);
    if (out.ats) return out;
    out.jobs = extractJobsFromHtml(page.body, page.url, now);
    if (out.jobs.length === 0) {
      for (const link of jobLinks(page.body, page.url, maxJobPages)) {
        if (!time()) break;
        try {
          out.jobs.push(...extractJobsFromHtml(await get(link), link, now));
        } catch {
          /* one page down: the next */
        }
      }
    }
  } catch {
    // robots.txt says no, the site blocked us, or it is down: nothing from this company today.
  }
  return out;
}
