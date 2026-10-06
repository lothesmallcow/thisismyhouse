// Which site's icon to show for each offer: the catalog company's website, else the offer's own
// link when it is on the company's site (not a job platform, an aggregator or a job board).
import { inArray } from "drizzle-orm";
import { nameKey } from "../core/company-names";
import type { DB } from "../db";
import { schema } from "../db";
import { AGGREGATOR_HOST, ATS_HOST } from "../pipeline/programmes";
import { PLATFORM_HOST } from "../sources/web/polite-fetch";

const host = (u: string | null | undefined) => {
  if (!u) return null;
  try {
    return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

export async function logoDomains(db: DB, jobs: { id: number; company: string | null }[]): Promise<Map<number, string>> {
  const ids = jobs.map((j) => j.id);
  const urlOf = new Map<number, string>();
  if (ids.length) for (const r of await db.select({ jobId: schema.jobSources.jobId, url: schema.jobSources.url }).from(schema.jobSources).where(inArray(schema.jobSources.jobId, ids))) if (r.url && !urlOf.has(r.jobId)) urlOf.set(r.jobId, r.url);
  const names = [...new Set(jobs.map((j) => j.company).filter((c): c is string => !!c))];
  const rows = names.length
    ? await db.select({ name: schema.catalogCompanies.name, website: schema.catalogCompanies.website }).from(schema.catalogCompanies).where(inArray(schema.catalogCompanies.name, names))
    : [];
  const byKey = new Map(rows.filter((r) => r.website).map((r) => [nameKey(r.name), host(r.website)]));
  const out = new Map<number, string>();
  for (const j of jobs) {
    const fromCatalog = j.company ? byKey.get(nameKey(j.company)) : null;
    const own = host(urlOf.get(j.id));
    const usable = own && !PLATFORM_HOST.test(own) && !AGGREGATOR_HOST.test(own) && !ATS_HOST.test(own) ? own : null;
    const d = fromCatalog ?? usable;
    if (d) out.set(j.id, d);
  }
  return out;
}
