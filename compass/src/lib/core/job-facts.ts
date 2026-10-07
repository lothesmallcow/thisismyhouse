// What an ad asks and offers, read from its text by rules (Italian and English): years of experience,
// level, education, benefits, shifts, travel, driving licence, protected categories (L. 68/99),
// smart-working days, whether the application is quick or long, whether an agency posted it, and
// whether it is an always-open application rather than a real opening. Each one is a search filter.
// Pure functions; every rule is unit tested (tests/unit/job-facts.test.ts).
import { fold } from "./text";

/** Bump when the rules change: older rows are read again (server/jobs.ts backfillFacts). */
export const FACTS_VERSION = 2;

export type Seniority = "stage" | "junior" | "mid" | "senior" | "manager";
export type Education = "nessuno" | "diploma" | "laurea" | "laurea-magistrale" | "dottorato";
export type Benefit = "buoni-pasto" | "welfare" | "auto" | "sanitaria" | "bonus" | "mensa" | "formazione" | "dispositivi" | "flessibilita" | "quattordicesima";

export interface JobFacts {
  /** Fewest years of experience asked (0: none needed), null when the ad does not say. */
  minYears: number | null;
  seniority: Seniority | null;
  /** Highest title asked, and whether it is required (not just "preferred"). */
  education: Education | null;
  educationRequired: boolean;
  benefits: Benefit[];
  shifts: boolean;
  nights: boolean;
  travel: boolean;
  license: boolean;
  /** Reserved for (or open to) people in protected categories, L. 68/99. */
  protectedCategories: boolean;
  /** Days a week from home, when the ad says (5 = fully remote). */
  smartDays: number | null;
  /** "facile": a short form or an e-mail; "lunga": an account and long forms (Workday, SuccessFactors…). */
  applyEffort: "facile" | "lunga" | null;
  /** Posted by a staffing agency for a client. */
  agency: boolean;
  /** Always open (spontaneous applications, talent pools): not a real opening. */
  evergreen: boolean;
}

export const SENIORITY_LABELS: Record<Seniority, string> = {
  stage: "Stage",
  junior: "Junior / primo impiego",
  mid: "Con qualche anno di esperienza",
  senior: "Senior",
  manager: "Responsabile / manager",
};
export const EDUCATION_LABELS: Record<Education, string> = {
  nessuno: "Nessun titolo richiesto",
  diploma: "Diploma",
  laurea: "Laurea",
  "laurea-magistrale": "Laurea magistrale",
  dottorato: "Dottorato",
};
export const BENEFIT_LABELS: Record<Benefit, string> = {
  "buoni-pasto": "Buoni pasto",
  welfare: "Welfare aziendale",
  auto: "Auto aziendale",
  sanitaria: "Assicurazione sanitaria",
  bonus: "Bonus / premi",
  mensa: "Mensa",
  formazione: "Formazione",
  dispositivi: "PC o telefono aziendale",
  flessibilita: "Orario flessibile",
  quattordicesima: "Quattordicesima",
};

const NUM: Record<string, number> = {
  un: 1, uno: 1, una: 1, one: 1, due: 2, two: 2, tre: 3, three: 3, quattro: 4, four: 4, cinque: 5, five: 5,
  sei: 6, six: 6, sette: 7, seven: 7, otto: 8, eight: 8, dieci: 10, ten: 10,
};
const ADJ_YEARS: [RegExp, number][] = [
  [/esperienza (?:almeno |minima |di )?(?:biennale|di due anni)/, 2],
  [/esperienza (?:almeno |minima )?triennale/, 3],
  [/esperienza (?:almeno |minima )?quinquennale/, 5],
  [/esperienza (?:almeno |minima )?decennale/, 10],
  [/esperienza (?:almeno |minima )?(?:pluriennale|consolidata|comprovata)|(?:pluriennale|consolidata|comprovata) esperienza/, 3],
  [/esperienza (?:almeno |minima )?annuale|esperienza di (?:almeno )?(?:un|1) anno/, 1],
];
const NO_EXPERIENCE = /senza esperienza|anche (?:senza|prima) esperienza|nessuna esperienza|prima esperienza|neolaureat|neo-laureat|neodiplomat|no (?:prior |previous )?experience (?:is )?(?:required|needed)|entry[- ]level|recent graduate|fresh graduate|graduate (?:programme|program)/;

