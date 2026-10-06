// Early-careers programmes (spring weeks, insight days, internships) the way a careful person would
// find them: (1) the NAMES of the firms that run them, from public trackers (robots.txt respected,
// once a week, nothing else copied) and from web search; (2) each firm's OFFICIAL page or job board,
// read for the offer itself: dates, place, who it is for. Trackers are never the source of an offer.
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { nameKey, knownNamesIn, listedNamesIn, type KnownCompany } from "../core/company-names";
import type { CountryCode } from "../core/geo";
import type { RawJob } from "../core/normalize";
import { fold } from "../core/text";
import type { DB } from "../db";
import { schema } from "../db";
import { fetchAts, keepInCountries, type AtsType } from "../sources/ats";
import type { FetchLike } from "../sources/http";
import { scrapeCareers } from "../sources/web/careers";
import { PLATFORM_HOST, type PoliteFetcher } from "../sources/web/polite-fetch";
import { PROGRAMME_WORDS, programmeFromPage } from "../sources/web/programme-page";
import type { SearchProvider } from "../sources/web/w1";
import { bump, usageToday } from "./discover";

/** The recruiting cycle: from August, programmes of next year ("spring week 2027" in October 2026). */
export const cycleYear = (now: Date) => (now.getUTCMonth() >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear());

/** Public tracker pages: names only. Update the URLs when a site moves its pages. */
export function trackerPages(now: Date): { url: string; kind: string; country: CountryCode | null }[] {
  const y = cycleYear(now);
  return [
    { url: `https://the-trackr.com/blog/spring-week-timeline-${y}-when-uk-finance-firms-open-applications/`, kind: "spring week", country: "GB" },
    { url: "https://www.trakvia.de/en/tracker/investment-banking/spring-week", kind: "spring week", country: "GB" },
    { url: "https://gorizzume.co.uk/spring-weeks", kind: "spring week", country: "GB" },
    { url: "https://www.intervyo.co.uk/tracker/finance-spring-week", kind: "spring week", country: "GB" },
  ];
}

/** Aggregators and job boards: a page there gives names, never an offer. */
export const AGGREGATOR_HOST =
  /(^|\.)(the-trackr\.com|trakvia\.de|gorizzume\.co\.uk|intervyo\.co\.uk|brightnetwork\.co\.uk|targetjobs\.co\.uk|gradcracker\.com|efinancialcareers\.[a-z.]+|ratemyplacement\.co\.uk|higherin\.com|prospects\.ac\.uk|icasfoundation\.org\.uk|yourfinancejob\.[a-z.]+|wallstreetoasis\.com|reddit\.com|studysmarter\.[a-z.]+|builtin\.com|glassdoor\.[a-z.]+|indeed\.[a-z.]+|linkedin\.com|infojobs\.[a-z.]+|jooble\.[a-z.]+|adzuna\.[a-z.]+)$/i;

/** Job boards firms use for their own offers: an official source. */
export const ATS_HOST = /(^|\.)(tal\.net|myworkdayjobs\.com|greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com|personio\.(de|com)|successfactors\.(com|eu)|oraclecloud\.com|icims\.com|taleo\.net|avature\.net|eightfold\.ai|jobvite\.com|recruitee\.com|teamtailor\.com|breezy\.hr|intervieweb\.it|inrecruiting\.com)$/i;

/** The firm a job-board link belongs to: "rothschildandco.tal.net" → "rothschildandco", "job-boards.greenhouse.io/point72" → "point72". */
export function firmFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (/greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com/.test(host)) return first || null;
    if (ATS_HOST.test(host)) return host.split(".")[0].replace(/^(careers|jobs|www)$/, "") || null;
    return host.replace(/^(www|careers|jobs|career|en|uk)\./, "").split(".")[0];
  } catch {
    return null;
  }
}

/** Does this page belong to the firm? Its host or job-board slug contains a word of the firm's name. */
export function belongsTo(url: string, firm: string): boolean {
  const slug = fold(firmFromUrl(url) ?? "").replace(/[^a-z0-9]/g, "");
  if (!slug) return false;
  const words = nameKey(firm).split(" ").filter((w) => w.length >= 3 && w !== "and" && w !== "co");
  const joined = words.join("");
  return words.some((w) => slug.includes(w)) || (joined.length >= 3 && slug.includes(joined));
}

async function knownCompanies(db: DB): Promise<(KnownCompany & { website: string | null; careersUrl: string | null; ats: string | null; atsSlug: string | null })[]> {
  const c = schema.catalogCompanies;
  const rows = await db
    .select({ id: c.id, name: c.name, aliases: c.aliases, website: c.website, careersUrl: c.careersUrl, ats: c.ats, atsSlug: c.atsSlug })
    .from(c)
    .where(and(inArray(c.source, ["curato", "borsa"]), eq(c.shared, true)));
  return rows.map((r) => ({ ...r, aliases: Array.isArray(r.aliases) ? (r.aliases as string[]) : [] }));
}

