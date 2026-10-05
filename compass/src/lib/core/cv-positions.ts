// Positions recommended from the CV: the roles the person already did (as listings name them, at
// their level), where those roles usually lead next, and the job titles their CV mentions. The
// person ticks the ones to search; nothing is added on their own.
import { findPosition, POSITIONS, specificTitles, isGenericRole } from "../catalog/positions";
import { sheetFor } from "../catalog/role-sheets";
import { levelBracket } from "./search-code";
import { fold } from "./text";

export interface CvPositionInput {
  track: "lavoro" | "stage";
  /** The timeline, most recent first. */
  experiences: { kind: string; title: string; organization: string; current: boolean; description?: string }[];
  cvText: string;
  years: number | null;
  /** Chosen sector slugs, best first. */
  sectors: string[];
  /** Roles already searched: not recommended again. */
  roles: string[];
  priority: "alta" | "media" | "bassa";
}

export interface CvPosition {
  title: string;
  why: string;
  kind: "fatto" | "prossimo" | "nel-cv" | "direzione";
}

const MAX = 8;
/** How many roles are searched at most (the first ticked). */
export const MAX_ROLES = 6;
/** Studies are never a position to search, whatever section they end up in. */
const STUDY = /\b(laurea|diploma|universit|degree|bachelor|master|liceo|scuola|corso di|dottorato|phd)/i;
/** "Studente" is what someone is, not a position. */
export const STUDENT_ROLE = /^\s*(studente|studentessa|student|studentə|universitari[oa])\s*$/i;
/** Leadership, sport and passion roles: they say who someone is, not the job a student looks for. */
const SIDE_ROLE = /\b(allenat|coach|capitan|captain|portier|giocator|player|atlet|fondat|founder|co-?fondat|presidente|president|responsabile|rappresentant|volontari|volunteer|tutor|animator|membro|member|partecipante|ideatore|project lead|organizzat)/i;
/** Where studies and activities point, for students: sector of the internship positions, words, label. */
const DIRECTIONS: [string, RegExp, string][] = [
  ["corporate-finance", /\bfinan(za|ce|cial|ziari)|corporate finance|bilanc|valutazion|valuation/, "finanza"],
  ["markets", /mercati finanziari|financial markets|trading|\bborsa\b|azion[ei]|\bstocks?\b|s&p|s p 500|portafogli|portfolio/, "mercati finanziari"],
  ["asset-management", /investiment|investing|asset management|wealth|fondi/, "investimenti"],
  ["investment-banking", /investment bank|banca d.affari|\bm&a\b|fusioni|acquisizion/, "investment banking"],
  ["economics", /\beconomi|\beconomics/, "economia"],
  ["consulting", /consulen|consulting|strategi/, "consulenza"],
  ["startup", /imprendit|entrepreneur|start-?up|fondat|founder|ideatore/, "imprenditorialità"],
  ["ai-data", /intelligenza artificiale|artificial intelligence|\bai\b|machine learning|\bdati\b|\bdata\b|python|claude/, "AI e dati"],
  ["fintech", /fintech|pagamenti|payments|crypto/, "fintech"],
  ["media", /marketing|social media|comunicazione/, "marketing"],
  ["informatica", /software|programmazion|coding|web app|sviluppat/, "sviluppo software"],
];

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function recommendPositions(i: CvPositionInput): CvPosition[] {
  const out: CvPosition[] = [];
  // A role and its translations count once ("Store manager" = "Responsabile di negozio").
  const seen = new Set<string>();
  const names = (t: string) => {
    const p = findPosition(t);
    return [t, ...(p ? [p.it, p.en, p.de, p.fr] : [])].map(fold);
  };
  for (const r of i.roles) names(r).forEach((n) => seen.add(n));
  const add = (title: string, why: string, kind: CvPosition["kind"]) => {
    const t = cap(tidy(title));
    if (STUDY.test(t) || STUDENT_ROLE.test(t)) return;
    if (t.length < 3 || names(t).some((n) => seen.has(n)) || out.length >= MAX) return;
    names(t).forEach((n) => seen.add(n));
    out.push({ title: t, why, kind });
  };
  const lv = levelBracket(i.years);
  // A student (internships, or studying now): past leadership and passion roles are not positions to search.
  const student = i.track === "stage" || i.experiences.some((e) => e.kind === "studio" && e.current);
  const work = i.experiences.filter((e) => (i.track === "stage" ? e.kind === "lavoro" || e.kind === "altro" : e.kind === "lavoro") && e.title.trim() && !(student && SIDE_ROLE.test(e.title)));

  // 0. Students: the internships their studies and activities point to, with the reason.
  if (student) {
    const studies = fold(i.experiences.filter((e) => e.kind === "studio").map((e) => `${e.title} ${e.organization}`).join(" "));
    const all = fold([i.cvText, ...i.experiences.map((e) => `${e.title} ${e.organization} ${e.description ?? ""}`)].join(" "));
    const scored = DIRECTIONS.map(([sector, re, label]) => ({ sector, label, score: (re.test(studies) ? 2 : 0) + (all.match(new RegExp(re.source, "g"))?.length ?? 0) }))
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const pools = scored.map((d) => ({ d, list: POSITIONS.filter((p) => p.sector === d.sector && p.track === "stage") }));
    for (let k = 0; k < 2; k++) for (const { d, list } of pools) if (list[k]) add(list[k].it, `In linea con i tuoi studi e le tue attività: ${d.label}`, "direzione");
  }

  // 1. What they already did, as listings call it (a generic "commessa" becomes the precise titles).
  for (const e of work.slice(0, 4)) {
    const where = e.organization ? ` da ${tidy(e.organization)}` : "";
    const why = `${e.current ? "Lo fai ora" : "L'hai fatto"}${where}`;
    if (isGenericRole(e.title)) for (const t of specificTitles(e.title, lv, i.sectors)) add(t, why, "fatto");
    else add(e.title, why, "fatto"); // as they wrote it: "Store manager" is what Italian listings say too
  }

  // 2. The usual next step from the latest role (not for those in a hurry: they want the same level or below).
  const latest = work[0];
  const sheet = latest ? sheetFor(latest.title) : undefined;
  if (sheet && i.track === "lavoro" && i.priority !== "alta") {
    for (const n of sheet.next.slice(0, i.priority === "bassa" ? 3 : 2)) add(n.split("/")[0], `Il passo dopo "${tidy(latest!.title)}"`, "prossimo");
  }

  // 3. Job titles written in the CV (hand-made positions only: clear titles, not every ESCO word).
  const text = ` ${fold(i.cvText).replace(/[^a-z0-9]+/g, " ")} `;
  // A title that names a study, a sport or a volunteer role in the CV is not a job ("Portiere" in football).
  const notJobs = new Set(i.experiences.filter((e) => e.kind !== "lavoro" || (student && SIDE_ROLE.test(e.title))).map((e) => fold(tidy(e.title))));
  if (text.trim()) {
    for (const p of POSITIONS) {
      if (!p.sector || (p.track !== "tutti" && p.track !== i.track)) continue;
      const hit = [p.it, p.en].find((n) => n.length >= 6 && text.includes(` ${fold(n).replace(/[^a-z0-9]+/g, " ").trim()} `));
      if (hit && !notJobs.has(fold(hit)) && !notJobs.has(fold(p.it))) add(p.it, "Compare nel tuo CV", "nel-cv");
    }
  }
  return out;
}
