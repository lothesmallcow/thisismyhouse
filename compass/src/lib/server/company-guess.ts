// The company of an offer that did not say it plainly (web search results, some alerts): from the
// title ("Analyst presso Banca X"), the link (LinkedIn's "…-at-intesa-sanpaolo-…"), a sentence of the
// text that states it, or the catalog companies the text names. The catalog's spelling wins when it matches.
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { dedupeKey } from "../core/dedupe";
import { EXPIRED_AD, type Eligibility } from "../core/extract";
import { fold } from "../core/text";
import { AGGREGATOR_HOST, firmFromUrl, pageCompanyClues } from "../core/page-company";
import { PLATFORM_HOST, type PoliteFetcher } from "../sources/web/polite-fetch";
import { pageText } from "../sources/web/programme-page";
import { catalogSpelling, companyFromText, companyFromTitle, companyFromUrl, firstKnownName, mostFrequentName, mostNamed, nameKey, type KnownCompany } from "../core/company-names";
import type { DB } from "../db";
import { schema } from "../db";

type Known = KnownCompany & { website: string | null };
let cache: { at: number; list: Known[]; byKey?: Map<string, Known> } | null = null;

/** Hand-made and listed companies (a few thousand), hand-made first; kept for an hour. */
export async function knownCompanies(db: DB): Promise<Known[]> {
  if (cache && Date.now() - cache.at < 3_600_000) return cache.list;
  const c = schema.catalogCompanies;
  const rows = await db.select({ id: c.id, name: c.name, aliases: c.aliases, website: c.website, source: c.source }).from(c).where(and(inArray(c.source, ["curato", "borsa"]), eq(c.shared, true)));
  const list = rows
    .sort((a, b) => (a.source === "curato" ? 0 : 1) - (b.source === "curato" ? 0 : 1))
    .map((r) => ({ id: r.id, name: r.name, website: r.website, aliases: Array.isArray(r.aliases) ? (r.aliases as string[]) : [] }));
  cache = { at: Date.now(), list };
  return list;
}

/** Forget the cached list (tests, catalog changes). */
export const resetKnownCompanies = () => (cache = null);

/**
 * The company of an offer that does not say it in its own field. In order: the title ("… presso X"),
 * the link, a sentence of the text that states it ("Azienda: X", "About X", "X is a leading…"), the
 * first catalog company in the title and opening lines, then the catalog company the whole text names
 * most. The catalog's spelling wins whenever it is the same company.
 */
export async function guessCompany(db: DB, j: { title: string; url: string | null; description: string; page?: string | null; avoid?: string[] }): Promise<string | null> {
  const known = await knownCompanies(db);
  const spelled = (name: string) => catalogSpelling(name, known)?.name ?? firstKnownName(name, known)?.name ?? name;
  const fromTitle = companyFromTitle(j.title);
  if (fromTitle) return spelled(fromTitle);
  const fromUrl = companyFromUrl(j.url);
  if (fromUrl) return spelled(fromUrl);
  const stated = companyFromText(j.description) ?? (j.page ? companyFromText(j.page) : null);
  if (stated && !(j.avoid ?? []).some((a) => nameKey(a) === nameKey(stated))) return spelled(stated);
  const opening = firstKnownName(`${j.title}\n${j.description.slice(0, 800)}`, known);
  if (opening) return opening.name;
  const named = mostNamed(`${j.title}\n${j.description}`, known);
  if (named) return named.name;
  // Last: the name the whole text (and the page, when we have it) repeats most.
  return mostFrequentName(`${j.description}\n${j.page ?? ""}`, known, { title: j.title, avoid: j.avoid });
}

/** The catalog's spelling of a company the source did name ("JPMorgan Chase" → the catalog's "J.P. Morgan"). */
export async function canonicalCompany(db: DB, name: string | null): Promise<string | null> {
  if (!name) return name;
  const list = await knownCompanies(db);
  if (!cache!.byKey) {
    const byKey = new Map<string, Known>();
    for (const c of list) for (const a of [c.name, ...c.aliases]) if (!byKey.has(compactName(a))) byKey.set(compactName(a), c);
    cache!.byKey = byKey;
  }
  return cache!.byKey.get(compactName(name))?.name ?? name;
}

const compactName = (s: string) => nameKey(s).replace(/ /g, "");

/**
 * Offers saved without a company: try again with the whole text; companies written another way than
 * the catalog: its spelling (so the same firm's ads meet). The dedupe key follows. Each deploy.
 */
