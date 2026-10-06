// The company of an offer that did not say it plainly (web search results, some alerts): from the
// title ("Analyst presso Banca X"), the link (LinkedIn's "…-at-intesa-sanpaolo-…"), or the first
// catalog company the title or the opening text names. The catalog's spelling wins when it matches.
import { and, eq, inArray, isNull } from "drizzle-orm";
import { companyFromTitle, companyFromUrl, firstKnownName, type KnownCompany } from "../core/company-names";
import type { DB } from "../db";
import { schema } from "../db";

type Known = KnownCompany & { website: string | null };
let cache: { at: number; list: Known[] } | null = null;

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

export async function guessCompany(db: DB, j: { title: string; url: string | null; description: string }): Promise<string | null> {
  const known = await knownCompanies(db);
  const fromTitle = companyFromTitle(j.title);
  if (fromTitle) return firstKnownName(fromTitle, known)?.name ?? fromTitle;
  const fromUrl = companyFromUrl(j.url);
  if (fromUrl) return firstKnownName(fromUrl, known)?.name ?? fromUrl;
  return firstKnownName(`${j.title}\n${j.description.slice(0, 800)}`, known)?.name ?? null;
}

/** Offers saved without a company: try again (once, at deploy). */
export async function backfillCompanies(db: DB): Promise<number> {
  const rows = await db.select({ id: schema.jobs.id, title: schema.jobs.title, description: schema.jobs.description }).from(schema.jobs).where(isNull(schema.jobs.company)).limit(5000);
  let fixed = 0;
  for (const r of rows) {
    const src = await db.query.jobSources.findFirst({ where: eq(schema.jobSources.jobId, r.id) });
    const name = await guessCompany(db, { title: r.title, url: src?.url ?? null, description: r.description });
    if (name) {
      await db.update(schema.jobs).set({ company: name }).where(eq(schema.jobs.id, r.id));
      fixed++;
    }
  }
  return fixed;
}
