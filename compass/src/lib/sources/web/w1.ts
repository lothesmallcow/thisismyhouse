// W1, search-engine discovery through an official search API (never scraped result pages).
// Results become THIN records (title, snippet, URL, domain). W1 never fetches pages from
// LinkedIn, Indeed or InfoJobs: she opens the link in her own browser.
// Provider: Tavily (free tier, no card). See docs/adr/0004-w1-search-provider.md.

import type { RawJob } from "../../core/normalize";
import { canonicalUrl } from "../../core/dedupe";
import { request, HttpError, type FetchLike } from "../http";

export interface SearchQuery {
  q: string;
  includeDomains?: string[];
}

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  publishedAt: Date | null;
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
        include_raw_content: false,
        ...(q.includeDomains?.length ? { include_domains: q.includeDomains } : {}),
      }),
    });
    if (!res.ok) throw new HttpError(res.status, "tavily");
    const data = (await res.json()) as { results?: { title: string; url: string; content: string; published_date?: string }[] };
    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content ?? "",
      publishedAt: r.published_date ? new Date(r.published_date) : null,
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

/** Only pages that look like a single job ad, not search/listing pages. */
export function isJobPage(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com")) return /\/jobs\/view\//.test(u);
  if (u.includes("indeed.")) return /viewjob|[?&]jk=/.test(u);
  if (u.includes("infojobs.it")) return /\/of-[a-z0-9]{6,}/.test(u);
  return !/(\/search|\/jobs\?|\/offerte-lavoro\/?$|[?&]q=)/.test(u);
}

/** "Impiegata amministrativa - Rossi Srl - Torino | LinkedIn" -> parts. */
export function parseResultTitle(raw: string): { title: string; company: string | null; location: string | null } {
  let t = raw.replace(/\s*[|–-]\s*(LinkedIn|Indeed(\.com)?|InfoJobs)\s*$/i, "").trim();
  const hiring = t.match(/^(.+?) (?:sta assumendo|is hiring|assume)\s+(?:per\s+)?(.+?)(?: a | in )(.+)$/i);
  if (hiring) return { company: hiring[1].trim(), title: hiring[2].trim(), location: hiring[3].trim() };
  const parts = t.split(/\s+[-–|]\s+/);
  if (parts.length >= 3) return { title: parts[0], company: parts[1], location: parts.slice(2).join(", ") };
  if (parts.length === 2) return { title: parts[0], company: parts[1], location: null };
  t = t.replace(/^offerta di lavoro:?\s*/i, "");
  return { title: t, company: null, location: null };
}

export function hitToRawJob(h: SearchHit): RawJob {
  const { title, company, location } = parseResultTitle(h.title);
  return {
    source: "w1",
    url: canonicalUrl(h.url),
    title,
    company,
    location,
    description: h.snippet,
    postedAt: h.publishedAt,
    thin: true,
  };
}
