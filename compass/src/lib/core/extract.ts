// Rule-based extraction from ad text: contract, hours, remote, languages, sector and
// application e-mail addresses (with the sentence they came from as evidence).
// Dictionaries are Italian + English. Each rule is unit tested.

import { fold, sentences } from "./text";

export type Contract =
  | "indeterminato"
  | "determinato"
  | "somministrazione"
  | "apprendistato"
  | "stage"
  | "partita_iva"
  | "collaborazione"
  | "unknown";
export type Hours = "full" | "part" | "unknown";
export type Remote = "remote" | "hybrid" | "onsite" | "unknown";
export type LanguageLevel = "fluente" | "buono" | "base" | "richiesto";

export interface LanguageReq {
  language: string; // Italian name: "inglese", "francese", ...
  level: LanguageLevel;
}

export const CONTRACT_LABELS: Record<Contract, string> = {
  indeterminato: "Tempo indeterminato",
  determinato: "Tempo determinato",
  somministrazione: "Tramite agenzia (somministrazione)",
  apprendistato: "Apprendistato",
  stage: "Stage o tirocinio",
  partita_iva: "Partita IVA",
  collaborazione: "Collaborazione",
  unknown: "Contratto non indicato",
};

export const HOURS_LABELS: Record<Hours, string> = {
  full: "Tempo pieno",
  part: "Part-time",
  unknown: "Orario non indicato",
};

export const REMOTE_LABELS: Record<Remote, string> = {
  remote: "Da casa",
  hybrid: "In parte da casa",
  onsite: "In sede",
  unknown: "Sede non indicata",
};

// Order matters: the first match wins, most specific first.
const CONTRACT_RULES: [Contract, RegExp][] = [
  ["somministrazione", /somministrazion|tramite agenzia|staff leasing/],
  ["apprendistato", /apprendistato|apprentice/],
  ["stage", /\bstage\b|tirocini|internship|\btrainee\b/],
  ["partita_iva", /partita iva|p\.\s?iva|\bfreelance\b/],
  ["collaborazione", /co\.?co\.?co|collaborazione occasionale|contratto di collaborazione/],
  ["determinato", /tempo determinato|contratto a termine|fixed[- ]term|temporary contract|sostituzione maternita/],
  ["indeterminato", /tempo indeterminato|permanent|assunzione diretta|contratto stabile/],
];

export function extractContract(text: string): Contract {
  const t = fold(text);
  for (const [c, re] of CONTRACT_RULES) if (re.test(t)) return c;
  return "unknown";
}

export function extractHours(text: string): Hours {
  const t = fold(text);
  if (/part[- ]?time|tempo parziale|orario ridotto|mezza giornata/.test(t)) return "part";
  const ore = t.match(/(\d{2})\s*ore\s*(?:settimanali|a settimana|\/\s?sett)/);
  if (ore) return Number(ore[1]) >= 36 ? "full" : "part";
  if (/full[- ]?time|tempo pieno|orario pieno/.test(t)) return "full";
  return "unknown";
}

export function extractRemote(text: string): Remote {
  const t = fold(text);
  if (/ibrid|hybrid|smart working parziale|\d\s*giorn[oi]\s*(?:a settimana\s*)?(?:in|di|da)\s*(?:smart|remoto)|parzialmente da remoto/.test(t)) return "hybrid";
  if (/full remote|100% (?:da )?remoto|completamente da remoto|interamente da remoto|lavoro da remoto|da remoto|telelavoro|remote work|\bremote\b|smart working|lavoro da casa/.test(t)) return "remote";
  if (/in sede|on[- ]?site|in presenza|presso la sede|presso il nostro/.test(t)) return "onsite";
  return "unknown";
}

const LANGUAGES: [string, RegExp][] = [
  ["inglese", /inglese|english/],
  ["francese", /francese|french/],
  ["tedesco", /tedesco|german/],
  ["spagnolo", /spagnolo|spanish/],
  ["cinese", /cinese|chinese|mandarino/],
  ["russo", /\brusso\b|russian/],
  ["arabo", /arabo|arabic/],
];

const LEVELS: [LanguageLevel, RegExp][] = [
  ["fluente", /fluent|fluente|ottim|eccellent|madrelingua|native|\bc1\b|\bc2\b|perfett|avanzat|bilingu/],
  ["buono", /buon|good|\bb1\b|\bb2\b|discret|intermedi/],
  ["base", /\bbase\b|basic|scolastic|\ba1\b|\ba2\b|elementare/],
];

