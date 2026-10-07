// A search as people type it, understood: "sales manager moda Milano part-time" → the role (with the
// other names it goes by, from ESCO), a sector word, a place, the hours. What is recognised becomes a
// filter; the rest are words to find in the offer. Shown back as chips the person can remove one by one.
import type { Contract, Hours } from "./extract";
import { findPlace, regionsOf } from "./geo";
import type { Seniority, Benefit } from "./job-facts";
import { fold } from "./text";
import type { WherePlace } from "./where";
import { findOccupation, occupationNames } from "../catalog/occupations";

export interface QueryConcept {
  /** Shown on its chip: "Sales manager", "moda". */
  label: string;
  /** Any of these (phrases) counts. */
  alternatives: string[];
  /** Words about the job are looked for in the title (and company) first; sector words and quoted phrases anywhere. */
  field: "title" | "any";
  kind: "ruolo" | "parola" | "settore";
  /** The text it came from, to remove it from the search. */
  raw: string;
}

export interface ParsedQuery {
  concepts: QueryConcept[];
  places: { place: WherePlace; raw: string }[];
  hours?: { value: Exclude<Hours, "unknown">; raw: string };
  remote?: { value: "remote" | "hybrid"; raw: string };
  contracts: { value: Contract; raw: string }[];
  types: { value: "stage" | "programma"; raw: string }[];
  seniority?: { value: Seniority; raw: string };
  noExperience?: { raw: string };
  protectedCategories?: { raw: string };
  benefits: { value: Benefit; raw: string }[];
  noAgencies?: { raw: string };
  /** Words that must not appear ("-agenzia", "senza turni"). */
  excludes: { word: string; raw: string }[];
}

const STOP = new Set(
  "lavoro lavori offerta offerte annuncio annunci cerco cercasi cerca posizione posizioni opportunita job jobs come per a in di da del della dei delle il lo la le gli i un una e ed con zona provincia presso vicino nel nella nei negli sul sulla the of as at in on for and or".split(" "),
);
const LOCATIVE = new Set(["a", "in", "zona", "provincia", "presso", "vicino", "at", "near", "su"]);

/** Italian province capitals (and big towns people search by name). Other towns count only after "a", "in", "zona"… */
const CAPITALS = new Set(
  ([] as string[])
    .concat(
      [
        "torino", "vercelli", "novara", "cuneo", "asti", "alessandria", "biella", "verbania", "aosta", "varese", "como", "sondrio", "milano", "bergamo", "brescia",
        "pavia", "cremona", "mantova", "lecco", "lodi", "monza", "bolzano", "trento", "verona", "vicenza", "belluno", "treviso", "venezia", "padova", "rovigo",
        "udine", "gorizia", "trieste", "pordenone", "imperia", "savona", "genova", "la spezia", "piacenza", "parma", "reggio emilia", "reggio nell'emilia", "modena",
        "bologna", "ferrara", "ravenna", "forli", "rimini", "massa", "carrara", "lucca", "pistoia", "firenze", "livorno", "pisa", "arezzo", "siena", "grosseto",
        "prato", "perugia", "terni", "pesaro", "urbino", "ancona", "macerata", "ascoli piceno", "fermo", "viterbo", "rieti", "roma", "latina", "frosinone",
        "l'aquila", "teramo", "pescara", "chieti", "campobasso", "isernia", "caserta", "benevento", "napoli", "avellino", "salerno", "foggia", "bari", "taranto",
        "brindisi", "lecce", "barletta", "andria", "trani", "potenza", "matera", "cosenza", "catanzaro", "reggio calabria", "reggio di calabria", "crotone",
        "vibo valentia", "trapani", "palermo", "messina", "agrigento", "caltanissetta", "enna", "catania", "ragusa", "siracusa", "sassari", "nuoro", "cagliari",
        "oristano", "carbonia", "sesto san giovanni", "rho", "segrate", "assago", "cinisello balsamo", "legnano", "busto arsizio", "gallarate", "moncalieri",
        "rivoli", "collegno", "fiumicino", "pomezia", "guidonia", "pozzuoli", "marsala", "milan", "rome", "turin", "florence", "naples", "venice", "genoa",
        "london", "londra", "parigi", "paris", "berlino", "berlin", "monaco di baviera", "munich", "francoforte", "frankfurt",
      ].map(fold),
    ),
);

