// Where a student is in their studies, and what usually fits that moment. Used by the ranking
// (a first-year student sees spring weeks above associate roles) and by the "Percorsi" panel.

export type CareerStage = "primi-anni" | "penultimo" | "ultimo";

export const STAGE_LABELS: Record<CareerStage, string> = {
  "primi-anni": "primi anni",
  penultimo: "penultimo anno",
  ultimo: "ultimo anno",
};

/**
 * Bachelor (3 years): 1 -> primi anni, 2 -> penultimo, 3 -> ultimo.
 * Master (2 years): 1 -> penultimo (the summer internship year), 2 -> ultimo.
 * Single-cycle (5-6 years): up to 3 -> primi anni, then penultimo, ultimo.
 */
export function careerStage(studyYear: number | null, degreeYears: number | null): CareerStage | null {
  if (!studyYear) return null;
  const total = degreeYears || 3;
  if (studyYear >= total) return "ultimo";
  if (studyYear === total - 1) return "penultimo";
  return "primi-anni";
}

/** Seniority in a job title. "Associate" in banking is the level after analyst: not for students. */
export function titleSeniority(title: string): "senior" | "associate" | "analyst" | "entry" | null {
  const t = title.toLowerCase();
  if (/\b(summer|spring|winter|off[- ]cycle)\s+(analyst|associate)\b|\bintern\b|internship|stage|tirocin/.test(t)) return "entry";
  if (/\b(senior|sr\.?|lead|head|director|direttore|principal|partner|vice president|vp|manager|responsabile)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|graduate|neolaureat|entry[- ]level)\b/.test(t)) return "entry";
  if (/\bassociate\b/.test(t)) return "associate";
  if (/\b(analyst|analista)\b/.test(t)) return "analyst";
  return null;
}

/** What to aim for, by stage. General patterns, not rules: dates vary by company and year. */
export const STAGE_ADVICE: Record<CareerStage, { best: string; tips: string[] }> = {
  "primi-anni": {
    best: "Spring week, insight day e programmi per studenti dei primi anni",
    tips: [
      "Le banche e le società di consulenza aprono le candidature per spring week e insight day di solito tra ottobre e gennaio: candidarsi presto aiuta.",
      "Stage brevi in startup, piccole boutique o family office contano più del nome: servono esperienze vere da raccontare.",
      "Associazioni studentesche (finanza, consulenza, investimenti) e competizioni danno contatti e un primo track record.",
      "Ruoli da Associate o Senior sono pensati per chi ha già anni di esperienza: per ora non servono.",
    ],
  },
  penultimo: {
    best: "Summer internship (stage estivo) da Analyst",
    tips: [
      "Lo stage estivo del penultimo anno è quello che più spesso porta a un'offerta di lavoro: le candidature aprono anche un anno prima, spesso tra agosto e novembre.",
      "Preparati ai test (numerici e logici) e ai colloqui tecnici con qualche mese di anticipo.",
      "Se il summer non arriva, uno stage off-cycle o in una boutique resta un ottimo passo.",
    ],
  },
  ultimo: {
    best: "Graduate programme, off-cycle e prime posizioni da Analyst",
    tips: [
      "I graduate programme assumono chi si laurea entro l'anno: le candidature si aprono spesso in autunno.",
      "Gli stage off-cycle dopo la laurea sono un ingresso comune nelle boutique e nei fondi.",
      "Con uno stage estivo alle spalle, punta sulle offerte di conversione e sulle posizioni Analyst.",
    ],
  },
};