export function extractLanguages(text: string): LanguageReq[] {
  const found = new Map<string, LanguageLevel>();
  // Work clause by clause ("inglese fluente, buona conoscenza del francese"), and take the
  // level word closest to the language mention.
  const clauses = sentences(fold(text)).flatMap((s) => s.split(/[,;]/));
  for (const s of clauses) {
    for (const [lang, re] of LANGUAGES) {
      const m = s.match(re);
      if (!m) continue;
      // Ignore mentions that are clearly not requirements ("sito in inglese").
      if (/sito in|versione in|disponibile in/.test(s) && !/conoscenza|richiest|requisit|parlat|scritt/.test(s)) continue;
      const idx = m.index ?? 0;
      let level: LanguageLevel = "richiesto";
      let best = Infinity;
      for (const [lv, lre] of LEVELS) {
        for (const hit of s.matchAll(new RegExp(lre.source, "g"))) {
          const d = Math.abs((hit.index ?? 0) - idx);
          if (d < best && d <= 40) {
            best = d;
            level = lv;
          }
        }
      }
      const prev = found.get(lang);
      const rank = (l: LanguageLevel) => ["base", "richiesto", "buono", "fluente"].indexOf(l);
      if (!prev || rank(level) > rank(prev)) found.set(lang, level);
    }
  }
  // Italian itself is assumed and never listed as a requirement.
  return [...found].map(([language, level]) => ({ language, level }));
}

export const SECTORS: [string, RegExp][] = [
  ["Amministrazione e contabilità", /amministrativ|contabil|ragioner|fatturazion|paghe|bilancio|accounting|amministrazione|back office|tesoreria|commercialist|data entry/],
  ["Segreteria e reception", /segreteri|segretari[ao]|receptionist|reception|centralinist|front office|assistente di direzione|office manager|secretary/],
  ["Vendita e negozi", /commess|addett[oa] vendite|sales assistant|cassier|negozio|retail|store|banconist|venditor|consulente commerciale/],
  ["Assistenza clienti", /customer (?:care|service)|assistenza clienti|operatore call center|call center|helpdesk|contact center|inbound/],
  ["Logistica e magazzino", /magazzin|logistic|carrell|spedizion|warehouse|picking|autista|corriere/],
  ["Sanità e assistenza", /\boss\b|infermier|assistenza anziani|badante|sanitari|farmaci|asa\b|caregiver|ospedal|clinica/],
  ["Ristorazione e hotel", /cameriere|cuoc|ristorant|\bbar\b|barista|hotel|alberg|lavapiatti|aiuto cucina|housekeeping/],
  ["Pulizie e servizi", /pulizi|cleaning|addett[oa] alle pulizie|portierat|custode|multiservizi/],
  ["Scuola e formazione", /insegnant|docente|educat|tutor|formator|scuola|asilo/],
  ["Informatica", /sviluppator|developer|programmat|software|sistemist|informatic/],
];

export function extractSector(text: string): string | null {
  const t = fold(text);
  for (const [name, re] of SECTORS) if (re.test(t)) return name;
  return null;
}

// --- Application e-mail detection -----------------------------------------------------

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** A sentence that asks to send a CV or an application. */
const APPLY_CUE =
  /(invia|inviare|inviate|invii|manda|mandare|mandate|spedire|trasmettere|trasmetti|candidatur|candidarsi|candidati|curriculum|\bcv\b|c\.v\.|send (?:your )?(?:cv|resume|application)|apply|email your)/;
/** Addresses that are clearly not for applications. */
const NOT_FOR_APPLYING = /^(no-?reply|noreply|do-?not-?reply|privacy|dpo|gdpr|unsubscribe|newsletter|mailer-daemon|notifications?|alerts?)@/i;

export interface ApplicationEmail {
  email: string;
  evidence: string;
}

/** Find addresses where the ad asks to send a CV by e-mail, with the sentence as evidence. */
export function extractApplicationEmails(text: string): ApplicationEmail[] {
  const out: ApplicationEmail[] = [];
  const seen = new Set<string>();
  for (const s of sentences(text)) {
    const emails = s.match(EMAIL_RE);
    if (!emails) continue;
    const folded = fold(s);
    if (!APPLY_CUE.test(folded)) continue;
    // Privacy notices often contain addresses next to the word "candidati" (data subjects).
    if (/trattamento dei dati|informativa|privacy|gdpr|titolare del trattamento/.test(folded) && !/invia|manda|cv|curriculum/.test(folded)) continue;
    for (const raw of emails) {
      const email = raw.replace(/\.$/, "").toLowerCase();
      if (NOT_FOR_APPLYING.test(email) || seen.has(email)) continue;
      seen.add(email);
      out.push({ email, evidence: s.length > 300 ? s.slice(0, 297) + "…" : s });
    }
  }
  return out;
}

export function isValidEmail(s: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s.trim());
}

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

// --- Internships and student programmes ---------------------------------------------------

