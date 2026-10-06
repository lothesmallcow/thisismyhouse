// W1, search-engine discovery through an official search API (never scraped result pages).
// Results become THIN records (title, snippet, URL, domain). W1 never fetches pages from
// LinkedIn, Indeed or InfoJobs: she opens the link in her own browser.
// Provider: Tavily (free tier, no card). See docs/adr/0004-w1-search-provider.md.

import type { RawJob } from "../../core/normalize";
import { request, HttpError, type FetchLike } from "../http";
import { findPlace } from "../../core/geo";
import { fold } from "../../core/text";

export interface SearchQuery {
  q: string;
  includeDomains?: string[];
}

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  publishedAt: Date | null;
  /** The page's text as the search API read it (for the company and "expired"; not stored). */
  page?: string | null;
}

export interface SearchProvider {
  name: string;
  search(q: SearchQuery): Promise<SearchHit[]>;
}

export class TavilyProvider implements SearchProvider {
  name = "tavily";
  constructor(private fetchImpl: FetchLike, private apiKey: string) {}
  async search(q: SearchQuery): Promise<SearchHit[]> {
    const res = await request(this.fetchImpl, "https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        query: q.q,
        search_depth: "basic", // 1 credit per query
        max_results: 10,
        include_answer: false,
        include_raw_content: true, // the page's text: the company and "ad expired" are in it (same credit)
        ...(q.includeDomains?.length ? { include_domains: q.includeDomains } : {}),
      }),
    });
    if (!res.ok) throw new HttpError(res.status, "tavily");
    const data = (await res.json()) as { results?: { title: string; url: string; content: string; raw_content?: string | null; published_date?: string }[] };
    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content ?? "",
      publishedAt: r.published_date ? new Date(r.published_date) : null,
      page: r.raw_content ? r.raw_content.slice(0, 40000) : null,
    }));
  }
}

export const PLATFORM_DOMAINS = ["linkedin.com", "indeed.com", "infojobs.it"];

/**
 * Queries from her profile: each role on the three platforms (via include_domains, the
 * API equivalent of `site:`), plus open-web "lavora con noi" queries.
 */
export function buildQueries(roles: string[], city: string, max: number): SearchQuery[] {
  const out: SearchQuery[] = [];
  const r = roles.filter(Boolean).slice(0, 3);
  for (const role of r) {
    out.push({ q: `"${role}" ${city} offerta di lavoro`, includeDomains: ["linkedin.com"] });
    out.push({ q: `"${role}" ${city}`, includeDomains: ["it.indeed.com"] });
    out.push({ q: `"${role}" ${city}`, includeDomains: ["infojobs.it"] });
    out.push({ q: `"lavora con noi" ${role} ${city}` });
  }
  return out.slice(0, max);
}

/** Students: internships by interest and by chosen company (plain words, no quotes: these are not job titles). */
export function buildStudentQueries(terms: string[], companies: string[], city: string, max: number): SearchQuery[] {
  const out: SearchQuery[] = [];
  for (const c of companies.slice(0, 4)) {
    out.push({ q: `${c} internship ${city}`, includeDomains: ["linkedin.com"] });
    out.push({ q: `${c} stage ${city} candidatura` });
  }
  for (const t of terms.slice(0, 3)) {
    out.push({ q: `internship ${t} ${city}`, includeDomains: ["linkedin.com"] });
    out.push({ q: `stage ${t} ${city}`, includeDomains: ["it.indeed.com"] });
  }
  // Interleave companies and interests so a small cap still covers both.
  const a = out.filter((_, i) => i % 2 === 0);
  const b = out.filter((_, i) => i % 2 === 1);
  return [...a, ...b].slice(0, max);
}

/** Only pages that look like a single job ad, not search/listing pages. */
export function isJobPage(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com")) return /\/jobs\/view\//.test(u);
  if (u.includes("indeed.")) return /viewjob|[?&]jk=/.test(u);
  if (u.includes("infojobs.it")) return /\/of-[a-z0-9]{6,}/.test(u);
  return !/(\/search|\/jobs\?|\/offerte-lavoro\/?$|[?&]q=)/.test(u);
}

/** Job sites' own names at the end of a result title ("… | LinkedIn", "… - Indeed.com", "… - Reed.co.uk"). */
const SITE_SUFFIX =
  /\s*[|–—-]\s*(?:LinkedIn|Indeed(?:\.com)?|[A-Za-z]{2}\.indeed\.com|InfoJobs(?:\.it)?|Reed(?:\.co\.uk)?|Glassdoor|StepStone(?:\.[a-z.]+)?|Welcome to the Jungle|eFinancialCareers|Bright Network|Totaljobs|Monster(?:\.[a-z.]+)?|Jooble|Adzuna|Indeed Italia|Lavoro|Jobs|Careers)\s*$/i;
