// Catalog of sectors and companies, each person's choices ("Mi interessa" / "Da evitare"),
// entries added with "Altro", and rule-based suggestions ("Suggeriti per te").
import { and, desc, eq, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import listedData from "../../../data/world/companies.json";
import naceData from "../../../data/world/nace.json";
import { COMPANIES, SECTORS, companyTrack } from "../catalog/data";
import { gicsSector, listedAliases, naceKeywords, naceSector, type ListedRow, type NaceRow } from "../catalog/world";
import { sizeBand, type RegisterRecord } from "../catalog/registers";
import { findPlace, homeCountries, type CountryCode } from "../core/geo";
import { companyNameMatches } from "../core/rank";
import { fold } from "../core/text";
import type { DB } from "../db";
import { schema } from "../db";
import type { CompanyKind, Track } from "../db/schema";

export type Sector = typeof schema.catalogSectors.$inferSelect;
export type Company = typeof schema.catalogCompanies.$inferSelect;
export type Stance = "like" | "avoid";

export function slugify(s: string): string {
  return fold(s).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "voce";
}

/**
 * Insert curated entries that are missing (by slug) and refresh the curated fields of existing
 * ones (themes, words, extra sectors), so improvements to the catalog reach existing databases.
 * Entries added by people ("Altro") are never touched. Safe to run on every start and every seed.
 */
export async function ensureCatalog(db: DB): Promise<void> {
  const haveSectors = new Map((await db.select().from(schema.catalogSectors)).map((r) => [r.slug, r]));
  const newSectors = SECTORS.filter((s) => !haveSectors.has(s.slug));
  if (newSectors.length) await db.insert(schema.catalogSectors).values(newSectors.map((s) => ({ ...s, themes: s.themes ?? [], shared: true })));
  for (const s of SECTORS) {
    const row = haveSectors.get(s.slug);
    if (row && row.createdByUserId == null && (JSON.stringify(row.themes) !== JSON.stringify(s.themes ?? []) || JSON.stringify(row.keywords) !== JSON.stringify(s.keywords) || row.name !== s.name)) {
      await db.update(schema.catalogSectors).set({ themes: s.themes ?? [], keywords: s.keywords, name: s.name, track: s.track }).where(eq(schema.catalogSectors.id, row.id));
    }
  }
  const sectorIds = new Map((await db.select({ id: schema.catalogSectors.id, slug: schema.catalogSectors.slug }).from(schema.catalogSectors)).map((r) => [r.slug, r.id]));
  const values = (c: (typeof COMPANIES)[number]) => ({
    name: c.name,
    aliases: c.aliases ?? [],
    kind: c.kind,
    sectorId: sectorIds.get(c.sector) ?? null,
    extraSectorIds: (c.also ?? []).map((x) => sectorIds.get(x)).filter((x): x is number => x != null),
    themes: c.themes ?? [],
    city: c.city ?? null,
    track: companyTrack(c),
    ...placeOf(c.city ?? null),
  });
  const haveCompanies = new Map((await db.select().from(schema.catalogCompanies)).map((r) => [r.slug, r]));
  const newCompanies = COMPANIES.filter((c) => !haveCompanies.has(slugify(c.name)));
  if (newCompanies.length) await db.insert(schema.catalogCompanies).values(newCompanies.map((c) => ({ slug: slugify(c.name), ...values(c), shared: true })));
  for (const c of COMPANIES) {
    const row = haveCompanies.get(slugify(c.name));
    if (!row || row.createdByUserId != null) continue;
    const v = values(c);
    if (JSON.stringify([row.extraSectorIds, row.themes, row.aliases, row.sectorId]) !== JSON.stringify([v.extraSectorIds, v.themes, v.aliases, v.sectorId]) || row.region == null) {
      // City and ATS may have been edited by the admin: keep them (country and region follow the city).
      await db
        .update(schema.catalogCompanies)
        .set({ extraSectorIds: v.extraSectorIds, themes: v.themes, aliases: v.aliases, sectorId: v.sectorId, kind: v.kind, ...placeOf(row.city) })
        .where(eq(schema.catalogCompanies.id, row.id));
    }
  }
}

/** Country and region of a city ("Milano" → IT, Lombardia; "London" → GB, England). */
function placeOf(city: string | null): { country: string; region: string | null } {
  const p = city ? findPlace(city) : null;
  return { country: p?.country ?? "IT", region: p?.region ?? null };
}

const DIRECTORY_VERSION = `${(listedData as unknown[]).length}-${(naceData as unknown[]).length}-1`;

/**
 * The generated part of the catalog (ADR 0018): ~4,200 listed companies of Italy, the UK, Germany and
 * France and every NACE industry. Shown only when someone searches for them or chooses them.
 * Idempotent and fast to skip: a version stamp in settings says whether it is already loaded.
 */
export async function ensureDirectory(db: DB): Promise<{ companies: number; sectors: number; skipped: boolean }> {
  const stamp = await db.query.settings.findFirst({ where: eq(schema.settings.key, "directory_version") });
  if (stamp && stamp.value === DIRECTORY_VERSION) return { companies: 0, sectors: 0, skipped: true };
  const sectorRows = await db.select().from(schema.catalogSectors);
  const sectorBySlug = new Map(sectorRows.map((r) => [r.slug, r]));

  // Industries: NACE divisions, groups and classes (sections are only headings).
  const nace = (naceData as NaceRow[]).filter(([, level]) => level >= 2);
  const newSectors = nace
    .filter(([code]) => !sectorBySlug.has(`nace-${code}`))
    .map(([code, , it, en, de, fr]) => {
      const near = sectorBySlug.get(naceSector(code) ?? "");
      return {
        slug: `nace-${code}`,
        name: it.length > 90 ? `${it.slice(0, 87)}…` : it,
        track: "tutti" as const,
        keywords: [...naceKeywords(it, en), en.toLowerCase(), de.toLowerCase(), fr.toLowerCase()].filter((k) => k.length <= 60),
        themes: near?.themes ?? [],
        shared: true,
        source: "nace" as const,
        nace: code,
      };
    });
  for (let i = 0; i < newSectors.length; i += 200) await db.insert(schema.catalogSectors).values(newSectors.slice(i, i + 200));

  // Listed companies: skip any already in the catalog under the same name (curated entries win).
  const existing = await db.select({ slug: schema.catalogCompanies.slug, name: schema.catalogCompanies.name, aliases: schema.catalogCompanies.aliases }).from(schema.catalogCompanies);
  const slugs = new Set(existing.map((e) => e.slug));
  const names = existing.map((e) => ({ name: e.name, aliases: e.aliases }));
  const ids = new Map((await db.select({ id: schema.catalogSectors.id, slug: schema.catalogSectors.slug }).from(schema.catalogSectors)).map((r) => [r.slug, r.id]));
  const newCompanies = [];
  for (const [name, cc, city, sector, industry, website, size] of listedData as ListedRow[]) {
    const slug = slugify(`${name}-${cc}`);
    if (slugs.has(slug) || slugs.has(slugify(name))) continue;
    if (names.some((n) => companyNameMatches(name, n))) continue;
    slugs.add(slug);
    const map = sector || industry ? gicsSector(sector, industry) : { slug: "", kind: "azienda" as const };
    const p = city ? findPlace(city, {}) : null;
    newCompanies.push({
      slug,
      name,
      aliases: listedAliases(name),
      kind: map.kind,
      sectorId: ids.get(map.slug) ?? null,
      city: p?.country === cc ? p.name : city || null,
      country: cc,
      region: p?.country === cc ? p.region : null,
      website: website || null,
      industry: industry || sector || null,
      size: size >= 0 ? size : null,
      track: "tutti" as const,
      shared: true,
      source: "borsa" as const,
    });
  }
  for (let i = 0; i < newCompanies.length; i += 200) await db.insert(schema.catalogCompanies).values(newCompanies.slice(i, i + 200));
  await db
    .insert(schema.settings)
    .values({ key: "directory_version", value: DIRECTORY_VERSION })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: DIRECTORY_VERSION } });
  return { companies: newCompanies.length, sectors: newSectors.length, skipped: false };
}