export async function backfillCompanies(db: DB): Promise<number> {
  const j = schema.jobs;
  const rows = await db.select({ id: j.id, title: j.title, description: j.description, city: j.city }).from(j).where(isNull(j.company)).limit(5000);
  let fixed = 0;
  for (const r of rows) {
    const src = await db.query.jobSources.findFirst({ where: eq(schema.jobSources.jobId, r.id) });
    const name = await guessCompany(db, { title: r.title, url: src?.url ?? null, description: r.description });
    if (name) {
      await db.update(j).set({ company: name, dedupeKey: dedupeKey({ company: name, title: r.title, city: r.city }) }).where(eq(j.id, r.id));
      fixed++;
    }
  }
  const named = await db.selectDistinct({ company: j.company }).from(j).where(isNotNull(j.company));
  for (const { company } of named) {
    const spelled = await canonicalCompany(db, company);
    if (!company || spelled === company) continue;
    for (const r of await db.select({ id: j.id, title: j.title, city: j.city }).from(j).where(eq(j.company, company))) {
      await db.update(j).set({ company: spelled, dedupeKey: dedupeKey({ company: spelled, title: r.title, city: r.city }) }).where(eq(j.id, r.id));
      fixed++;
    }
  }
  return fixed;
}

/**
 * The company from the offer's own page: the clues in its code (structured data, site name, tab
 * title, logo, copyright, address) in the catalog's spelling when it is a catalog company, else the
 * first clear name; failing that, the names in the page's text.
 */
export async function companyFromPage(db: DB, html: string, url: string, title: string, description = ""): Promise<string | null> {
  const known = await knownCompanies(db);
  const clues = pageCompanyClues(html, url);
  for (const c of clues) {
    const hit = catalogSpelling(c, known) ?? firstKnownName(c, known);
    if (hit) return hit.name;
  }
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* no address */
  }
  const thirdParty = AGGREGATOR_HOST.test(host);
  const slug = firmFromUrl(url);
  const named = clues.find((c) => c !== slug && /[A-Z]/.test(c)); // a written name, not a bare web address
  if (named) return named;
  // The whole page: the name it repeats most (on a job site, never the site's own name).
  const siteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{2,60})["']/i)?.[1];
  const avoid = thirdParty ? [siteName ?? "", host.replace(/^www\./, "").split(".")[0]] : [];
  return guessCompany(db, { title, url, description, page: pageText(html, 40000).text, avoid });
}

/** Offers still without a company whose link is a page we may read (not a job platform): looked up once each.
 *  The same visit tells whether the page says the ad has expired. */
export async function lookUpMissingCompanies(db: DB, polite: PoliteFetcher, opts: { max: number; until: number; now: Date }): Promise<number[]> {
  const j = schema.jobs;
  const triedRow = await db.query.settings.findFirst({ where: eq(schema.settings.key, "company_lookup_tried_v2") });
  const tried = new Set<number>(Array.isArray(triedRow?.value) ? (triedRow.value as number[]) : []);
  const rows = await db
    .select({ id: j.id, title: j.title, city: j.city, description: j.description, eligibility: j.eligibility, url: schema.jobSources.url })
    .from(j)
    .innerJoin(schema.jobSources, eq(schema.jobSources.jobId, j.id))
    .where(and(isNull(j.company), isNotNull(schema.jobSources.url)))
    .limit(500);
  const fixed: number[] = [];
  const seen = new Set<number>();
  for (const r of rows) {
    if (seen.size >= opts.max || Date.now() >= opts.until) break;
    if (seen.has(r.id) || tried.has(r.id) || !r.url) continue;
    let host: string;
    try {
      host = new URL(r.url).hostname;
    } catch {
      continue;
    }
    if (PLATFORM_HOST.test(host) || polite.isBlocked(host)) continue; // job platforms are never fetched
    seen.add(r.id);
    tried.add(r.id);
    try {
      const { body } = await polite.get(r.url);
      const name = await companyFromPage(db, body, r.url, r.title, r.description);
      const expired = EXPIRED_AD.test(fold(pageText(body, 40000).text)) && !(r.eligibility as string[]).includes("scaduto");
      if (name || expired) {
        await db
          .update(j)
          .set({
            ...(name ? { company: name, dedupeKey: dedupeKey({ company: name, title: r.title, city: r.city }) } : {}),
            ...(expired ? { eligibility: [...(r.eligibility as Eligibility[]), "scaduto" as const] } : {}),
            updatedAt: opts.now,
          })
          .where(eq(j.id, r.id));
        fixed.push(r.id);
      }
    } catch {
      /* robots.txt says no, or the page is down: it stays without a company */
    }
  }
  const keep = [...tried].slice(-3000);
  await db.insert(schema.settings).values({ key: "company_lookup_tried_v2", value: keep }).onConflictDoUpdate({ target: schema.settings.key, set: { value: keep } });
  return fixed;
}
