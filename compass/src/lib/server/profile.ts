// Her profile (single row). Also converts it into the ranking profile.
import { eq } from "drizzle-orm";
import type { Contract } from "../core/extract";
import type { RankProfile } from "../core/rank";
import { netAnnualToGrossAnnual, MONTHS_PER_YEAR } from "../core/salary";
import type { DB } from "../db";
import { schema } from "../db";

export type Profile = typeof schema.profile.$inferSelect;
export type ProfilePatch = Partial<Omit<Profile, "id">>;

export async function getProfile(db: DB): Promise<Profile> {
  const row = await db.query.profile.findFirst({ where: eq(schema.profile.id, 1) });
  if (row) return row;
  await db.insert(schema.profile).values({ id: 1 }).onConflictDoNothing();
  return (await db.query.profile.findFirst({ where: eq(schema.profile.id, 1) }))!;
}

export async function updateProfile(db: DB, patch: ProfilePatch): Promise<Profile> {
  await getProfile(db);
  const p = { ...patch, updatedAt: new Date() };
  if (patch.minNetMonthly !== undefined) {
    p.minGrossAnnualEstimate = patch.minNetMonthly ? netAnnualToGrossAnnual(patch.minNetMonthly * MONTHS_PER_YEAR) : null;
  }
  await db.update(schema.profile).set(p).where(eq(schema.profile.id, 1));
  return getProfile(db);
}

export function toRankProfile(p: Profile): RankProfile {
  return {
    roles: p.roles,
    synonyms: p.synonyms,
    maxKm: p.maxKm,
    remoteOk: p.remoteOk,
    hours: p.hours,
    contracts: p.contracts as Contract[],
    minAnnualGross: p.minGrossAnnualEstimate,
    languages: p.languages,
    avoidKeywords: p.avoidKeywords,
    avoidCompanies: p.avoidCompanies,
    avoidSectors: p.avoidSectors,
  };
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
  for (const r of roles) for (const s of ROLE_SYNONYMS[r.trim().toLowerCase()] ?? []) out.add(s);
  for (const r of roles) out.delete(r);
  return [...out];
}