export interface SearchScope {
  /** Only these countries (empty = anywhere). */
  countries?: string[];
  /** Only these regions, as "IT:Lombardia" (empty = the whole country). */
  regions?: string[];
  limit?: number;
}

/**
 * Search the whole catalog, generated part included, by name, alias, city or industry. Results in the
 * person's countries and regions only (that is what keeps the lists short and the searches cheap).
 */
export async function searchCompanies(db: DB, userId: number, q: string, scope: SearchScope = {}): Promise<Company[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_]/g, "")}%`;
  const c = schema.catalogCompanies;
  const visible = or(eq(c.shared, true), eq(c.createdByUserId, userId));
  const text = or(sql`lower(${c.name}) like ${like}`, sql`lower(${c.aliases}) like ${like}`, sql`lower(coalesce(${c.industry}, '')) like ${like}`, sql`lower(coalesce(${c.city}, '')) like ${like}`);
  const where = [visible, text];
  if (scope.countries?.length) where.push(inArray(c.country, scope.countries));
  const rows = await db
    .select()
    .from(c)
    .where(and(...where))
    .orderBy(sql`lower(${c.name}) like ${`${term}%`} desc`, sql`${c.source} in ('borsa', 'registro')`, sql`${c.size} is null`, desc(c.size), c.name)
    .limit(200);
  const inRegion = (r: Company) => !scope.regions?.length || !scope.regions.some((x) => x.startsWith(`${r.country}:`)) || scope.regions.includes(`${r.country}:${r.region}`);
  return rows.filter(inRegion).slice(0, scope.limit ?? 20);
}

/** Search every industry (hand-made sectors first, then NACE) in Italian, English, German or French. */
export async function searchSectors(db: DB, userId: number, q: string, limit = 15): Promise<Sector[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_]/g, "")}%`;
  const s = schema.catalogSectors;
  return db
    .select()
    .from(s)
    .where(and(or(eq(s.shared, true), eq(s.createdByUserId, userId)), or(sql`lower(${s.name}) like ${like}`, sql`lower(${s.keywords}) like ${like}`, sql`${s.nace} like ${`${term}%`}`)))
    .orderBy(sql`${s.source} = 'nace'`, sql`length(coalesce(${s.nace}, ''))`, s.name)
    .limit(limit);
}