/** Fewest years asked: "almeno 3 anni di esperienza", "3+ years of experience", "2-3 anni", "esperienza triennale". */
export function extractMinYears(text: string): number | null {
  const t = fold(text);
  const found: number[] = [];
  const num = "(\\d{1,2}|un|uno|una|one|due|two|tre|three|quattro|four|cinque|five|sei|six|sette|seven|otto|eight|dieci|ten)";
  const re = new RegExp(
    `(?:almeno|minimo|min\\.?|at least|minimum(?: of)?|oltre|over|more than|piu di)?\\s*${num}\\s*(?:\\+|-\\s*\\d{1,2}|o piu|or more)?\\s*(?:anni|anno|years?|yrs?)\\b[^.\\n]{0,40}?(?:esperienz|experienc|nel ruolo|in a similar|in ruoli|in posizion|nella mansione|di lavoro)`,
    "g",
  );
  for (const m of t.matchAll(re)) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM[m[1]];
    if (n != null && n <= 25) found.push(n);
  }
  // "esperienza di almeno 3 anni", "experience of 5+ years"
  const re2 = new RegExp(`(?:esperienz\\w*|experience)[^.\\n]{0,25}?(?:almeno|minimo|di|of|at least)\\s*${num}\\s*(?:\\+|-\\s*\\d{1,2})?\\s*(?:anni|anno|years?)`, "g");
  for (const m of t.matchAll(re2)) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM[m[1]];
    if (n != null && n <= 25) found.push(n);
  }
  for (const [r, n] of ADJ_YEARS) if (r.test(t)) found.push(n);
  if (found.length) return Math.min(...found);
  return NO_EXPERIENCE.test(t) ? 0 : null;
}

export function extractSeniority(title: string, minYears: number | null): Seniority | null {
  const t = fold(title);
  if (/\b(stage|stagista|tirocin\w*|intern|internship|trainee|praticante|summer analyst)\b/.test(t)) return "stage";
  if (/\b(head of|director|direttore|direttrice|responsabile|manager|capo|chief|vp|vice president|country manager|store manager|dirigente)\b/.test(t) && !/\b(assistant|assistente|junior|account manager|product manager junior)\b/.test(t)) return "manager";
  if (/\b(senior|sr\.?|lead|principal|esperto|esperta|expert|staff engineer)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry|graduate|neolaureat\w*|neodiplomat\w*|apprendista|primo impiego|associate analyst)\b/.test(t)) return "junior";
  if (minYears == null) return null;
  return minYears <= 1 ? "junior" : minYears <= 4 ? "mid" : "senior";
}

const PREFERRED = /preferibil|gradit|costituisce (?:titolo )?(?:di )?preferenz|titolo preferenziale|is a plus|nice to have|preferred|desirable|un plus/;
const EDU_RULES: [Education, RegExp][] = [
  ["dottorato", /dottorato|\bph\.?\s?d\b|doctorate/],
  ["laurea-magistrale", /laurea (?:magistrale|specialistica|quinquennale|a ciclo unico|vecchio ordinamento)|master'?s degree|\bmsc\b|\bm\.sc\b|master of science/],
  ["laurea", /\blaurea\b|laureat[oaie]\b|bachelor|university degree|\bdegree in\b|\bdegree\b|\bbsc\b|titolo universitario/],
  ["diploma", /\bdiploma\b|\bdiplomat[oaie]\b|high school|scuola superiore|maturita/],
  ["nessuno", /licenza media|nessun titolo (?:di studio )?richiesto|no degree required/],
];

export function extractEducation(text: string): { education: Education | null; required: boolean } {
  const t = fold(text);
  // "Diploma o laurea": a diploma is enough.
  const either = /diploma[^.\n]{0,40}\b(?:o|or|oppure)\b[^.\n]{0,25}laurea|laurea[^.\n]{0,25}\b(?:o|or|oppure)\b[^.\n]{0,40}diploma/.exec(t);
  if (either) return { education: "diploma", required: !PREFERRED.test(t.slice(Math.max(0, either.index - 80), either.index + either[0].length + 80)) };
  for (const [edu, re] of EDU_RULES) {
    const m = re.exec(t);
    if (!m) continue;
    // "Laurea in economia" in a sentence saying "preferibile" → asked but not required.
    const around = t.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80);
    return { education: edu, required: !PREFERRED.test(around) };
  }
  return { education: null, required: false };
}