/** Add or refresh the leads (names) seen on a page. Returns how many are new. */
export async function saveLeads(db: DB, names: { name: string; catalogCompanyId?: number | null }[], from: { host: string; kind: string; country: string | null }, now: Date): Promise<number> {
  let created = 0;
  for (const n of names) {
    const key = nameKey(n.name);
    if (key.length < 2) continue;
    const old = await db.query.programmeLeads.findFirst({ where: eq(schema.programmeLeads.nameKey, key) });
    if (old) {
      await db.update(schema.programmeLeads).set({ lastSeenAt: now, ...(n.catalogCompanyId && !old.catalogCompanyId ? { catalogCompanyId: n.catalogCompanyId } : {}) }).where(eq(schema.programmeLeads.id, old.id));
    } else {
      await db.insert(schema.programmeLeads).values({ nameKey: key, name: n.name.slice(0, 80), kind: from.kind, country: from.country, sourceHost: from.host, catalogCompanyId: n.catalogCompanyId ?? null, firstSeenAt: now, lastSeenAt: now });
      created++;
    }
  }
  return created;
}

/** Names from one listing page: catalog companies it mentions first (certain), then the names it lists. */
export async function leadsFromListing(db: DB, html: string, known?: KnownCompany[]): Promise<{ name: string; catalogCompanyId: number | null }[]> {
  const catalog = known ?? (await knownCompanies(db));
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const found: { name: string; catalogCompanyId: number | null }[] = knownNamesIn(text, catalog).map((c) => ({ name: c.name, catalogCompanyId: c.id }));
  const keys = new Set(found.map((f) => nameKey(f.name)));
  for (const name of listedNamesIn(html)) {
    const k = nameKey(name);
    if (!keys.has(k)) {
      keys.add(k);
      found.push({ name, catalogCompanyId: null as number | null });
    }
  }
  return found;
}

/** Once a week: read the trackers for the names of the firms with programmes. */
export async function refreshTrackerLeads(db: DB, polite: PoliteFetcher, now: Date): Promise<{ pages: number; names: number; created: number }> {
  const out = { pages: 0, names: 0, created: 0 };
  const known = await knownCompanies(db);
  for (const t of trackerPages(now)) {
    try {
      const html = (await polite.get(t.url)).body;
      out.pages++;
      const names = await leadsFromListing(db, html, known);
      out.names += names.length;
      out.created += await saveLeads(db, names, { host: new URL(t.url).host, kind: t.kind, country: t.country }, now);
    } catch {
      // robots.txt says no, the page moved or the site is down: the others still count.
    }
  }
  return out;
}

export interface ProgrammeDeps {
  polite: PoliteFetcher;
  fetchImpl: FetchLike;
  web: SearchProvider | null;
  now: Date;
  /** Countries the offers must be in (everyone's, for the daily run). */
  countries: CountryCode[];
  /** Web searches allowed today for this, at most. */
  searchCap: number;
  save: (jobs: RawJob[]) => Promise<void>;
}

const isProgrammeTitle = (t: string) => PROGRAMME_WORDS.test(fold(t));

/** One firm's programme offers, from its own job board, its careers site, or its official page found by search. */
export async function officialOffers(db: DB, lead: typeof schema.programmeLeads.$inferSelect, d: ProgrammeDeps): Promise<{ jobs: RawJob[]; url: string | null }> {
  const keep = keepInCountries(d.countries);
  const c = lead.catalogCompanyId ? await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.id, lead.catalogCompanyId) }) : null;
  if (c?.ats && c.atsSlug) {
    try {
      const jobs = (await fetchAts(d.fetchImpl, c.ats as AtsType, c.atsSlug, c.name, d.countries)).filter((j) => isProgrammeTitle(j.title));
      if (jobs.length) return { jobs, url: null };
    } catch {
      /* board down: try the site */
    }
  }
  if (c && (c.careersUrl || c.website)) {
    const r = await scrapeCareers(d.polite, c, d.now, Date.now() + 30_000);
    const jobs = r.jobs.filter((j) => isProgrammeTitle(j.title)).filter(keep).map((j) => ({ ...j, company: j.company || c.name }));
    if (jobs.length) return { jobs, url: r.careersUrl };
  }
  // The official page through web search: the firm's own site or its job board, never an aggregator.
  if (!d.web || (await usageToday(db, "w1-queries", d.now)) >= d.searchCap) return { jobs: [], url: null };
  await bump(db, "w1-queries", d.now);
  const hits = await d.web.search({ q: `${lead.name} ${lead.kind} ${cycleYear(d.now)} apply` }).catch(() => []);
  for (const h of hits.slice(0, 6)) {
    let host = "";
    try {
      host = new URL(h.url).hostname;
    } catch {
      continue;
    }
    if (AGGREGATOR_HOST.test(host) || PLATFORM_HOST.test(host) || !belongsTo(h.url, lead.name)) continue;
    try {
      const raw = programmeFromPage((await d.polite.get(h.url)).body, h.url, c?.name ?? lead.name, d.now);
      if (raw && keep(raw)) return { jobs: [raw], url: h.url };
    } catch {
      /* robots.txt or down: next result */
    }
  }
  return { jobs: [], url: null };
}

