// Pick the right CV for a job by role family (e.g. "Amministrazione", "Segreteria").
// Rules: the CV whose family words appear in the job title wins, then the job's sector,
// then the default CV. She can always override the choice.

import { fold, keyTokens } from "./text";

export interface CvChoice {
  id: number;
  label: string;
  roleFamily: string;
  isDefault: boolean;
}

/** Extra words that belong to a family, so "Segreteria" also matches "receptionist". */
export const FAMILY_WORDS: Record<string, string[]> = {
  amministrazione: ["amministrativ", "contabil", "fatturazion", "paghe", "ragioner", "back office", "data entry", "accounting"],
  segreteria: ["segretari", "reception", "receptionist", "front office", "centralinist", "assistente di direzione", "office"],
  vendita: ["commess", "vendit", "cassier", "negozio", "retail", "sales"],
  "assistenza clienti": ["customer", "call center", "assistenza clienti", "helpdesk", "contact center"],
  logistica: ["magazzin", "logistic", "spedizion", "warehouse"],
};

function familyWords(family: string): string[] {
  const f = fold(family);
  const extra = Object.entries(FAMILY_WORDS).find(([k]) => f.includes(k) || k.includes(f))?.[1] ?? [];
  return [...keyTokens(family).filter((w) => w.length >= 4), ...extra];
}

export function pickCv(cvs: CvChoice[], job: { title: string; sector: string | null }): CvChoice | null {
  if (cvs.length === 0) return null;
  const title = fold(job.title);
  const sector = fold(job.sector ?? "");
  const byTitle = cvs.find((cv) => familyWords(cv.roleFamily).some((w) => title.includes(fold(w))));
  if (byTitle) return byTitle;
  const bySector = cvs.find((cv) => sector && familyWords(cv.roleFamily).some((w) => sector.includes(fold(w))));
  if (bySector) return bySector;
  return cvs.find((cv) => cv.isDefault) ?? cvs[0];
}
