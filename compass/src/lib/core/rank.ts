// Explainable, rule-based ranking. Every point comes from a named factor with an Italian
// reason, so the level shown to her ("Molto adatta", "Adatta", "Poco adatta") can always be
// explained, and the admin can see the full breakdown.

import type { Contract, Hours, LanguageReq, Remote } from "./extract";
import { normalizeCompany } from "./dedupe";
import { fold, keyTokens } from "./text";

export type Level = "molto" | "adatta" | "poco";

export const LEVEL_LABELS: Record<Level, string> = {
  molto: "Molto adatta",
  adatta: "Adatta",
  poco: "Poco adatta",
};

export interface RankProfile {
  roles: string[]; // target role titles
  synonyms: string[]; // approved synonyms
  maxKm: number;
  remoteOk: boolean;
  hours: "full" | "part" | "any";
  contracts: Contract[]; // accepted; empty = any
  minAnnualGross: number | null; // floor, estimate from her net monthly
  languages: { language: string; level: "base" | "buono" | "fluente" }[];
  avoidKeywords: string[];
  avoidCompanies: string[];
  avoidSectors: string[];
}

export interface RankJob {
  title: string;
  company: string | null;
  description: string;
  sector: string | null;
  distanceKm: number | null;
  remote: Remote;
  hours: Hours;
  contract: Contract;
  minAnnualGross: number | null;
  maxAnnualGross: number | null;
  languages: LanguageReq[];
  postedAt: Date | null;
  scamFlagCount: number;
}

/** An adjustment created by "Non mi interessa" (or by the admin). Visible and undoable. */
export interface RankAdjustment {
  id: number;
  kind: "company" | "keyword" | "role" | "distance" | "salary";
  value: string; // company name, keyword, role word, km cap, or annual gross floor
  label: string;
}

export interface Factor {
  key: string;
  points: number;
  reason: string; // short Italian reason
}

export interface RankResult {
  score: number;
  level: Level;
  reasons: string[]; // 1-2 reasons shown to her
  factors: Factor[]; // full breakdown for admin
}

export const THRESHOLDS = { molto: 45, adatta: 15 };

/** Words too generic to count as "similar role" on their own. */
const GENERIC_ROLE_WORDS = new Set(["addett", "operat", "operator", "assistent", "responsabil", "collaborator", "junior", "senior", "stagist", "tirocinant", "specialist", "figura", "risorsa"]);

const LANGUAGE_RANK = { base: 0, richiesto: 1, buono: 1, fluente: 2 } as const;

function containsPhrase(haystackTokens: string[], phrase: string): boolean {
  const p = keyTokens(phrase);
  if (p.length === 0) return false;
  for (let i = 0; i + p.length <= haystackTokens.length; i++) {
    if (p.every((w, j) => haystackTokens[i + j] === w)) return true;
  }
  return false;
}

