// What a listing asks for, and whether the person has it: years of experience, a degree, skills
// (team management, clienteling, watches...). Read from the listing's own text and compared with the
// CV text and the experience timeline. Rule-based and explainable; "?" when the CV doesn't say.
import { fold } from "./text";

export interface Requirements {
  years: number | null;
  degree: boolean;
  skills: string[];
}

/** Skills that listings ask for and CVs mention. [label, how a listing or a CV says it] */
const SKILLS: [string, RegExp][] = [
  ["Gestione di un team", /gestione (del |di un |dei |di )?(team|personale|collaboratori|risorse)|team management|people management|manag(e|ing) (a |the )?team|coordinamento (del |di )?(team|personale)|team leader|guida(re)? (il |un )?team/],
  ["Clienteling e portafoglio clienti", /clienteling|client ?book|portafoglio clienti|fidelizzazione|crm\b|customer relationship/],
  ["Vendita nel lusso", /\blusso\b|luxury|alta moda|high fashion|haute couture|\bmaison\b|premium brand/],
  ["Esperienza in negozio (retail)", /\bretail\b|punto vendita|punti vendita|boutique|flagship|\bstore\b|negozio/],
  ["Obiettivi e KPI di vendita", /\bkpi\b|budget (di vendita|commerciale)|obiettivi (di vendita|commerciali)|sales targets?|sell[- ]?(out|through)|conversion rate|scontrino medio/],
  ["Visual merchandising", /visual merchandis/],
  ["Orologeria", /orolog|\bwatch(es)?\b|watchmaking|horolog|haute horlogerie/],
  ["Gioielleria", /gioiell|jewel|fine jewellery|haute joaillerie/],
  ["Wholesale / B2B", /wholesale|\bb2b\b|showroom|key account/],
  ["E-commerce e digitale", /e-?commerce|omnichannel|omnicanal|digital sales|social selling/],
  ["Inventario e stock", /inventari|gestione (dello |del )?(stock|magazzino)|stock management|replenishment|riassortiment/],
  ["Excel", /\bexcel\b/],
  ["SAP / gestionali", /\bsap\b|gestional|\berp\b/],
  ["Salesforce", /salesforce/],
  ["Contabilità", /contabilit|bookkeeping|accounting|prima nota|bilanci/],
  ["Modelli finanziari e valutazioni", /financial model|modell(i|azione) finanziari|valuation|valutazion[ei] d'azienda|\bdcf\b|\blbo\b/],
  ["PowerPoint", /powerpoint|\bppt\b/],
  ["Python o SQL", /\bpython\b|\bsql\b/],
  ["Patente B", /patente b|driving licen[cs]e|automunit/],
];

/** "orologi o gioielli": either one is enough, so one requirement, not two. */
const EITHER: [string, string, string, RegExp][] = [["Orologeria", "Gioielleria", "Orologeria o gioielleria", /orolog\w*\s*(o|or|e\/o|\/)\s*(di |dei |della )?gioiell|gioiell\w*\s*(o|or|e\/o|\/)\s*(di |degli |dell')?orolog|watch(es)?\s*(or|\/)\s*jewel|jewel\w*\s*(or|\/)\s*watch/]];
const skillRe = (label: string): RegExp => {
  const either = EITHER.find(([, , l]) => l === label);
  if (either) return new RegExp(`${skillRe(either[0]).source}|${skillRe(either[1]).source}`);
  return SKILLS.find(([l]) => l === label)![1];
};

const YEARS_PATTERNS: RegExp[] = [
  /(?:almeno|minimo|min\.?|at least|minimum(?: of)?)\s*(\d{1,2})\s*\+?\s*(?:anni|years?|yrs)/,
  /(\d{1,2})\s*\+?\s*(?:anni|years?|yrs)\s*(?:di |of )?(?:comprovata |significativa |solida |previous |proven |relevant )?(?:esperienza|experience)/,
  /esperienza (?:di |minima di |almeno )?(\d{1,2})\s*(?:anni|years?)/,
];

// The same listing is read once for everyone (re-ranking reads thousands of listings per person).
const cache = new Map<string, Requirements>();

export function extractRequirements(title: string, description: string): Requirements {
  const key = `${title}\n${description}`;
  const hit = cache.get(key);
  if (hit) return { ...hit, skills: [...hit.skills] };
  const r = readRequirements(title, description);
  if (cache.size > 20000) cache.clear();
  cache.set(key, r);
  return { ...r, skills: [...r.skills] };
}

function readRequirements(title: string, description: string): Requirements {
  const t = fold(`${title}\n${description}`);
  let years: number | null = null;
  for (const re of YEARS_PATTERNS) {
    const m = t.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 20) {
        years = n;
        break;
      }
    }
  }
  if (years == null && /esperienza pluriennale|comprovata esperienza|several years|extensive experience/.test(t)) years = 3;
  const degree = /\blaurea\b|laureat[oai]|\bdegree\b|bachelor|master'?s? degree|\bmba\b|university graduate/.test(t) && !/laurea (non )?(e )?gradita|preferibilmente laurea|degree (is )?a plus|nice to have/.test(t);
  let skills = SKILLS.filter(([, re]) => re.test(t)).map(([label]) => label);
  for (const [a, b, merged, re] of EITHER) {
    if (skills.includes(a) && skills.includes(b) && re.test(t)) skills = [...skills.filter((x) => x !== a && x !== b), merged];
  }
  return { years, degree, skills };
}

export interface Person {
  /** Years of work experience (from the timeline), null if unknown. */
  years: number | null;
  hasDegree: boolean;
  studying: boolean;
  /** Folded text of the CV and the timeline. */
  text: string;
}

export type Have = "si" | "quasi" | "no" | "?";
export interface Check {
  label: string;
  have: Have;
  note: string;
}

/** The listing's requirements, one by one, against the person. */
export function checkRequirements(req: Requirements, person: Person): Check[] {
  const out: Check[] = [];
  if (req.years != null) {
    if (person.years == null) out.push({ label: `${req.years} anni di esperienza`, have: "?", note: "Aggiungi le tue esperienze (Profilo → Esperienze) per saperlo." });
    else if (person.years >= req.years) out.push({ label: `${req.years} anni di esperienza`, have: "si", note: `Ne hai circa ${person.years}.` });
    else if (person.years >= req.years - 1) out.push({ label: `${req.years} anni di esperienza`, have: "quasi", note: `Ne hai circa ${person.years}: candidati se il resto combacia.` });
    else out.push({ label: `${req.years} anni di esperienza`, have: "no", note: `Ne hai circa ${person.years}. Meglio puntare su ruoli di un livello sotto, o mettere in evidenza i risultati.` });
  }
  if (req.degree) {
    out.push(
      person.hasDegree
        ? { label: "Laurea", have: "si", note: "Ce l'hai." }
        : person.studying
          ? { label: "Laurea", have: "quasi", note: "Sei ancora all'università: vale per chi si laurea a breve." }
          : { label: "Laurea", have: "no", note: "Non risulta dal CV. A volte l'esperienza la sostituisce: leggi bene l'annuncio." },
    );
  }
  for (const label of req.skills) {
    const re = skillRe(label);
    if (re.test(person.text)) out.push({ label, have: "si", note: "Lo dice il tuo CV." });
    else out.push({ label, have: person.text ? "no" : "?", note: person.text ? gapTip(label, person.text) : "Carica il CV per saperlo." });
  }
  return out;
}

/** A practical hint for a missing skill, especially when switching sector. */
function gapTip(label: string, text: string): string {
  const luxury = SKILLS.find(([l]) => l === "Vendita nel lusso")![1].test(text);
  const product = label.startsWith("Orologeria") || label === "Gioielleria";
  if (product && luxury) return "Non dal CV, ma chi viene dalla vendita nel lusso è spesso preso: clienteling e risultati contano. Un corso breve sul prodotto aiuta.";
  if (product) return "Conoscenza del prodotto richiesta: un corso breve o l'esperienza in vendita di alta gamma la compensano in parte.";
  return "Non risulta dal CV: se ce l'hai, scrivilo; se no, è il primo punto da colmare.";
}

/** Years of work from a timeline (overlaps counted once, ongoing roles until `now`). */
export function workYears(items: { kind: string; startYear: number | null; startMonth?: number | null; endYear: number | null; endMonth?: number | null; current: boolean }[], now = new Date()): number | null {
  const spans = items
    .filter((i) => i.kind === "lavoro" && i.startYear)
    .map((i) => {
      const s = i.startYear! * 12 + (i.startMonth ?? 1) - 1;
      const e = i.current || !i.endYear ? now.getFullYear() * 12 + now.getMonth() : i.endYear * 12 + (i.endMonth ?? 12) - 1;
      return [s, Math.max(s, e)] as const;
    })
    .sort((a, b) => a[0] - b[0]);
  if (spans.length === 0) return null;
  let months = 0;
  let [cs, ce] = spans[0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      months += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  months += ce - cs;
  return Math.round(months / 12);
}