export type JobType = "lavoro" | "stage" | "programma" | "unknown";

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  lavoro: "Lavoro",
  stage: "Stage",
  programma: "Programma per studenti",
  unknown: "Non indicato",
};

const PROGRAMME_RE = /spring (?:week|insight|programme|program)|insight (?:day|week|programme|program|event)|discovery (?:day|programme|program)|early insights?|summer school|open day|first[- ]year (?:programme|program|students programme)|winter (?:insight|programme)/;
const INTERNSHIP_RE = /\bstage\b|stagista|stagiaire|tirocini|internship|\bintern\b|summer analyst|summer associate|off[- ]cycle|praticantato|working student|werkstudent|\btrainee\b/;
const SENIOR_RE = /\bsenior\b|\bmanager\b|\bdirector\b|\bhead of\b|responsabile|\blead\b|vice president|\bvp\b/;
const EXPERIENCE_RE = /(?:almeno|minimo|min\.?)\s*(?:[2-9]|\d{2})\s*anni di esperienza|esperienza (?:pregressa |consolidata )?(?:di )?(?:almeno )?(?:[2-9]|\d{2})\s*anni|\b(?:[2-9]|\d{2})\+?\s*(?:years|anni) (?:of )?(?:relevant |proven |professional )?(?:work )?experience/;

/** Is this ad a job, an internship, or a short programme for students? Title first, then text. */
export function extractJobType(title: string, text: string): JobType {
  const t = fold(title);
  const all = fold(`${title}\n${text}`);
  if (PROGRAMME_RE.test(t)) return "programma";
  if (INTERNSHIP_RE.test(t)) return "stage";
  if (SENIOR_RE.test(t)) return "lavoro";
  if (PROGRAMME_RE.test(all)) return "programma";
  if (/tirocinio (?:curriculare|extracurriculare|formativo)|stage (?:curriculare|extracurriculare|retribuito)|internship (?:programme|program|position)|rimborso spese (?:mensile|di)|indennita di (?:stage|tirocinio)/.test(all)) return "stage";
  if (EXPERIENCE_RE.test(all) || /tempo indeterminato|permanent contract|contratto a tempo determinato/.test(all)) return "lavoro";
  return "unknown";
}

export type Eligibility = "laurea-richiesta" | "fine-studi" | "penultimo-anno" | "primo-anno" | "esperienza" | "retribuito" | "non-retribuito";

export const ELIGIBILITY_LABELS: Record<Eligibility, string> = {
  "laurea-richiesta": "Chiede la laurea",
  "fine-studi": "Per chi sta per laurearsi",
  "penultimo-anno": "Per il penultimo anno",
  "primo-anno": "Aperto ai primi anni",
  esperienza: "Chiede esperienza",
  retribuito: "Retribuito",
  "non-retribuito": "Non retribuito",
};

/** Who the ad is for, as codes the ranking understands. Each rule is a phrase found in the text. */
export function extractEligibility(text: string): Eligibility[] {
  const t = fold(text);
  const out = new Set<Eligibility>();
  const finalYear = /laureand|final[- ]year|last year of (?:your|their) (?:studies|degree)|in procinto di laurearsi|graduating in/.test(t);
  if (finalYear) out.add("fine-studi");
  if (/neolaureat|laurea (?:gia )?conseguita|recent graduates?|graduate (?:programme|program|scheme)|(?:have|hold) (?:a|an) (?:bachelor|master)'?s? degree|completed (?:a|your) degree/.test(t) && !/laureand/.test(t)) out.add("laurea-richiesta");
  if (/penultimate year|penultimo anno|second[- ]to[- ]last year/.test(t)) out.add("penultimo-anno");
  if (/first[- ]year|primo anno|1st[- ]year|any year of (?:study|studies)|all years of study|qualsiasi anno/.test(t)) out.add("primo-anno");
  if (EXPERIENCE_RE.test(t)) out.add("esperienza");
  if (/non retribuit|unpaid|senza rimborso|a titolo gratuito/.test(t)) out.add("non-retribuito");
  else if (/rimborso spese|indennita di (?:stage|tirocinio|partecipazione)|paid internship|stipend|retribuit|compenso mensile|\bsalary\b|\bpaid\b/.test(t)) out.add("retribuito");
  return [...out];
}

/** "Stage di 6 mesi", "3-month internship" -> 6, 3. Only plausible internship lengths (1-12). */
export function extractDurationMonths(text: string): number | null {
  const t = fold(text);
  const m = t.match(/(?:durata(?: di)?|di|per|for|a|an?)\s*(\d{1,2})\s*mesi\b/) ?? t.match(/\b(\d{1,2})[- ]?months?\b/) ?? t.match(/\b(\d{1,2})\s*mesi\b/);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 12 ? n : null;
}