export function rankJob(job: RankJob, profile: RankProfile, adjustments: RankAdjustment[] = [], now = new Date()): RankResult {
  const f: Factor[] = [];
  const titleT = keyTokens(job.title);
  const descT = keyTokens(job.description);
  const titleAndDesc = fold(`${job.title} ${job.description}`);

  // 1. Role match
  const wanted = [...profile.roles, ...profile.synonyms].filter(Boolean);
  if (wanted.length > 0) {
    const exact = wanted.find((r) => containsPhrase(titleT, r));
    if (exact) f.push({ key: "role", points: 40, reason: `È il lavoro che cerchi (${exact.toLowerCase()})` });
    else {
      const words = new Set(wanted.flatMap((r) => keyTokens(r)).filter((w) => w.length > 3 && !GENERIC_ROLE_WORDS.has(w)));
      const overlap = titleT.filter((w) => words.has(w)).length;
      if (overlap > 0) f.push({ key: "role", points: 20, reason: "Simile al lavoro che cerchi" });
      else if (wanted.some((r) => containsPhrase(descT, r))) f.push({ key: "role", points: 8, reason: "Il tuo lavoro è citato nell'annuncio" });
      else f.push({ key: "role", points: -10, reason: "Non è proprio il lavoro che cerchi" });
    }
  }

  // 2. Distance / remote
  const kmCap = Math.min(
    profile.maxKm,
    ...adjustments.filter((a) => a.kind === "distance").map((a) => Number(a.value)).filter((n) => n > 0),
  );
  if (job.remote === "remote" && profile.remoteOk) f.push({ key: "distance", points: 18, reason: "Si lavora da casa" });
  else if (job.distanceKm != null) {
    const km = Math.round(job.distanceKm);
    if (km <= Math.max(3, kmCap / 2)) f.push({ key: "distance", points: 20, reason: km <= 1 ? "Vicinissima a casa" : `A ${km} km da casa` });
    else if (km <= kmCap) f.push({ key: "distance", points: 10, reason: `A ${km} km da casa` });
    else f.push({ key: "distance", points: -25, reason: `Lontana: ${km} km da casa` });
    if (job.remote === "hybrid" && profile.remoteOk) f.push({ key: "remote", points: 5, reason: "In parte da casa" });
  }

  // 3. Salary vs floor (unknown = neutral)
  const floor = Math.max(
    profile.minAnnualGross ?? 0,
    ...adjustments.filter((a) => a.kind === "salary").map((a) => Number(a.value)).filter((n) => n > 0),
  );
  if (floor > 0 && job.maxAnnualGross != null) {
    if (job.maxAnnualGross >= floor) f.push({ key: "salary", points: 10, reason: "Stipendio in linea con quello che chiedi" });
    else f.push({ key: "salary", points: -20, reason: "Stipendio sotto il tuo minimo" });
  }

  // 4. Hours
  if (profile.hours !== "any" && job.hours !== "unknown") {
    if (job.hours === profile.hours) f.push({ key: "hours", points: 10, reason: job.hours === "part" ? "Part-time come vuoi tu" : "Tempo pieno come vuoi tu" });
    else f.push({ key: "hours", points: -15, reason: job.hours === "part" ? "È part-time" : "È a tempo pieno" });
  }

  // 5. Contract
  if (profile.contracts.length > 0 && job.contract !== "unknown") {
    if (profile.contracts.includes(job.contract)) f.push({ key: "contract", points: job.contract === "indeterminato" ? 8 : 5, reason: job.contract === "indeterminato" ? "Contratto a tempo indeterminato" : "Contratto che accetti" });
    else f.push({ key: "contract", points: -15, reason: "Tipo di contratto che non cerchi" });
  }

  // 6. Recency
  if (job.postedAt) {
    const days = (now.getTime() - job.postedAt.getTime()) / 86400000;
    if (days <= 3) f.push({ key: "recency", points: 8, reason: "Pubblicata da poco" });
    else if (days > 30) f.push({ key: "recency", points: -10, reason: "Annuncio vecchio di oltre un mese" });
  }

  // 7. Languages
  for (const req of job.languages) {
    const mine = profile.languages.find((l) => l.language === req.language);
    const need = LANGUAGE_RANK[req.level];
    const have = mine ? LANGUAGE_RANK[mine.level] : -1;
    if (have >= need) f.push({ key: `lang-${req.language}`, points: 3, reason: `Chiede ${req.language}, che conosci` });
    else if (req.level === "base") continue;
    else f.push({ key: `lang-${req.language}`, points: req.level === "fluente" ? -15 : -8, reason: `Chiede ${req.language}${req.level === "fluente" ? " fluente" : ""}` });
  }

  // 8. Things to avoid
  const avoidKw = [...profile.avoidKeywords, ...adjustments.filter((a) => a.kind === "keyword").map((a) => a.value)].filter(Boolean);
  const hitKw = avoidKw.find((k) => titleAndDesc.includes(fold(k)));
  if (hitKw) f.push({ key: "avoid-keyword", points: -40, reason: `Contiene "${hitKw}", che vuoi evitare` });

  const avoidRoleWords = adjustments.filter((a) => a.kind === "role").map((a) => a.value);
  const hitRole = avoidRoleWords.find((w) => containsPhrase(titleT, w));
  if (hitRole) f.push({ key: "avoid-role", points: -30, reason: "Ruolo che hai scartato prima" });

  const comp = normalizeCompany(job.company);
  const avoidCo = [...profile.avoidCompanies, ...adjustments.filter((a) => a.kind === "company").map((a) => a.value)];
  if (comp && avoidCo.some((c) => normalizeCompany(c) === comp)) f.push({ key: "avoid-company", points: -100, reason: "Azienda che vuoi evitare" });

  if (job.sector && profile.avoidSectors.some((s) => fold(s) === fold(job.sector!))) {
    f.push({ key: "avoid-sector", points: -30, reason: "Settore che vuoi evitare" });
  }

  // 9. Scam
  if (job.scamFlagCount > 0) f.push({ key: "scam", points: -40, reason: "Attenzione: potrebbe essere una truffa" });

  const score = f.reduce((s, x) => s + x.points, 0);
  const level: Level = score >= THRESHOLDS.molto ? "molto" : score >= THRESHOLDS.adatta ? "adatta" : "poco";
  return { score, level, reasons: pickReasons(f, level), factors: f };
}

function pickReasons(f: Factor[], level: Level): string[] {
  const scam = f.find((x) => x.key === "scam");
  const pos = f.filter((x) => x.points > 0).sort((a, b) => b.points - a.points);
  const neg = f.filter((x) => x.points < 0).sort((a, b) => a.points - b.points);
  let picked: Factor[];
  if (scam) picked = [scam, ...pos.slice(0, 1)];
  else if (level === "poco") picked = [...neg.slice(0, 1), ...pos.slice(0, 1)];
  else if (level === "adatta") picked = [...pos.slice(0, 1), ...(neg.length ? neg.slice(0, 1) : pos.slice(1, 2))];
  else picked = pos.slice(0, 2);
  return picked.slice(0, 2).map((x) => x.reason);
}
