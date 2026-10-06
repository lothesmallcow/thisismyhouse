// The company of an offer that did not say it plainly (web search results, some alerts): from the
// title ("Analyst presso Banca X"), the link (LinkedIn's "…-at-intesa-sanpaolo-…"), a sentence of the
// text that states it, or the catalog companies the text names. The catalog's spelling wins when it matches.
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { dedupeKey } from "../core/dedupe";
import { catalogSpelling, companyFromText, companyFromTitle, companyFromUrl, firstKnownName, mostNamed, nameKey, type KnownCompany } from "../core/company-names";
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
export async function guessCompany(db: DB, j: { title: string; url: string | null; description: string }): Promise<string | null> {
  const known = await knownCompanies(db);
  const spelled = (name: string) => catalogSpelling(name, known)?.name ?? firstKnownName(name, known)?.name ?? name;
  const fromTitle = companyFromTitle(j.title);
  if (fromTitle) return spelled(fromTitle);
  const fromUrl = companyFromUrl(j.url);
  if (fromUrl) return spelled(fromUrl);
  const stated = companyFromText(j.description);
  if (stated) return spelled(stated);
  const opening = firstKnownName(`${j.title}\n${j.description.slice(0, 800)}`, known);
  if (opening) return opening.name;
  return mostNamed(`${j.title}\n${j.description}`, known)?.name ?? null;
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