const HOURS: [RegExp, Exclude<Hours, "unknown">][] = [
  [/^(part[- ]?time|tempo parziale|mezza giornata|parttime)$/, "part"],
  [/^(full[- ]?time|tempo pieno|fulltime)$/, "full"],
];
const REMOTE: [RegExp, "remote" | "hybrid"][] = [
  [/^(da remoto|remoto|da casa|smart working|smartworking|telelavoro|remote|full remote|lavoro da casa)$/, "remote"],
  [/^(ibrido|ibrida|hybrid)$/, "hybrid"],
];
const CONTRACTS: [RegExp, Contract][] = [
  [/^(tempo indeterminato|indeterminato|contratto indeterminato|permanent)$/, "indeterminato"],
  [/^(tempo determinato|determinato|a termine|fixed term)$/, "determinato"],
  [/^(apprendistato|apprendista|apprenticeship)$/, "apprendistato"],
  [/^(partita iva|p iva|freelance|libero professionista)$/, "partita_iva"],
  [/^(somministrazione|interinale)$/, "somministrazione"],
];
const TYPES: [RegExp, "stage" | "programma"][] = [
  [/^(stage|stages|tirocinio|tirocini|tirocinante|internship|internships|stagista|stagiaire)$/, "stage"],
  [/^(spring week|insight day|graduate program|graduate programme|programma graduate)$/, "programma"],
];
const SENIORITY: [RegExp, Seniority][] = [
  [/^(junior|jr|entry level|primo impiego)$/, "junior"],
  [/^(senior|sr|esperto|esperta)$/, "senior"],
];
const NO_EXPERIENCE = /^(senza esperienza|nessuna esperienza|prima esperienza|neolaureato|neolaureata|neolaureati|neodiplomato|neodiplomata|no experience)$/;
const PROTECTED = /^(categorie protette|categoria protetta|l 68 99|legge 68)$/;
const BENEFITS: [RegExp, Benefit][] = [
  [/^(buoni pasto|ticket restaurant)$/, "buoni-pasto"],
  [/^(auto aziendale|company car)$/, "auto"],
  [/^(welfare|welfare aziendale)$/, "welfare"],
];
const NO_AGENCIES = /^(senza agenzie|no agenzie|niente agenzie|no agency|escludi agenzie)$/;

