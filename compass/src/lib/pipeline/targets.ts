// The companies whose job boards and career pages are read for one person: those they chose, then
// EVERY company of the sectors their positions belong to ("Investment banking analyst" → every
// investment bank and advisory boutique in their countries), biggest first. Companies they avoid
// and where they work now (discreet search) are never included.
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { findPosition } from "../catalog/positions";
import { homeCountries } from "../core/geo";
import { companyNameMatches } from "../core/rank";
import type { DB } from "../db";
import { schema } from "../db";
import { prioritizedCompanies } from "../server/career";
import { getPrefs, type Company } from "../server/catalog";
import { background } from "../server/person";
import { getProfile } from "../server/profile";

/** Per sector and country: enough for many clicks in rotation, few enough to stay cheap. */
const PER_SECTOR = 60;

export async function searchTargets(db: DB, userId: number): Promise<Company[]> {
  const profile = await getProfile(db, userId);
  const [prefs, picks, bg] = await Promise.all([getPrefs(db, userId), prioritizedCompanies(db, userId), background(db, userId, profile)]);
  const countries = homeCountries(profile.countries, profile.city);
  // The sectors of the positions searched, plus the sectors chosen.
  const fromRoles = [...profile.roles, ...profile.synonyms].map((r) => findPosition(r)?.sector).filter((s): s is string => Boolean(s));
  const liked = [...prefs.sectors.entries()].filter(([, v]) => v === "like").map(([id]) => id);
  const s = schema.catalogSectors;
  const sectorRows = await db
    .select({ id: s.id })
    .from(s)
    .where(or(fromRoles.length ? inArray(s.slug, [...new Set(fromRoles)]) : sql`0`, liked.length ? inArray(s.id, liked) : sql`0`));
  const c = schema.catalogCompanies;
  const readable = or(isNotNull(c.website), isNotNull(c.careersUrl), isNotNull(c.ats));
  const perSector = await Promise.all(
    sectorRows.slice(0, 16).flatMap(({ id }) => [
      ...countries.map((cc) => db.select().from(c).where(and(eq(c.sectorId, id), eq(c.country, cc), eq(c.shared, true), readable)).orderBy(desc(c.size)).limit(PER_SECTOR)),
      // Global firms of the hand-made list (no city: Goldman Sachs, McKinsey...) hire in every country.
      db.select().from(c).where(and(eq(c.sectorId, id), eq(c.source, "curato"), isNull(c.city), readable)).limit(PER_SECTOR),
    ]),
  );
  const avoided = new Set([...prefs.companies.entries()].filter(([, v]) => v === "avoid").map(([id]) => id));
  const mine = (co: Company) => bg.currentEmployers.some((name) => companyNameMatches(name, co));
  const seen = new Set<number>();
  return [...picks.map((p) => p.company), ...perSector.flat()].filter((co) => !avoided.has(co.id) && !mine(co) && !seen.has(co.id) && seen.add(co.id));
}