/** Read the official pages of the leads due a check: new ones first, then those not seen for a week. */
export async function verifyLeads(db: DB, d: ProgrammeDeps, max: number): Promise<{ checked: number; offers: number }> {
  const l = schema.programmeLeads;
  const week = new Date(d.now.getTime() - 7 * 86_400_000);
  const month = new Date(d.now.getTime() - 30 * 86_400_000);
  const due = await db
    .select()
    .from(l)
    .where(or(isNull(l.checkedAt), and(sql`${l.found} > 0`, lt(l.checkedAt, week)), lt(l.checkedAt, month)))
    .orderBy(sql`${l.checkedAt} is not null`, sql`${l.catalogCompanyId} is null`, asc(l.checkedAt))
    .limit(max);
  let offers = 0;
  for (const lead of due) {
    const r = await officialOffers(db, lead, d).catch(() => ({ jobs: [] as RawJob[], url: null }));
    if (r.jobs.length) await d.save(r.jobs);
    offers += r.jobs.length;
    await db.update(l).set({ checkedAt: d.now, found: r.jobs.length, ...(r.url ? { officialUrl: r.url } : {}) }).where(eq(l.id, lead.id));
  }
  return { checked: due.length, offers };
}

const CAREER_WORDS: Record<string, string> = {
  "investment-banking": "investment banking",
  "private-equity": "private equity",
  "venture-capital": "venture capital",
  "asset-management": "asset management",
  markets: "sales and trading",
  "corporate-finance": "corporate finance",
  "transaction-services": "transaction services",
  consulting: "strategy consulting",
  fintech: "fintech",
  "banche-assicurazioni": "banking",
  "ai-data": "data science",
  informatica: "software engineering",
  media: "marketing",
  economics: "economics",
};

/** Web searches for programmes that suit a student: by year (spring weeks early, summer internships later), career and country. */
export function programmeQueries(p: { careers: string[]; countries: CountryCode[]; stage: "primi-anni" | "penultimo" | "ultimo" | null }, now: Date, max = 3): string[] {
  const y = cycleYear(now);
  const words = (p.careers.map((c) => CAREER_WORDS[c]).filter(Boolean) as string[]).slice(0, 2);
  const careers = words.length ? words : ["finance"];
  const what = p.stage === "ultimo" ? `graduate programme ${y}` : p.stage === "penultimo" ? `summer internship ${y}` : `spring insight programme ${y} first year`;
  const where: Record<CountryCode, string> = { GB: "London", IT: "Milan", DE: "Frankfurt", FR: "Paris" };
  const out: string[] = [];
  for (const c of careers) for (const cc of p.countries.length ? p.countries : (["IT"] as CountryCode[])) out.push(`${what} ${c} ${where[cc]} apply`);
  if (p.countries.includes("IT") && p.stage !== "ultimo") out.push(`${p.stage === "penultimo" ? "stage estivo" : "insight day"} ${careers[0]} Milano ${y} studenti`);
  return [...new Set(out)].slice(0, max);
}

/**
 * Web search for programmes: official pages become offers, aggregator pages give names (leads). Each
 * query counts against the daily web-search cap shared with W1.
 */
export async function searchProgrammes(db: DB, queries: string[], d: ProgrammeDeps, until = Number.POSITIVE_INFINITY): Promise<{ queries: number; offers: number; leads: number }> {
  const out = { queries: 0, offers: 0, leads: 0 };
  if (!d.web) return out;
  for (const q of queries) {
    if (Date.now() >= until || (await usageToday(db, "w1-queries", d.now)) >= d.searchCap) break;
    await bump(db, "w1-queries", d.now);
    out.queries++;
    const hits = (await d.web.search({ q }).catch(() => [])).filter((h) => {
      try {
        return !PLATFORM_HOST.test(new URL(h.url).hostname);
      } catch {
        return false;
      }
    });
    // Different sites in parallel: each still at its own polite pace.
    await Promise.all(
      hits.slice(0, 5).map(async (h) => {
        const host = new URL(h.url).hostname;
        try {
          const html = (await d.polite.get(h.url)).body;
          if (AGGREGATOR_HOST.test(host)) {
            out.leads += await saveLeads(db, await leadsFromListing(db, html), { host, kind: /summer|stage estivo/.test(q) ? "summer internship" : "spring week", country: null }, d.now);
            return;
          }
          const firm = siteName(html) ?? firmFromUrl(h.url) ?? host;
          const raw = programmeFromPage(html, h.url, firm, d.now);
          if (raw && keepInCountries(d.countries)(raw)) {
            await d.save([raw]);
            out.offers++;
          }
        } catch {
          /* robots.txt or down: the other results */
        }
      }),
    );
  }
  return out;
}

/** The site's own name (og:site_name), the best guess of whose page it is. */
function siteName(html: string): string | null {
  const m = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,60})["']/i) ?? html.match(/<meta[^>]+content=["']([^"']{2,60})["'][^>]+property=["']og:site_name["']/i);
  return m ? m[1].trim() : null;
}
