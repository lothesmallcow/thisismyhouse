// A search typed on "Offerte": understood (core/query.ts), the recognised pieces applied as filters,
// the words found with the full-text index (server/search-index.ts), and the offers ordered by how well
// they match the search first, then by how well they suit the person.
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { hasWords, parseQuery, type ParsedQuery } from "../core/query";
import { filterWhere, type JobFilters } from "./jobs";
import { fold } from "../core/text";
import { matchExpression, searchIds } from "./search-index";

export type SearchMode = "tutte" | "vicine" | "alcune" | "parole";

/** The filters a typed search adds to the ones chosen on the page (what the page chose wins). */
export function filtersFromQuery(p: ParsedQuery, f: JobFilters): JobFilters {
  const out: JobFilters = { ...f };
  if (p.places.length) {
    out.places = p.places.map((x) => x.place);
    out.placesRemote = !!p.remote;
  }
  if (p.hours && !out.hours) out.hours = p.hours.value;
  // "da remoto": from home every day; "ibrido": some days at least.
  if (p.remote?.value === "remote" && !out.minSmartDays) out.minSmartDays = 5;
  else if (p.remote && !out.remote) out.remote = true;
  if (p.contracts.length) out.contracts = [...new Set([...(out.contracts ?? []), ...p.contracts.map((c) => c.value)])];
  if (p.types.length) out.types = [...new Set([...(out.types ?? []), ...p.types.map((t) => t.value)])];
  if (p.seniority && !out.seniority?.length) out.seniority = p.seniority.value === "junior" ? ["junior", "stage"] : [p.seniority.value];
  if (p.noExperience && out.maxYears == null) out.maxYears = 1;
  if (p.protectedCategories) out.protectedOnly = true;
  if (p.noAgencies) out.noAgencies = true;
  if (p.benefits.length) out.benefits = [...new Set([...(out.benefits ?? []), ...p.benefits.map((b) => b.value)])];
  out.excludes = p.excludes.map((e) => e.word);
  return out;
}

export interface SearchResult {
  /** Offer ids in order, for this page. */
  ids: number[];
  total: number;
  /** How the words were matched: all of them (role in the title), the role anywhere, some of them. */
  mode: SearchMode;
  parsed: ParsedQuery;
}

/**
 * Run a typed search for one person. Filters chosen on the page apply on top. Strict first (every word,
 * the role in the title); if nothing matches, the role anywhere in the offer; then any of the words.
 */
export async function runSearch(db: DB, userId: number, q: string, f: JobFilters, limit: number, now = new Date()): Promise<SearchResult> {
  const parsed = parseQuery(q);
  const base = filtersFromQuery(parsed, { ...f, q: undefined });
  const uj = schema.userJobs;
  const j = schema.jobs;
  const visible = async (ids: number[] | undefined) =>
    db
      .select({ id: j.id, fit: uj.fit, title: j.title })
      .from(uj)
      .innerJoin(j, eq(j.id, uj.jobId))
      .where(filterWhere(userId, { ...base, ids }, now))
      .limit(5000);

  if (!hasWords(parsed)) {
    // Only filters ("part-time Milano"): every offer they allow, best fit first.
    const rows = (await visible(undefined)).sort((a, b) => b.fit - a.fit);
    return { ids: rows.slice(0, limit).map((r) => r.id), total: rows.length, mode: "tutte", parsed };
  }

  for (const mode of ["strict", "relaxed", "any"] as const) {
    const expr = matchExpression(parsed, mode);
    if (!expr) break;
    const hits = await searchIds(db, expr);
    if (hits == null) {
      // No full-text index: words in titles and companies.
      const rows = await db
        .select({ id: j.id, fit: uj.fit })
        .from(uj)
        .innerJoin(j, eq(j.id, uj.jobId))
        .where(filterWhere(userId, { ...base, q: parsed.concepts.map((c) => c.label).join(" ") }, now))
        .limit(5000);
      rows.sort((a, b) => b.fit - a.fit);
      return { ids: rows.slice(0, limit).map((r) => r.id), total: rows.length, mode: "parole", parsed };
    }
    if (!hits.length) continue;
    const rows = await visible(hits.map((h) => h.id));
    if (!rows.length) continue;
    // How well it matches the search (its place among the matches), then how well it suits them.
    const pos = new Map(hits.map((h, i) => [h.id, i]));
    const n = hits.length;
    // The words as typed, in the title, count more than their other names ("sales manager" over "direttore delle vendite").
    const typed = parsed.concepts.map((c) => fold(c.label).replace(/"/g, ""));
    const inTitle = (t: string) => (typed.length ? typed.filter((w) => fold(t).includes(w)).length / typed.length : 0);
    const score = (r: { id: number; fit: number; title: string }) => (1 - (pos.get(r.id) ?? n) / n) * 0.45 + inTitle(r.title) * 0.3 + (r.fit / 100) * 0.25;
    rows.sort((a, b) => score(b) - score(a));
    return { ids: rows.slice(0, limit).map((r) => r.id), total: rows.length, mode: mode === "strict" ? "tutte" : mode === "relaxed" ? "vicine" : "alcune", parsed };
  }
  return { ids: [], total: 0, mode: "tutte", parsed };
}

/** The offers of a search result, in its order, as the person sees them. */
export async function jobsByIds(db: DB, userId: number, ids: number[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ j: schema.jobs, uj: schema.userJobs })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(and(eq(schema.userJobs.userId, userId), inArray(schema.jobs.id, ids)));
  const at = new Map(ids.map((id, i) => [id, i]));
  return rows.map((r) => ({ ...r.j, ...r.uj, id: r.j.id })).sort((a, b) => (at.get(a.id) ?? 0) - (at.get(b.id) ?? 0));
}

export const searchCount = async (db: DB, userId: number, q: string, f: JobFilters, now = new Date()) => (await runSearch(db, userId, q, f, 0, now)).total;
