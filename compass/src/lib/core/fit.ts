// The fit score out of 100: every ranking factor belongs to one of seven parts (role, experience,
// requirements, place, pay, conditions, your choices). Each part is 0-100 (50 = nothing known), and
// the score is their weighted average. People can change the weights (Profilo → Punteggio);
// the defaults are below. Hard limits stay: a likely scam or an avoided company never scores high.
import type { Factor } from "./rank";

export const FIT_AREAS = ["ruolo", "esperienza", "requisiti", "luogo", "paga", "condizioni", "scelte"] as const;
export type FitArea = (typeof FIT_AREAS)[number];
export type FitWeights = Record<FitArea, number>;

export const AREA_LABELS: Record<FitArea, { name: string; hint: string }> = {
  ruolo: { name: "Ruolo", hint: "Quanto il titolo dell'annuncio è il lavoro che cerchi, e il livello giusto." },
  esperienza: { name: "Esperienza", hint: "Quanto il settore e il livello somigliano a quello che hai già fatto." },
  requisiti: { name: "Requisiti", hint: "Anni di esperienza, laurea, competenze e lingue chiesti dall'annuncio, confrontati con il tuo CV." },
  luogo: { name: "Luogo", hint: "Distanza da casa, città, regioni e paesi che hai scelto, lavoro da remoto." },
  paga: { name: "Paga", hint: "Lo stipendio rispetto al tuo minimo (se l'annuncio lo dice)." },
  condizioni: { name: "Condizioni", hint: "Contratto, orario e quanto è recente l'annuncio." },
  scelte: { name: "Le tue scelte", hint: "Aziende e settori che hai scelto o che vuoi evitare." },
};

/** Defaults: what matters most is doing the right job at the right level, then being able to get it. */
export const DEFAULT_WEIGHTS: FitWeights = { ruolo: 25, esperienza: 15, requisiti: 15, luogo: 15, paga: 10, condizioni: 5, scelte: 15 };
/** Students: the kind of position for their year matters most; past work counts little. */
export const STUDENT_WEIGHTS: FitWeights = { ruolo: 30, esperienza: 5, requisiti: 15, luogo: 15, paga: 10, condizioni: 5, scelte: 20 };
export const defaultWeights = (track: string): FitWeights => (track === "stage" ? STUDENT_WEIGHTS : DEFAULT_WEIGHTS);

/** Points that take a part from 50 to 100 (or to 0). */
const RANGE: Record<FitArea, number> = { ruolo: 60, esperienza: 30, requisiti: 40, luogo: 30, paga: 30, condizioni: 30, scelte: 40 };

export function areaOf(key: string): FitArea | null {
  if (key === "role" || key === "avoid-role" || key === "type" || key === "stage-fit" || key === "seniority") return "ruolo";
  if (key === "experience" || key.startsWith("exp")) return "esperienza";
  if (key === "req" || key.startsWith("lang-") || key.startsWith("eligibility")) return "requisiti";
  if (key === "distance" || key === "remote" || key === "country") return "luogo";
  if (key === "salary" || key === "pay") return "paga";
  if (key === "hours" || key === "contract" || key === "recency" || key === "deadline") return "condizioni";
  if (key === "company-liked" || key === "sector-liked" || key.startsWith("avoid-")) return "scelte";
  return null;
}

export interface FitResult {
  fit: number;
  parts: Record<FitArea, number>;
}

export function computeFit(factors: Factor[], weights: Partial<FitWeights> | null | undefined, track = "lavoro"): FitResult {
  const w: FitWeights = { ...defaultWeights(track), ...(weights ?? {}) };
  const sums = Object.fromEntries(FIT_AREAS.map((a) => [a, 0])) as Record<FitArea, number>;
  for (const f of factors) {
    const a = areaOf(f.key);
    if (a) sums[a] += f.points;
  }
  const parts = Object.fromEntries(FIT_AREAS.map((a) => [a, Math.round(100 * Math.max(0, Math.min(1, 0.5 + sums[a] / RANGE[a])))])) as Record<FitArea, number>;
  const total = FIT_AREAS.reduce((s, a) => s + Math.max(0, w[a]), 0) || 1;
  let fit = Math.round(FIT_AREAS.reduce((s, a) => s + Math.max(0, w[a]) * parts[a], 0) / total);
  // Hard limits, whatever the weights. A clearly wrong role is a dealbreaker; too far or under
  // their minimum pay keeps it out of the top level.
  if (parts.ruolo < 15) fit = Math.min(fit, 50);
  // A different job, with nothing from their sectors or experience in it, is not a fit however close.
  const roleMiss = factors.some((f) => f.key === "role" && f.points < 0);
  const related = factors.some((f) => (f.key === "exp-sector" && f.points > 0) || (f.key === "sector-liked" && f.points > 6) || (f.key === "company-liked" && f.points > 6));
  if (roleMiss && !related) fit = Math.min(fit, 48);
  if (parts.luogo < 15 || parts.paga < 15) fit = Math.min(fit, 60);
  const has = (k: string) => factors.some((f) => f.key === k);
  if (has("avoid-company")) fit = Math.min(fit, 10);
  if (has("scam")) fit = Math.min(fit, 20);
  if (has("avoid-keyword") || has("avoid-sector") || has("avoid-role")) fit = Math.min(fit, 35);
  return { fit, parts };
}

/** Clean, bounded weights from a form (0-10 per part, as entered by the person). */
export function parseWeights(input: Partial<Record<FitArea, unknown>>): FitWeights {
  return Object.fromEntries(FIT_AREAS.map((a) => [a, Math.max(0, Math.min(50, Math.round(Number(input[a]) || 0)))])) as FitWeights;
}