const BENEFIT_RULES: [Benefit, RegExp][] = [
  ["buoni-pasto", /buoni pasto|buono pasto|ticket restaurant|meal vouchers?|ticket pasto/],
  ["welfare", /welfare aziendale|piano (?:di )?welfare|welfare plan|flexible benefits?|flexible benefit/],
  ["auto", /auto aziendale|company car|auto ad uso promiscuo|vettura aziendale/],
  ["sanitaria", /assicurazione sanitaria|assistenza sanitaria integrativa|fondo sanitario|health insurance|private medical/],
  ["bonus", /\bbonus\b|premio di produzione|premi di risultato|\bmbo\b|incentiv\w* (?:economic|sulle vendite)|provvigion/],
  ["mensa", /\bmensa\b|canteen/],
  ["formazione", /formazione (?:continua|retribuita|interna|on the job|costante)|piano di formazione|percorso formativo|training (?:program|budget)/],
  ["dispositivi", /(?:pc|laptop|notebook|smartphone|telefono|cellulare) aziendale|company (?:laptop|phone)/],
  ["flessibilita", /orario flessibile|flessibilita (?:oraria|in entrata)|flexible (?:working )?hours/],
  ["quattordicesima", /quattordicesima|14esima|14ma mensilita|14 mensilita/],
];

export function extractBenefits(text: string): Benefit[] {
  const t = fold(text);
  return BENEFIT_RULES.filter(([, re]) => re.test(t)).map(([b]) => b);
}

/** Days a week from home: "2 giorni di smart working", "smart working 3 gg", "hybrid: 2 days in office" (→ 3 at home). */
export function extractSmartDays(text: string): number | null {
  const t = fold(text);
  if (/full[- ]?remote|100% (?:da remoto|remote|smart)|completamente da remoto|fully remote|interamente da remoto/.test(t)) return 5;
  const n = "(\\d|un|uno|una|one|due|two|tre|three|quattro|four)";
  const home = new RegExp(`${n}\\s*(?:giorn[oi]|gg|days?)\\s*(?:a settimana |alla settimana |per settimana |a week |per week )?(?:di |in )?(?:smart[- ]?working|lavoro agile|da remoto|da casa|remote|from home|wfh)`).exec(t)
    ?? new RegExp(`(?:smart[- ]?working|lavoro agile|remote working|wfh)[^.\\n]{0,20}?${n}\\s*(?:giorn[oi]|gg|days?)`).exec(t);
  if (home) {
    const v = /^\d$/.test(home[1]) ? Number(home[1]) : NUM[home[1]];
    return v != null && v <= 5 ? v : null;
  }
  const office = new RegExp(`${n}\\s*(?:giorn[oi]|gg|days?)\\s*(?:a settimana |alla settimana |a week |per week )?(?:in (?:ufficio|sede|presenza)|in (?:the )?office|on[- ]?site)`).exec(t);
  if (office) {
    const v = /^\d$/.test(office[1]) ? Number(office[1]) : NUM[office[1]];
    return v != null && v <= 5 ? 5 - v : null;
  }
  return null;
}

/** Staffing agencies working in Italy: their ads are for a client company. */
const AGENCIES = /\b(randstad|adecco|manpower|manpowergroup|gi group|gigroup|umana|openjob|openjobmetis|synergie|etjca|orienta|temporary spa|hays|michael page|page personnel|page executive|robert half|spring professional|lavoropiu|tempor spa|trenkwalder|kelly services|akhet|in job|injob|e-work|ework|maw|men at work|staff spa|during spa|quanta spa|obiettivo lavoro|articolo1|articolo 1|sgb humangest|humangest|eurointerim|ali spa|life in|cooperjob|job italia|alma spa|winjob|tempi moderni|lavorint|intempo|nexus|generazione vincente|kelly)\b/;
const FOR_A_CLIENT = /per (?:conto di |un )?(?:importante |nota |prestigios[ao] |primari[ao] |solida |storica )?(?:nostr[oa] )?(?:client[ei]|azienda cliente|realta cliente)|il nostro cliente|our client|on behalf of (?:our|a) client|agenzia per il lavoro|aut\. ?min\.|autorizzazione ministeriale|divisione (?:specializzata|professional)/;

export function isAgency(company: string | null, text: string): boolean {
  if (company && AGENCIES.test(fold(company))) return true;
  return FOR_A_CLIENT.test(fold(text));
}

const LONG_FORMS = /(myworkdayjobs|myworkdaysite|successfactors|sapsf|taleo\.net|icims\.com|oraclecloud\.com|avature\.net|inrecruiting\.com|brassring|kenexa|jobvite\.com|cornerstoneondemand|csod\.com|smartrecruiters\.com\/.+\/apply)/;
const SHORT_FORMS = /(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|recruitee\.com|personio\.(?:de|com)|teamtailor\.com|factorialhr\.com|join\.com|jobs\.smartrecruiters\.com|breezy\.hr|intervieweb\.it)/;