/** The other ways listings write a word (Italian and English), for words that are not a whole job title. */
const SYNONYMS: Record<string, string[]> = {
  vendite: ["vendite", "vendita", "sales", "commerciale"],
  vendita: ["vendita", "vendite", "sales", "commerciale"],
  sales: ["sales", "vendite", "commerciale"],
  commerciale: ["commerciale", "sales", "vendite", "account"],
  contabile: ["contabile", "contabilita", "accountant", "accounting"],
  contabilita: ["contabilita", "contabile", "accounting", "accountant"],
  amministrativo: ["amministrativ", "administrative", "admin"],
  amministrativa: ["amministrativ", "administrative", "admin"],
  amministrazione: ["amministrazione", "amministrativ", "administration"],
  segretaria: ["segretari", "secretary", "assistente di direzione", "office assistant"],
  segretario: ["segretari", "secretary", "assistente di direzione", "office assistant"],
  magazziniere: ["magazzinier", "magazzino", "warehouse"],
  cassiera: ["cassier", "cassa", "cashier"],
  cassiere: ["cassier", "cassa", "cashier"],
  magazzino: ["magazzino", "magazzinier", "warehouse"],
  finanza: ["finanza", "finance", "financial", "finanziari"],
  finance: ["finance", "finanza", "financial"],
  analista: ["analista", "analyst"],
  analyst: ["analyst", "analista"],
  sviluppatore: ["sviluppator", "developer", "software engineer", "programmator"],
  developer: ["developer", "sviluppator", "software engineer"],
  ingegnere: ["ingegner", "engineer"],
  moda: ["moda", "fashion", "abbigliamento", "lusso", "luxury", "apparel"],
  fashion: ["fashion", "moda", "luxury", "lusso"],
  lusso: ["lusso", "luxury", "moda", "fashion"],
  luxury: ["luxury", "lusso", "fashion", "moda"],
  banca: ["banca", "bancari", "bank", "banking"],
  bancario: ["bancari", "banca", "banking"],
  hr: ["hr", "risorse umane", "human resources", "people"],
  acquisti: ["acquisti", "procurement", "purchasing", "buyer"],
  logistica: ["logistica", "logistics", "supply chain"],
  cameriere: ["camerier", "waiter", "sala"],
  cameriera: ["camerier", "waitress", "sala"],
  infermiere: ["infermier", "nurse"],
  infermiera: ["infermier", "nurse"],
  insegnante: ["insegnant", "docente", "teacher"],
  cuoco: ["cuoc", "chef", "cook"],
  autista: ["autista", "driver"],
  legale: ["legale", "legal", "avvocat", "lawyer"],
  avvocato: ["avvocat", "lawyer", "legal counsel"],
  consulente: ["consulent", "consultant"],
  receptionist: ["receptionist", "reception", "front office", "accoglienza"],
  commessa: ["commess", "addetta vendite", "sales assistant", "shop assistant"],
  commesso: ["commess", "addetto vendite", "sales assistant", "shop assistant"],
  marketing: ["marketing"],
  farmacia: ["farmacia", "farmacist", "pharmacy"],
  edilizia: ["edil", "cantiere", "construction"],
  turismo: ["turismo", "turistic", "tourism", "hospitality"],
};

/** Words that name a field rather than a job: matched anywhere in the offer. */
const SECTOR_WORDS = new Set(["moda", "fashion", "lusso", "luxury", "banca", "finanza", "finance", "logistica", "farmacia", "edilizia", "turismo", "marketing", "hr", "acquisti", "legale"]);

function placeOf(phrase: string, afterLocative: boolean): WherePlace | null {
  const f = fold(phrase);
  if (f === "italia" || f === "italy") return { kind: "paese", country: "IT", name: "Italia" };
  const region = regionsOf("IT").find((r) => fold(r) === f);
  if (region) return { kind: "regione", country: "IT", name: region };
  if (!afterLocative && !CAPITALS.has(f)) return null;
  const p = findPlace(phrase);
  if (!p) return null;
  // The whole phrase is the town ("Milano", "Milan", "Sesto San Giovanni"), not a word inside another name.
  const same = fold(p.name) === f || CAPITALS.has(f);
  return same ? { kind: "città", country: p.country, name: p.name } : null;
}

const match = <T,>(rules: [RegExp, T][], s: string): T | undefined => rules.find(([re]) => re.test(s))?.[1];