/** Listed companies in some sectors and places, biggest first: the pool for suggestions and examples. */
export async function directoryPool(db: DB, sectorIds: number[], scope: SearchScope & { limit: number }): Promise<Company[]> {
  if (sectorIds.length === 0) return [];
  const c = schema.catalogCompanies;
  const where = [inArray(c.source, ["borsa", "registro"]), eq(c.shared, true), inArray(c.sectorId, sectorIds)];
  if (scope.countries?.length) where.push(inArray(c.country, scope.countries));
  const rows = await db.select().from(c).where(and(...where)).orderBy(desc(c.size), c.name).limit(scope.limit * 4);
  const regions = scope.regions ?? [];
  const inRegion = (r: Company) => !regions.some((x) => x.startsWith(`${r.country}:`)) || regions.includes(`${r.country}:${r.region}`);
  return rows.filter(inRegion).slice(0, scope.limit);
}

/** The countries a profile looks at: those chosen, else the home country (Italy). */
export function profileCountries(p: { countries: string[]; city?: string | null }): CountryCode[] {
  return homeCountries(p.countries, p.city);
}

const trackFilter = <T extends { track: unknown }>(col: T["track"], track: Track) => sql`${col} in (${track}, 'tutti')`;

/** What one person can see: shared entries, their own "Altro" entries, and anything they already chose. */
export async function listSectors(db: DB, userId: number, track: Track | "all" = "all"): Promise<Sector[]> {
  const mine = db.select({ id: schema.userPrefs.refId }).from(schema.userPrefs).where(and(eq(schema.userPrefs.userId, userId), eq(schema.userPrefs.kind, "sector")));
  // NACE industries are many: only shown when searched for or chosen.
  const visible = or(and(eq(schema.catalogSectors.shared, true), ne(schema.catalogSectors.source, "nace")), eq(schema.catalogSectors.createdByUserId, userId), inArray(schema.catalogSectors.id, mine));
  return db
    .select()
    .from(schema.catalogSectors)
    .where(track === "all" ? visible : and(visible, trackFilter(schema.catalogSectors.track, track)))
    .orderBy(schema.catalogSectors.name);
}

