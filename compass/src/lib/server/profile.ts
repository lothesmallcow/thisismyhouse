// One profile per account. Also converts it (plus catalog choices) into the ranking profile.
import { isGenericRole, specificTitles, translations } from "../catalog/positions";
import { levelBracket } from "../core/search-code";
import { COUNTRIES } from "../core/geo";
import { eq } from "drizzle-orm";
import type { Contract } from "../core/extract";
import type { RankProfile } from "../core/rank";
import { netAnnualToGrossAnnual, MONTHS_PER_YEAR } from "../core/salary";
import type { DB } from "../db";
import { schema } from "../db";
import type { RankPrefs } from "./catalog";

export type Profile = typeof schema.profile.$inferSelect;
export type ProfilePatch = Partial<Omit<Profile, "id" | "userId">>;

export async function getProfile(db: DB, userId: number): Promise<Profile> {
  const row = await db.query.profile.findFirst({ where: eq(schema.profile.userId, userId) });
  if (row) return row;
  await db.insert(schema.profile).values({ userId }).onConflictDoNothing();
  return (await db.query.profile.findFirst({ where: eq(schema.profile.userId, userId) }))!;
}

export async function updateProfile(db: DB, userId: number, patch: ProfilePatch): Promise<Profile> {
  await getProfile(db, userId);
  const p = { ...patch, updatedAt: new Date() };
  if (patch.minNetMonthly !== undefined) {
    p.minGrossAnnualEstimate = patch.minNetMonthly ? netAnnualToGrossAnnual(patch.minNetMonthly * MONTHS_PER_YEAR) : null;
  }
  await db.update(schema.profile).set(p).where(eq(schema.profile.userId, userId));
  return getProfile(db, userId);
}

const NO_PREFS: RankPrefs = { likedSectors: [], avoidSectors: [], likedCompanies: [], avoidCompanies: [] };

export function toRankProfile(p: Profile, prefs: RankPrefs = NO_PREFS, bg: Pick<RankProfile, "person" | "experienceSectors" | "currentEmployers"> = { person: null, experienceSectors: [], currentEmployers: [] }): RankProfile {
  return {
    ...bg,
    weights: (p.fitWeights as RankProfile["weights"]) ?? null,
    priority: p.priority ?? "media",
    track: p.track,
    roles: p.roles,
    // The same roles in the languages of the countries they chose (and English, common everywhere).
    synonyms: [...new Set([...p.synonyms, ...p.roles.flatMap((r) => (isGenericRole(r) ? specificTitles(r, levelBracket(bg.person?.years ?? null)) : [])), ...p.roles.flatMap((r) => translations(r, roleLanguages(p.countries)))])],
    maxKm: p.maxKm,
    remoteOk: p.remoteOk,
    hours: p.hours,
    contracts: p.contracts as Contract[],
    minAnnualGross: p.minGrossAnnualEstimate,
    languages: p.languages,
    avoidKeywords: p.avoidKeywords,
    avoidCompanies: [...p.avoidCompanies, ...prefs.avoidCompanies],
    avoidSectors: p.avoidSectors,
    likedSectors: prefs.likedSectors,
    avoidSectorTerms: prefs.avoidSectors,
    likedCompanies: prefs.likedCompanies,
    studyYear: p.studyYear,
    degreeYears: p.degreeYears,
    graduationYear: p.graduationYear,
    situation: p.situation,
    workRights: p.workRights,
    extraPlaces: p.extraPlaces,
    paidOnly: p.paidOnly,
    countries: p.countries,
    regions: p.regions,
  };
}

/** Languages to search a role in: Italian plus those of the chosen countries, and English. */
export function roleLanguages(countries: string[]): ("it" | "en" | "de" | "fr")[] {
  return [...new Set(["it" as const, "en" as const, ...COUNTRIES.filter((c) => countries.includes(c.code)).map((c) => c.lang)])];
}

export function homeOf(p: Profile): { lat: number; lng: number } | null {
  return p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;
}

/** Suggested synonyms for common target roles (she confirms them in onboarding). */
export const ROLE_SYNONYMS: Record<string, string[]> = {
  "impiegata amministrativa": ["Addetta amministrazione", "Addetta contabilità", "Impiegata contabile", "Back office amministrativo", "Assistente amministrativa"],
  segretaria: ["Receptionist", "Addetta segreteria", "Front office", "Assistente di direzione", "Centralinista"],
  receptionist: ["Segretaria", "Front office", "Addetta accoglienza", "Centralinista"],
  "addetta vendite": ["Commessa", "Sales assistant", "Addetta al negozio", "Cassiera"],
  commessa: ["Addetta vendite", "Sales assistant", "Cassiera"],
  "operatrice call center": ["Addetta customer care", "Assistenza clienti", "Operatrice inbound"],
  "addetta customer care": ["Assistenza clienti", "Operatrice call center", "Customer service"],
  "impiegata contabile": ["Addetta contabilità", "Impiegata amministrativa", "Contabile"],
  "assistente amministrativa": ["Impiegata amministrativa", "Addetta segreteria amministrativa"],
  "data entry": ["Addetta inserimento dati", "Back office", "Impiegata d'ordine"],
};

export function suggestSynonyms(roles: string[]): string[] {
  const out = new Set<string>();
  // Generic roles first: the precise titles listings use ("venditrice moda" → "Client advisor"...).
  for (const r of roles) if (isGenericRole(r)) for (const t of specificTitles(r)) out.add(t);
  for (const r of roles) for (const s of ROLE_SYNONYMS[r.trim().toLowerCase()] ?? []) out.add(s);
  for (const r of roles) out.delete(r);
  return [...out];
}
