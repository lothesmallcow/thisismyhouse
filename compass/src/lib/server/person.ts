// What the ranking needs to know about someone's background: years of work, CV text (for the
// requirements check), the sectors they worked in, and the sectors next to those (shared themes).
import { eq } from "drizzle-orm";
import { THEME_LABELS } from "../catalog/data";
import { workYears, type Person } from "../core/requirements";
import { fold } from "../core/text";
import type { RankProfile } from "../core/rank";
import type { DB } from "../db";
import { schema } from "../db";
import type { Profile } from "./profile";

export interface Background {
  person: Person;
  experienceSectors: RankProfile["experienceSectors"];
  /** Where they work now (from the timeline): never suggested, never contacted. */
  currentEmployers: string[];
}

export async function background(db: DB, userId: number, profile: Profile): Promise<Background> {
  const [exps, cvs, sectors, companies] = await Promise.all([
    db.select().from(schema.experiences).where(eq(schema.experiences.userId, userId)),
    db.select({ text: schema.cvs.text }).from(schema.cvs).where(eq(schema.cvs.userId, userId)),
    db.select().from(schema.catalogSectors).where(eq(schema.catalogSectors.source, "curato")),
    db.select({ id: schema.catalogCompanies.id, sectorId: schema.catalogCompanies.sectorId, extra: schema.catalogCompanies.extraSectorIds, themes: schema.catalogCompanies.themes }).from(schema.catalogCompanies).where(eq(schema.catalogCompanies.source, "curato")),
  ]);
  // Evidence only: the CV and the timeline. What they wish for (presentation, tastes) is not experience.
  const text = fold([...cvs.map((c) => c.text ?? ""), ...exps.map((e) => `${e.title} ${e.organization} ${e.description}`), profile.degree].join("\n"));
  const hasDegree = exps.some((e) => e.kind === "studio" && /laurea|degree|bachelor|master|mba/i.test(`${e.title} ${e.organization}`)) || /\blaurea (in|magistrale|triennale)|\bdegree in\b|bachelor|master of/.test(text);
  // The CV timeline counts first; without it, what they said in "La tua esperienza" / "Cosa fai ora?".
  const fromCv = workYears(exps);
  const sit = profile.situation;
  const person: Person = {
    years: fromCv || profile.yearsExperience == null ? fromCv : profile.yearsExperience,
    hasDegree: hasDegree || sit === "neolaureato" || sit === "magistrale",
    studying: sit ? sit === "superiori" || sit === "triennale" || sit === "magistrale" : profile.track === "stage",
    text,
  };

  // Sectors of past work (not studies), from the matched sector or the matched company.
  const byId = new Map(sectors.map((s) => [s.id, s]));
  const coById = new Map(companies.map((c) => [c.id, c]));
  const same = new Set<number>();
  const themes = new Map<string, number>();
  for (const e of exps) {
    if (e.kind === "studio") continue;
    const co = e.catalogCompanyId ? coById.get(e.catalogCompanyId) : undefined;
    const ids = co ? [co.sectorId, ...co.extra].filter((x): x is number => x != null) : e.sectorId ? [e.sectorId] : [];
    for (const id of ids) same.add(id);
    for (const th of [...(co?.themes ?? []), ...ids.flatMap((id) => byId.get(id)?.themes ?? [])]) themes.set(th, (themes.get(th) ?? 0) + 1);
  }
  const experienceSectors: Background["experienceSectors"] = [];
  for (const id of same) {
    const s = byId.get(id);
    if (s) experienceSectors.push({ name: s.name, keywords: s.keywords, relation: "same" });
  }
  // Nearby sectors: sharing a theme that is distinctive (not the generic "vendita"/"clienti"/"ufficio").
  const generic = new Set(["vendita", "clienti", "ufficio", "retail", "numeri", "made-in-italy", "food"]);
  const strong = [...themes.entries()].filter(([t]) => !generic.has(t)).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  for (const s of sectors) {
    if (same.has(s.id)) continue;
    const t = strong.find((th) => s.themes.includes(th));
    if (t) experienceSectors.push({ name: s.name, keywords: s.keywords, relation: "near", theme: THEME_LABELS[t as keyof typeof THEME_LABELS] ?? t });
  }
  const currentEmployers = [...new Set(exps.filter((e) => e.kind === "lavoro" && e.current && e.organization.trim().length > 1).map((e) => e.organization.trim()))];
  return { person, experienceSectors, currentEmployers };
}
