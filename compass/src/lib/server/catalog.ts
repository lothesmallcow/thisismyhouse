// Catalog of sectors and companies, each person's choices ("Mi interessa" / "Da evitare"),
// entries added with "Altro", and rule-based suggestions ("Suggeriti per te").
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { COMPANIES, SECTORS, companyTrack } from "../catalog/data";
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
  });
  const haveCompanies = new Map((await db.select().from(schema.catalogCompanies)).map((r) => [r.slug, r]));
  const newCompanies = COMPANIES.filter((c) => !haveCompanies.has(slugify(c.name)));
  if (newCompanies.length) await db.insert(schema.catalogCompanies).values(newCompanies.map((c) => ({ slug: slugify(c.name), ...values(c), shared: true })));
  for (const c of COMPANIES) {
    const row = haveCompanies.get(slugify(c.name));
    if (!row || row.createdByUserId != null) continue;
    const v = values(c);
    if (JSON.stringify([row.extraSectorIds, row.themes, row.aliases, row.sectorId]) !== JSON.stringify([v.extraSectorIds, v.themes, v.aliases, v.sectorId])) {
      // City and ATS may have been edited by the admin: keep them.
      await db.update(schema.catalogCompanies).set({ extraSectorIds: v.extraSectorIds, themes: v.themes, aliases: v.aliases, sectorId: v.sectorId, kind: v.kind }).where(eq(schema.catalogCompanies.id, row.id));
    }
  }
}

const trackFilter = <T extends { track: unknown }>(col: T["track"], track: Track) => sql`${col} in (${track}, 'tutti')`;

/** What one person can see: shared entries, their own "Altro" entries, and anything they already chose. */
export async function listSectors(db: DB, userId: number, track: Track | "all" = "all"): Promise<Sector[]> {
  const mine = db.select({ id: schema.userPrefs.refId }).from(schema.userPrefs).where(and(eq(schema.userPrefs.userId, userId), eq(schema.userPrefs.kind, "sector")));
  const visible = or(eq(schema.catalogSectors.shared, true), eq(schema.catalogSectors.createdByUserId, userId), inArray(schema.catalogSectors.id, mine));
  return db
    .select()
    .from(schema.catalogSectors)
    .where(track === "all" ? visible : and(visible, trackFilter(schema.catalogSectors.track, track)))
    .orderBy(schema.catalogSectors.name);
}

export async function listCompanies(db: DB, userId: number, track: Track | "all" = "all"): Promise<Company[]> {
  const mine = db.select({ id: schema.userPrefs.refId }).from(schema.userPrefs).where(and(eq(schema.userPrefs.userId, userId), eq(schema.userPrefs.kind, "company")));
  const visible = or(eq(schema.catalogCompanies.shared, true), eq(schema.catalogCompanies.createdByUserId, userId), inArray(schema.catalogCompanies.id, mine));
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
      .values({ slug, name: clean, track, keywords: [], createdByUserId: userId, shared: false })
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
      .values({ slug, name: clean, kind: input.kind ?? "azienda", sectorId: input.sectorId ?? null, city: input.city?.trim() || null, track: "tutti", createdByUserId: userId, shared: false })
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