export async function listCompanies(db: DB, userId: number, track: Track | "all" = "all"): Promise<Company[]> {
  const mine = db.select({ id: schema.userPrefs.refId }).from(schema.userPrefs).where(and(eq(schema.userPrefs.userId, userId), eq(schema.userPrefs.kind, "company")));
  // Listed companies are thousands: only shown when searched for or chosen.
  const visible = or(and(eq(schema.catalogCompanies.shared, true), notInArray(schema.catalogCompanies.source, ["borsa", "registro"])), eq(schema.catalogCompanies.createdByUserId, userId), inArray(schema.catalogCompanies.id, mine));
  return db
    .select()
    .from(schema.catalogCompanies)
    .where(track === "all" ? visible : and(visible, trackFilter(schema.catalogCompanies.track, track)))
    .orderBy(sql`lower(${schema.catalogCompanies.name})`);
}

export interface Prefs {
  sectors: Map<number, Stance>;
  companies: Map<number, Stance>;
}

export async function getPrefs(db: DB, userId: number): Promise<Prefs> {
  const rows = await db.select().from(schema.userPrefs).where(eq(schema.userPrefs.userId, userId));
  return {
    sectors: new Map(rows.filter((r) => r.kind === "sector").map((r) => [r.refId, r.stance])),
    companies: new Map(rows.filter((r) => r.kind === "company").map((r) => [r.refId, r.stance])),
  };
}

/**
 * Replace one person's choices of one kind and stance with `ids` (only among `scope`, the entries
 * shown on the form, so choices made elsewhere are kept). A "like" removes an "avoid" and vice versa.
 */
export async function setPrefs(db: DB, userId: number, kind: "sector" | "company", stance: Stance, ids: number[], scope: number[]): Promise<void> {
  const keep = new Set(ids.filter((id) => scope.includes(id)));
  const current = await db.select().from(schema.userPrefs).where(and(eq(schema.userPrefs.userId, userId), eq(schema.userPrefs.kind, kind)));
  const remove = current.filter((r) => r.stance === stance && scope.includes(r.refId) && !keep.has(r.refId)).map((r) => r.id);
  if (remove.length) await db.delete(schema.userPrefs).where(inArray(schema.userPrefs.id, remove));
  for (const refId of keep) {
    await db
      .insert(schema.userPrefs)
      .values({ userId, kind, refId, stance })
      .onConflictDoUpdate({ target: [schema.userPrefs.userId, schema.userPrefs.kind, schema.userPrefs.refId], set: { stance } });
  }
}

export async function setPref(db: DB, userId: number, kind: "sector" | "company", refId: number, stance: Stance | null): Promise<void> {
  if (!stance) {
    await db.delete(schema.userPrefs).where(and(eq(schema.userPrefs.userId, userId), eq(schema.userPrefs.kind, kind), eq(schema.userPrefs.refId, refId)));
    return;
  }
  await db
    .insert(schema.userPrefs)
    .values({ userId, kind, refId, stance })
    .onConflictDoUpdate({ target: [schema.userPrefs.userId, schema.userPrefs.kind, schema.userPrefs.refId], set: { stance } });
}