export function parseQuery(text: string): ParsedQuery {
  const out: ParsedQuery = { concepts: [], places: [], contracts: [], types: [], benefits: [], excludes: [] };
  // Excluded words: "-agenzia", "-turni".
  let rest = text.replace(/(^|\s)-([\p{L}\d]+)/gu, (_, sp: string, w: string) => {
    out.excludes.push({ word: fold(w), raw: `-${w}` });
    return sp;
  });
  // "Quoted phrases" stay together.
  const quoted: string[] = [];
  rest = rest.replace(/"([^"]+)"/g, (_, q: string) => {
    quoted.push(q.trim());
    return " ";
  });
  const words = rest.split(/[\s,;/]+/).map((w) => w.trim()).filter(Boolean);
  const used = new Array(words.length).fill(false);
  const phraseAt = (i: number, n: number) => words.slice(i, i + n).join(" ");
  const key = (i: number, n: number) => fold(phraseAt(i, n)).replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

  // Longest phrases first: "tempo indeterminato" before "tempo", "sesto san giovanni" before "sesto".
  for (let n = 4; n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      if (used.slice(i, i + n).some(Boolean)) continue;
      const k = key(i, n);
      const raw = phraseAt(i, n);
      if (!k) continue;
      const take = () => used.fill(true, i, i + n);
      const h = match(HOURS, k);
      if (h) { out.hours = { value: h, raw }; take(); continue; }
      const r = match(REMOTE, k);
      if (r) { out.remote = { value: r, raw }; take(); continue; }
      const c = match(CONTRACTS, k);
      if (c) { out.contracts.push({ value: c, raw }); take(); continue; }
      const t = match(TYPES, k);
      if (t) { out.types.push({ value: t, raw }); take(); continue; }
      const s = match(SENIORITY, k);
      if (s) { out.seniority = { value: s, raw }; take(); continue; }
      if (NO_EXPERIENCE.test(k)) { out.noExperience = { raw }; take(); continue; }
      if (PROTECTED.test(k)) { out.protectedCategories = { raw }; take(); continue; }
      if (NO_AGENCIES.test(k)) { out.noAgencies = { raw }; take(); continue; }
      const b = match(BENEFITS, k);
      if (b) { out.benefits.push({ value: b, raw }); take(); continue; }
      const loc = i > 0 && LOCATIVE.has(fold(words[i - 1]));
      const place = placeOf(raw, loc);
      if (place) {
        if (!out.places.some((p) => p.place.name === place.name)) out.places.push({ place, raw: loc ? `${words[i - 1]} ${raw}` : raw });
        take();
        if (loc) used[i - 1] = true;
        continue;
      }
      // A whole job title, in any of its names (ESCO: Italian, English, German, French).
      if (n >= 1 && k.length >= 3 && !(n === 1 && (STOP.has(k) || SECTOR_WORDS.has(k)))) {
        const occ = findOccupation(raw);
        if (occ) {
          const names = [...new Set([occ.it, occ.en].flatMap((x) => x.split("/")).map((x) => x.trim()).concat(occupationNames(occ, 10)))]
            .filter((x) => x.split(" ").length <= 4)
            .slice(0, 10);
          // Plus the everyday words for it ("contabile" → "accountant", "magazziniere" → "magazzino").
          const extra = SYNONYMS[k] ?? [];
          out.concepts.push({ label: raw, alternatives: [...new Set([raw, ...extra, ...names])], field: "title", kind: "ruolo", raw });
          take();
        }
      }
    }
  }
  // "senza turni", "no agenzia" → excluded words.
  for (let i = 0; i + 1 < words.length; i++) {
    if (!used[i] && !used[i + 1] && /^(senza|no|niente)$/i.test(words[i])) {
      out.excludes.push({ word: fold(words[i + 1]), raw: `${words[i]} ${words[i + 1]}` });
      used[i] = used[i + 1] = true;
    }
  }
  for (const q of quoted) out.concepts.push({ label: `"${q}"`, alternatives: [q], field: "any", kind: "parola", raw: `"${q}"` });
  // Every other word: found anywhere in the offer, with the other ways listings write it.
  words.forEach((w, i) => {
    if (used[i]) return;
    const k = fold(w).replace(/[^a-z0-9']+/g, "");
    if (!k || STOP.has(k) || k.length < 2) return;
    const sector = SECTOR_WORDS.has(k);
    out.concepts.push({ label: w, alternatives: SYNONYMS[k] ?? [k], field: sector ? "any" : "title", kind: sector ? "settore" : "parola", raw: w });
  });
  return out;
}

/** The search without one recognised piece (its chip's ×). */
export function withoutPart(text: string, raw: string): string {
  const i = text.toLowerCase().indexOf(raw.toLowerCase());
  if (i < 0) return text;
  return `${text.slice(0, i)} ${text.slice(i + raw.length)}`.replace(/\s+/g, " ").trim();
}

/** True when the search has something to find in the text (not only filters). */
export const hasWords = (p: ParsedQuery) => p.concepts.length > 0;