export function applyEffort(urls: string[], applicationEmail: string | null): "facile" | "lunga" | null {
  const all = urls.join(" ").toLowerCase();
  if (LONG_FORMS.test(all)) return "lunga";
  if (applicationEmail || SHORT_FORMS.test(all)) return "facile";
  return null;
}

const EVERGREEN = /candidatur[ae] spontane[ae]|autocandidatura|candidatura libera|talent pool|future opportunit|open application|general application|sempre apert[ao]|spontaneous application|inviaci il tuo cv per future/;

export function extractFacts(input: { title: string; description: string; company: string | null; urls: string[]; applicationEmail: string | null }): JobFacts {
  const text = `${input.title}\n${input.description}`;
  const t = fold(text);
  const minYears = extractMinYears(input.description || input.title);
  const edu = extractEducation(input.description);
  return {
    minYears,
    seniority: extractSeniority(input.title, minYears),
    education: edu.education,
    educationRequired: edu.required,
    benefits: extractBenefits(input.description),
    shifts: /\bturni\b|turnazion|su turni|lavoro a turni|turni (?:diurni|notturni|festivi)|shift work|rotating shifts?|\bshifts?\b/.test(t),
    nights: /turn[io][^.\n]{0,20}notturn|notturno|night shifts?|lavoro notturno/.test(t),
    travel: /trasferte|disponibilita (?:a|alle) (?:trasferte|viaggiare|spostamenti)|frequenti viaggi|travel (?:required|up to|\d+%)|willing(?:ness)? to travel|frequent travel/.test(t),
    license: /patente (?:b|di guida|c|d)\b|patente b|automunit|driving licen[cs]e|own (?:car|vehicle)/.test(t),
    protectedCategories: /categori[ae] protett[ae]|l\.? ?68\/99|legge 68\/1999|legge 68\/99|art\.? ?1,? (?:comma 1 )?(?:della )?l(?:egge)?\.? ?68|art\.? ?18,? (?:comma 2 )?(?:della )?l(?:egge)?\.? ?68/.test(t),
    smartDays: extractSmartDays(input.description),
    applyEffort: applyEffort(input.urls, input.applicationEmail),
    agency: isAgency(input.company, input.description),
    evergreen: EVERGREEN.test(t),
  };
}

export interface FactChip {
  label: string;
  tone: "neutral" | "good" | "warn";
}

/** What the ad asks and offers, as short labels for cards and the offer page (most useful first). */
export function factChips(f: JobFacts | null | undefined, opts: { max?: number } = {}): FactChip[] {
  if (!f) return [];
  const out: FactChip[] = [];
  if (f.evergreen) out.push({ label: "Candidatura sempre aperta, non un posto preciso", tone: "warn" });
  if (f.minYears === 0) out.push({ label: "Anche senza esperienza", tone: "good" });
  else if (f.minYears != null) out.push({ label: `Esperienza: ${f.minYears}+ ${f.minYears === 1 ? "anno" : "anni"}`, tone: "neutral" });
  if (f.education && f.education !== "nessuno") out.push({ label: `${EDUCATION_LABELS[f.education]} ${f.educationRequired ? "richiesta" : "gradita"}`.replace("Diploma richiesta", "Diploma richiesto").replace("Diploma gradita", "Diploma gradito").replace("Dottorato richiesta", "Dottorato richiesto").replace("Dottorato gradita", "Dottorato gradito"), tone: "neutral" });
  if (f.smartDays === 5) out.push({ label: "Sempre da casa", tone: "good" });
  else if (f.smartDays) out.push({ label: `Smart working ${f.smartDays} ${f.smartDays === 1 ? "giorno" : "giorni"} a settimana`, tone: "good" });
  if (f.applyEffort === "facile") out.push({ label: "Candidatura veloce", tone: "good" });
  else if (f.applyEffort === "lunga") out.push({ label: "Candidatura lunga (account e moduli)", tone: "neutral" });
  for (const b of f.benefits.slice(0, 3)) out.push({ label: BENEFIT_LABELS[b], tone: "good" });
  if (f.agency) out.push({ label: "Tramite agenzia", tone: "neutral" });
  if (f.protectedCategories) out.push({ label: "Categorie protette (L. 68/99)", tone: "neutral" });
  if (f.nights) out.push({ label: "Turni anche di notte", tone: "neutral" });
  else if (f.shifts) out.push({ label: "Su turni", tone: "neutral" });
  if (f.travel) out.push({ label: "Trasferte", tone: "neutral" });
  if (f.license) out.push({ label: "Patente richiesta", tone: "neutral" });
  return out.slice(0, opts.max ?? out.length);
}