/** "Altro": add a sector by name (reusing an entry with the same name) and mark it for this person. */
export async function addCustomSector(db: DB, userId: number, name: string, track: Track, stance: Stance = "like"): Promise<number | null> {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 80);
  if (clean.length < 2) return null;
  const slug = slugify(clean);
  let row = await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, slug) });
  if (!row) {
    [row] = await db
      .insert(schema.catalogSectors)
      .values({ slug, name: clean, track, keywords: [], createdByUserId: userId, shared: false, source: "altro" })
      .returning();
  }
  await setPref(db, userId, "sector", row.id, stance);
  return row.id;
}

/** "Altro": add a company (boutique, brand, ...) and mark it for this person. */
export async function addCustomCompany(
  db: DB,
  userId: number,
  input: { name: string; kind?: CompanyKind; sectorId?: number | null; city?: string | null },
  track: Track,
  stance: Stance = "like",
): Promise<number | null> {
  const clean = input.name.replace(/\s+/g, " ").trim().slice(0, 100);
  if (clean.length < 2) return null;
  const slug = slugify(clean);
  let row = await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.slug, slug) });
  if (!row) {
    [row] = await db
      .insert(schema.catalogCompanies)
      .values({ slug, name: clean, kind: input.kind ?? "azienda", sectorId: input.sectorId ?? null, city: input.city?.trim() || null, ...placeOf(input.city?.trim() || null), track: "tutti", createdByUserId: userId, shared: false, source: "altro" })
      .returning();
  }
  void track;
  await setPref(db, userId, "company", row.id, stance);
  return row.id;
}

// --- Ranking inputs ----------------------------------------------------------------------------

export interface RankPrefs {
  likedSectors: { name: string; keywords: string[] }[];
  avoidSectors: { name: string; keywords: string[] }[];
  likedCompanies: { name: string; aliases: string[] }[];
  avoidCompanies: string[];
}

export async function rankPrefs(db: DB, userId: number): Promise<RankPrefs> {
  const prefs = await db.select().from(schema.userPrefs).where(eq(schema.userPrefs.userId, userId));
  const sectorIds = prefs.filter((p) => p.kind === "sector").map((p) => p.refId);
  const companyIds = prefs.filter((p) => p.kind === "company").map((p) => p.refId);
  const sectors = sectorIds.length ? await db.select().from(schema.catalogSectors).where(inArray(schema.catalogSectors.id, sectorIds)) : [];
  const companies = companyIds.length ? await db.select().from(schema.catalogCompanies).where(inArray(schema.catalogCompanies.id, companyIds)) : [];
  const stanceOf = (kind: "sector" | "company", id: number) => prefs.find((p) => p.kind === kind && p.refId === id)?.stance;
  return {
    likedSectors: sectors.filter((s) => stanceOf("sector", s.id) === "like").map((s) => ({ name: s.name, keywords: s.keywords })),
    avoidSectors: sectors.filter((s) => stanceOf("sector", s.id) === "avoid").map((s) => ({ name: s.name, keywords: s.keywords })),
    likedCompanies: companies.filter((c) => stanceOf("company", c.id) === "like").map((c) => ({ name: c.name, aliases: c.aliases })),
    avoidCompanies: companies.filter((c) => stanceOf("company", c.id) === "avoid").flatMap((c) => [c.name, ...c.aliases]),
  };
}

/** Does this company name belong to a catalog entry (name or alias)? "Lazard Frères" matches "Lazard". */
export const companyMatches = companyNameMatches;

// Suggestions live in ./career (they need the whole interest profile).
export { suggestCompanies, type Suggestion } from "./career";