/** Parts that are not a company: the site, a generic word, a date. */
const NOT_COMPANY = /^(?:linkedin|indeed(?:\.com)?|infojobs|reed(?:\.co\.uk)?|glassdoor|stepstone|jobs?|careers?|lavoro|offerte?|offerta di lavoro|annuncio|full[- ]time|part[- ]time|stage|tirocinio|internship|remote|da remoto|ibrido|hybrid|\d{4})$/i;

/** A part of a title that is a place ("Milano, Lombardia", "London, England, United Kingdom", "Roma (RM)"). */
function isPlacePart(part: string): boolean {
  const first = part.split(/,|\(/)[0].trim();
  const p = findPlace(part) ?? findPlace(first);
  if (!p) return false;
  const f = (x: string) => fold(x).replace(/[^a-z]/g, "");
  // The part must BE the place (maybe with region/country after it), not merely contain one.
  return f(first) === f(p.name) || f(part) === f(p.name);
}

/**
 * Result titles as job sites write them, into title, company and place:
 * "Impiegata amministrativa - Rossi Srl - Torino | LinkedIn", "MUFG hiring DCM Intern in London, England | LinkedIn",
 * "Stage Asset Management SGR - Milano, Lombardia - Indeed.com" (no company: the place is not taken for one).
 */
export function parseResultTitle(raw: string): { title: string; company: string | null; location: string | null } {
  let t = raw.trim();
  for (let i = 0; i < 2; i++) t = t.replace(SITE_SUFFIX, "").trim();
  const hiring = t.match(/^(.+?) (?:sta assumendo|is hiring|hiring|assume|cerca)\s+(?:per\s+)?(.+?)(?:\s+(?:a|in)\s+(.+))?$/i);
  if (hiring && hiring[1].split(" ").length <= 6 && !/^(?:si|azienda|importante|nota|primaria|società|societa|cliente|we|our|the company|company)\b/i.test(hiring[1])) return { company: hiring[1].trim(), title: hiring[2].trim(), location: hiring[3]?.trim() ?? null };
  t = t.replace(/^offerta di lavoro:?\s*/i, "");
  const parts = t.split(/\s+[-–—|·]\s+/).map((x) => x.trim()).filter(Boolean);
  const title = parts.shift() ?? t;
  let company: string | null = null;
  const places: string[] = [];
  for (const part of parts) {
    if (NOT_COMPANY.test(part)) continue;
    if (isPlacePart(part)) places.push(part);
    else if (!company) company = part;
  }
  return { title, company, location: places.length ? places.join(", ") : null };
}

export function hitToRawJob(h: SearchHit): RawJob {
  const { title, company, location } = parseResultTitle(h.title);
  return {
    source: "w1",
    url: h.url, // as found: the company can be in the link ("…-at-intesa-sanpaolo-…"); it is cleaned when saved
    title,
    company,
    location,
    description: h.snippet,
    postedAt: h.publishedAt,
    thin: true,
    pageText: h.page ?? null,
  };
}

const SPONTANEOUS_CUE = /(lavora con noi|candidature spontanee|candidatura spontanea|invia(?:re)? (?:il tuo |il )?(?:cv|curriculum)|manda(?:re)? (?:il tuo )?(?:cv|curriculum))/i;

/**
 * A "lavora con noi" result on a company's own site that publishes an address for applications:
 * a CANDIDATE for the spontaneous-applications list (the admin approves it before any use).
 */
export function spontaneousSuggestion(h: SearchHit): { name: string; email: string; sourceUrl: string } | null {
  if (PLATFORM_DOMAINS.some((d) => new URL(h.url).hostname.endsWith(d))) return null;
  if (!SPONTANEOUS_CUE.test(h.snippet) && !SPONTANEOUS_CUE.test(h.title)) return null;
  const email = h.snippet.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0]?.replace(/\.$/, "").toLowerCase();
  if (!email || /^(no-?reply|privacy|dpo)@/.test(email)) return null;
  const name = h.title.replace(/^(lavora con noi|careers?|carriere|candidature)\s*[-–|:]\s*/i, "").split(/\s+[-–|]\s+/)[0].trim() || new URL(h.url).hostname;
  return { name, email, sourceUrl: h.url };
}