/** A link to search for the company's careers page (no URL is invented). */
export function careersSearchUrl(name: string, track: Track): string {
  const q = `${name} ${track === "stage" ? "careers internship" : "lavora con noi"}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
}

/** Browse the whole company list page by page (listed companies included), in the person's countries and regions. */
export async function browseCompanies(
  db: DB,
  userId: number,
  opts: SearchScope & { sectorId?: number | null; page?: number; perPage?: number },
): Promise<{ rows: Company[]; total: number }> {
  const c = schema.catalogCompanies;
  const where = [or(eq(c.shared, true), eq(c.createdByUserId, userId))];
  if (opts.countries?.length) where.push(inArray(c.country, opts.countries));
  if (opts.sectorId) where.push(or(eq(c.sectorId, opts.sectorId), sql`exists (select 1 from json_each(${c.extraSectorIds}) where value = ${opts.sectorId})`));
  // Regions: within a country that has chosen regions, only those regions (companies with no known region stay).
  for (const cc of new Set((opts.regions ?? []).map((r) => r.split(":")[0]))) {
    const names = (opts.regions ?? []).filter((r) => r.startsWith(`${cc}:`)).map((r) => r.slice(cc.length + 1));
    where.push(or(ne(c.country, cc), inArray(c.region, names), sql`${c.region} is null`));
  }
  const perPage = Math.min(100, opts.perPage ?? 30);
  const page = Math.max(1, opts.page ?? 1);
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(c).where(and(...where));
  const rows = await db
    .select()
    .from(c)
    .where(and(...where))
    .orderBy(sql`${c.source} in ('borsa', 'registro')`, sql`${c.size} is null`, desc(c.size), sql`lower(${c.name})`)
    .limit(perPage)
    .offset((page - 1) * perPage);
  return { rows, total: Number(n) };
}

/** Can this person see (and so choose) this entry? Shared entries, their own, and those they already chose. */
export async function canChoose(db: DB, userId: number, kind: "sector" | "company", id: number): Promise<boolean> {
  const t = kind === "sector" ? schema.catalogSectors : schema.catalogCompanies;
  const row = await db.select({ shared: t.shared, by: t.createdByUserId }).from(t).where(eq(t.id, id)).get();
  if (!row) return false;
  if (row.shared || row.by === userId) return true;
  const pref = await db.query.userPrefs.findFirst({ where: and(eq(schema.userPrefs.userId, userId), eq(schema.userPrefs.kind, kind), eq(schema.userPrefs.refId, id)) });
  return pref != null;
}

// --- Official company registers (ADR 0020) ----------------------------------------------------------

export interface RegisterFilters {
  /** Only these regions ("IT:Lombardia") or cities; empty = the whole country. */
  regions?: string[];
  cities?: string[];
  /** Only these NACE prefixes ("47", "14.1", "32.12"). */
  nace?: string[];
  /** Minimum head count (when the register gives it: SIRENE, plain CSV). */
  minEmployees?: number;
  /** Stop after this many companies. */
  limit?: number;
}

/**
 * Add companies from an official register to the catalog (source "registro"), in batches.
 * Same company twice (same register id) is skipped; companies already in the catalog under the
 * same name in the same country are skipped too (the hand-made or listed entry wins).
 */
export async function importRegister(db: DB, records: AsyncIterable<RegisterRecord> | Iterable<RegisterRecord>, f: RegisterFilters = {}): Promise<{ added: number; skipped: number }> {
  const ids = new Map((await db.select({ id: schema.catalogSectors.id, slug: schema.catalogSectors.slug }).from(schema.catalogSectors)).map((r) => [r.slug, r.id]));
  const known = new Set((await db.select({ name: schema.catalogCompanies.name, country: schema.catalogCompanies.country }).from(schema.catalogCompanies)).map((r) => `${r.country}|${fold(r.name).replace(/[^a-z0-9]/g, "")}`));
  const cities = new Set((f.cities ?? []).map((c) => fold(c)));
  const englishName: Record<string, string> = { IT: "Italy", GB: "United Kingdom", DE: "Germany", FR: "France" };
  let batch: (typeof schema.catalogCompanies.$inferInsert)[] = [];
  let added = 0;
  let skipped = 0;
  const flush = async () => {
    if (!batch.length) return;
    const rows = await db.insert(schema.catalogCompanies).values(batch).onConflictDoNothing().returning({ id: schema.catalogCompanies.id });
    added += rows.length;
    skipped += batch.length - rows.length;
    batch = [];
  };
  for await (const r of records) {
    if (f.limit && added + batch.length >= f.limit) break;
    if (f.minEmployees && (r.employees ?? 0) < f.minEmployees) {
      skipped++;
      continue;
    }
    if (f.nace?.length && !(r.nace && f.nace.some((p) => r.nace!.startsWith(p)))) {
      skipped++;
      continue;
    }
    const key = `${r.country}|${fold(r.name).replace(/[^a-z0-9]/g, "")}`;
    if (known.has(key)) {
      skipped++;
      continue;
    }
    const place = r.city ? findPlace(r.country === "IT" ? r.city : `${r.city}, ${englishName[r.country]}`) : null;
    const inCountry = place?.country === r.country ? place : null;
    if (cities.size && !(r.city && cities.has(fold(inCountry?.name ?? r.city)))) {
      skipped++;
      continue;
    }
    if (f.regions?.length && !(inCountry && f.regions.includes(`${r.country}:${inCountry.region}`))) {
      skipped++;
      continue;
    }
    known.add(key);
    const near = r.nace ? naceSector(r.nace) : null;
    batch.push({
      slug: `${slugify(r.name).slice(0, 60)}-${r.country.toLowerCase()}-${slugify(r.id || String(added + batch.length)).slice(0, 16)}`,
      name: r.name.slice(0, 120),
      aliases: [],
      kind: "azienda",
      sectorId: (near && ids.get(near)) || null,
      city: inCountry?.name ?? r.city,
      country: r.country,
      region: inCountry?.region ?? null,
      website: r.website,
      industry: r.industry ?? (r.nace ? naceLabel(r.nace) : null),
      size: sizeBand(r.employees),
      track: "tutti",
      shared: true,
      source: "registro",
    });
    if (batch.length >= 500) await flush();
  }
  await flush();
  return { added, skipped };
}

const NACE_LABELS = new Map((naceData as NaceRow[]).map(([code, , it]) => [code, it]));
/** Italian label of a NACE code, from the most precise level we know. */
export function naceLabel(code: string): string | null {
  for (let n = code.length; n >= 2; n--) {
    const l = NACE_LABELS.get(code.slice(0, n));
    if (l) return l;
  }
  return null;
}

/**
 * The register companies shipped with Compass (data/world/registers, built by
 * scripts/build-register-data.ts): ~950,000 live employers of Italy, the UK, Germany and France.
 * Loaded once per database (version stamp); `countries` limits it (e.g. ["IT"]).
 */
export async function ensureRegisters(db: DB, countries: string[] = ["IT", "GB", "DE", "FR"], log: (s: string) => void = () => {}): Promise<number> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const zlib = await import("node:zlib");
  let total = 0;
  for (const cc of countries) {
    const file = path.join(process.cwd(), "data/world/registers", `${cc.toLowerCase()}.json.gz`);
    if (!fs.existsSync(file)) continue;
    const version = `${cc}-${fs.statSync(file).size}`;
    const stampKey = `registers_${cc}`;
    const stamp = await db.query.settings.findFirst({ where: eq(schema.settings.key, stampKey) });
    if (stamp?.value === version) continue;
    const rows = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8")) as [string, string, string, string, number][];
    const records: RegisterRecord[] = rows.map(([name, id, city, nace, employees]) => ({ name, id, country: cc as RegisterRecord["country"], city: city || null, nace: nace || null, industry: null, employees: employees >= 0 ? employees : null, website: null }));
    const r = await importRegister(db, records);
    total += r.added;
    log(`${cc}: ${r.added} companies from the official registers`);
    await db.insert(schema.settings).values({ key: stampKey, value: version }).onConflictDoUpdate({ target: schema.settings.key, set: { value: version } });
  }
  return total;
}
