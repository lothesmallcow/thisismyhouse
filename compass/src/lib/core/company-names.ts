// Company NAMES on a page that lists many (an early-careers tracker): the companies of our catalog it
// mentions, and the names written as the first cell of a table row or the start of a list item next
// to a programme ("Blackstone - 2027 EMEA Spring Insight"). Only names: dates and texts stay theirs.
import { parse } from "node-html-parser";
import { fold } from "./text";

const LEGAL = /\b(?:plc|p l c|inc|incorporated|ltd|limited|llc|llp|lp|s ?p ?a|s ?r ?l|s ?a|ag|se|nv|n v|bv|gmbh|kgaa|corp|corporation|company|group|holdings?|holding|the)\b/g;

/** "Barclays PLC" → "barclays", "Rothschild & Co" → "rothschild & co", "J.P. Morgan" → "jp morgan". */
export function nameKey(name: string): string {
  let k = fold(name)
    .replace(/\./g, "")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();
  // Legal words only at the end ("Group" in "Boston Consulting Group" stays in the middle).
  for (let i = 0; i < 3; i++) k = k.replace(new RegExp(`\\s+(?:${LEGAL.source.slice(5, -3)})$`), "").trim();
  return k.replace(/^the\s+/, "");
}

/** Words that look like names on these pages but are not companies. */
const COMMON = new Set(
  "next target compass open opens opened apply applied applications application spring week weeks insight insights summer winter autumn london uk emea europe europa bank banking capital partners global first the and new one day days news blog home careers career jobs job about contact privacy terms cookies programme programmes program programs internship internships intern interns deadline deadlines status closed close closing rolling register interest expected confirmed live soon date dates tbc tbd n a yes no all any firm firms company companies sector sectors investment management markets consulting law technology tech finance financial services asset private equity hedge fund funds trading research quant graduate graduates students student university universities search filter filters sort more less read view see login sign log up out menu january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday diversity women discovery virtual online in person hybrid"
    .split(" "),
);

export interface KnownCompany {
  id: number;
  name: string;
  /** Other names ("JPMorgan", "J.P. Morgan"). */
  aliases: string[];
}

const usable = (k: string) => k.length >= 3 && !COMMON.has(k) && !/^\d+$/.test(k);

/** The catalog companies the page mentions (by name or alias, as whole words). */
export function knownNamesIn(text: string, known: KnownCompany[]): KnownCompany[] {
  const t = ` ${fold(text).replace(/\./g, "").replace(/[^a-z0-9&]+/g, " ")} `;
  return known.filter((c) => [c.name, ...c.aliases].map(nameKey).filter(usable).some((k) => t.includes(` ${k} `)));
}

const CUT = /\s+(?:[-–—|:•·(]|\b20\d\d\b|\b(?:spring|insight|summer|winter|autumn|off[- ]cycle|internships?|discovery|graduate|programmes?|programs?|weeks?|emea|uk|london|europe|apac|americas|global markets|ibd|investment banking|early careers)\b)/i;

/** "Blackstone – 2027 EMEA Spring Insight" → "Blackstone"; null when it does not look like a name. */
export function leadingName(s: string): string | null {
  const head = s.replace(/\s+/g, " ").trim().split(CUT)[0].trim().replace(/[,;:.]$/, "");
  if (head.length < 2 || head.length > 40) return null;
  const words = head.split(" ");
  if (words.length > 5) return null;
  if (!/^[A-Z0-9]/.test(head)) return null; // names are written with a capital
  if (words.every((w) => COMMON.has(fold(w).replace(/[^a-z0-9&]/g, "")))) return null;
  if (/^(?:\d+|[A-Z][a-z]+ \d{1,2})$/.test(head)) return null; // "2027", "October 16"
  return head;
}

const PROGRAMME = /spring|insight|summer|internship|intern\b|discovery|off[- ]cycle|graduate|programme|program|early careers|stage|tirocin/i;
const JSON_NAME = /"(?:company|companyName|company_name|firm|firmName|firm_name|employer|employerName|employer_name|organisation|organization|organizationName)"\s*:\s*"([^"\\]{2,60})"/g;

/**
 * Names the page shows as the first cell of a row, the start of a list item or a heading next to a
 * programme, and the company fields of the data embedded in it. At most `max`.
 */
export function listedNamesIn(html: string, max = 200): string[] {
  const out = new Set<string>();
  const add = (s: string | null) => {
    if (s && out.size < max) out.add(s);
  };
  for (const m of html.matchAll(JSON_NAME)) add(leadingName(m[1]));
  const root = parse(html, { blockTextElements: { script: false, style: false } });
  for (const row of root.querySelectorAll("tr")) {
    const cells = row.querySelectorAll("td, th");
    if (cells.length >= 2 && PROGRAMME.test(row.text)) add(leadingName(cells[0].text));
  }
  for (const el of root.querySelectorAll("li, h2, h3, h4, dt")) {
    const text = el.text.replace(/\s+/g, " ").trim();
    if (text.length <= 140 && PROGRAMME.test(text)) add(leadingName(text));
  }
  // Cards: a heading or a strong name followed by a line that names a programme.
  for (const el of root.querySelectorAll("strong, b, h5, h6, [class*=company], [class*=firm], [class*=employer]")) {
    const text = el.text.replace(/\s+/g, " ").trim();
    const around = el.parentNode?.text ?? "";
    if (text.length <= 40 && PROGRAMME.test(around)) add(leadingName(text));
  }
  return [...out];
}

/** The catalog company named first in the text (longer names win at the same place: "Banco BPM" over "BPM"). */
export function firstKnownName<T extends KnownCompany>(text: string, known: T[]): T | null {
  const t = ` ${fold(text).replace(/\./g, "").replace(/[^a-z0-9&]+/g, " ")} `;
  let best: { c: T; at: number; len: number } | null = null;
  for (const c of known) {
    for (const k of [c.name, ...c.aliases].map(nameKey).filter(usable)) {
      const at = t.indexOf(` ${k} `);
      if (at >= 0 && (!best || at < best.at || (at === best.at && k.length > best.len))) best = { c, at, len: k.length };
    }
  }
  return best?.c ?? null;
}

/** The company in a job link: LinkedIn "…/jobs/view/analyst-at-intesa-sanpaolo-4012345", job boards' "/company/<slug>". */
export function companyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).toLowerCase();
    const li = path.match(/\/jobs\/view\/[a-z0-9-]*?-(?:at|presso|bei|chez)-([a-z0-9-]+?)-\d{6,}/);
    const board = path.match(/\/(?:company|companies|azienda|aziende|cmp|employer)\/([a-z0-9-]{2,60})/);
    const slug = li?.[1] ?? board?.[1];
    if (!slug) return null;
    return slug
      .split("-")
      .filter(Boolean)
      .map((w) => (w.length <= 3 && !/^(di|de|la|del|and|e)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
      .join(" ");
  } catch {
    return null;
  }
}

/** The company written in a title: "Analyst at Goldman Sachs", "Stage presso Banca Esempio", "Rossi Srl cerca impiegata". */
export function companyFromTitle(title: string): string | null {
  const m = title.match(/\s(?:at|presso|@|bei|chez)\s+([A-Z0-9][\w&.'’ -]{1,50}?)(?:\s*[-–|(,]|$)/) ?? title.match(/^([A-Z0-9][\w&.'’ -]{1,40}?)\s+(?:cerca|assume|is hiring|sta assumendo|seleziona|ricerca)\b/i);
  return m ? (leadingName(m[1].trim()) ?? null) : null;
}

/** The catalog company the text names most (at least twice), or the only one it names at all. */
export function mostNamed<T extends KnownCompany>(text: string, known: T[]): T | null {
  const t = ` ${fold(text).replace(/\./g, "").replace(/[^a-z0-9&]+/g, " ")} `;
  const counts: { c: T; n: number }[] = [];
  for (const c of known) {
    let n = 0;
    for (const k of new Set([c.name, ...c.aliases].map(nameKey).filter(usable))) {
      for (let at = t.indexOf(` ${k} `); at >= 0; at = t.indexOf(` ${k} `, at + 1)) n++;
    }
    if (n) counts.push({ c, n });
  }
  if (!counts.length) return null;
  counts.sort((a, b) => b.n - a.n);
  if (counts.length === 1) return counts[0].c;
  return counts[0].n >= 2 && counts[0].n > counts[1].n ? counts[0].c : null;
}

/** Words that follow "About"/"Join" without being a company ("About Us", "Join Our Team"). */
const NOT_A_NAME = new Set("us you me we our the this that a an role team job position opportunity company azienda ruolo posizione noi il lo la un una nostro nostra nostri siamo".split(" "));
/** Words that describe a firm without naming it ("Società di consulenza", "Primaria banca italiana"). */
const GENERIC = new Set("societa di consulenza cliente client clients azienda aziende gruppo group firm bank banca importante primaria primario prestigiosa prestigioso multinazionale realta leader settore nel nella del della dei italiana italiano internazionale international leading global studio agenzia agency".split(" "));

const LABELLED = [
  // "Azienda: Banca Esempio", "Company: Acme Ltd", "Employer – Acme"
  /(?:^|\n)\s*(?:azienda|società|societa|company|employer|datore di lavoro|organisation|organization|unternehmen|entreprise)\s*[:\-–]\s*([^\n]{2,60})/gi,
  // "About Banca Esempio", "Join Acme in Milan", "Lavora con Acme"
  /\b(?:[Aa]bout|[Jj]oin|[Ll]avora con|[Ee]ntra in|[Üü]ber)\s+([A-Z0-9][\w&.'’ -]{1,40}?)(?=[\n.,:;!?(]|\s+(?:in|a|as|come|and|e|is|è|team)\b|$)/g,
  // "Banca Esempio is a leading…", "Banca Esempio è una società…", "Banca Esempio, leader nel…"
  /(?:^|[\n.]\s*)([A-Z0-9][\w&.'’ -]{1,40}?)(?:\s+(?:is|è|est|ist)\s+(?:a|an|the|una?|uno|il|la|une?|eine?|der|die)\s+(?:leading|global|international|world|società|azienda|banca|gruppo|realtà|leader|multinazionale|company|firm|bank|group|société|entreprise|unternehmen)|,\s+(?:leader|a leading|a global|società|azienda|gruppo)\b)/g,
];

/** A company the text states plainly ("Azienda: X", "About X", "X is a leading…"): the first one. */
export function companyFromText(text: string): string | null {
  let best: { name: string; at: number } | null = null;
  for (const re of LABELLED) {
    for (const m of text.matchAll(re)) {
      const raw = m[1].split(/(?<=[a-zà-ü]{2})\.\s+/).pop()!.trim(); // the last sentence ("Il ruolo. Fondo Alfa"), not "J.P. Morgan"
      const first = fold(raw.split(/\s+/)[0] ?? "").replace(/[^a-z0-9&]/g, "");
      if (NOT_A_NAME.has(first)) continue;
      const words = fold(raw).replace(/[^a-z0-9& ]/g, " ").split(/\s+/).filter(Boolean);
      if (words.every((w) => NOT_A_NAME.has(w) || GENERIC.has(w) || COMMON.has(w))) continue;
      const name = leadingName(raw);
      if (name && (!best || (m.index ?? 0) < best.at)) best = { name, at: m.index ?? 0 };
    }
  }
  return best?.name ?? null;
}

/** The catalog's spelling of a name when it is the same company ("J.P. Morgan" → "JPMorgan Chase" if listed so). */
export function catalogSpelling<T extends KnownCompany>(name: string, known: T[]): T | null {
  const k = nameKey(name);
  if (!usable(k)) return null;
  const compact = k.replace(/ /g, "");
  return known.find((c) => [c.name, ...c.aliases].some((a) => nameKey(a).replace(/ /g, "") === compact)) ?? null;
}

/** Words that are capitalised on job pages without naming the employer (menus, roles, places, sites). */
const NOT_EMPLOYER = new Set(
  (
    "sign signin register login logout apply now save share back next previous skip main content menu cookie cookies policy privacy terms conditions notice statement accept reject manage preferences settings help faq support english italiano deutsch francais language accessibility search find jobs job careers career home homepage about us contact follow " +
    "linkedin indeed glassdoor reed google facebook twitter instagram youtube tiktok whatsapp email e-mail mail microsoft apple android ios app store play download bright network brightnetwork efinancialcareers targetjobs gradcracker prospects trackr stepstone welcome jungle infojobs totaljobs monster adzuna jooble tavily " +
    "internship internships intern interns programme programmes program programs summer spring winter autumn insight analyst analysts associate associates graduate graduates trainee stage tirocinio scheme opportunity opportunities role roles position positions vacancy vacancies team teams division department " +
    "investment banking bank banks capital markets debt equity corporate private wealth management asset assets finance financial services m&a mergers acquisitions advisory sales trading research risk operations technology global markets securities " +
    "full time part permanent contract temporary hybrid remote office location locations london milan milano rome roma paris frankfurt new york city united kingdom states italy italia europe emea uk usa " +
    "january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday today yesterday week weeks month months year years day days " +
    "we you our your the a an and or of in on at to for with by from is are be this that these those it its their us i my me he she they who what when where how why all any more most new"
  ).split(" "),
);

/**
 * The employer as the most frequent name on the page: catalog companies (counted double) and the
 * capitalised names it repeats ("Citadel" four times). Words of the title, of `avoid` (the site's own
 * name) and of menus, roles and places do not count. A name needs two mentions, a catalog one one.
 */
export function mostFrequentName<T extends KnownCompany>(text: string, known: T[], opts: { avoid?: string[]; title?: string } = {}): string | null {
  const avoid = new Set([...(opts.avoid ?? []), opts.title ?? ""].flatMap((s) => fold(s).split(/[^a-z0-9&]+/)).filter((w) => w.length > 1));
  const score = new Map<string, { name: string; n: number }>();
  const add = (key: string, name: string, n: number) => {
    const cur = score.get(key);
    score.set(key, { name: cur?.name ?? name, n: (cur?.n ?? 0) + n });
  };
  // Catalog companies: every mention, counted double.
  const flat = ` ${fold(text).replace(/\./g, "").replace(/[^a-z0-9&]+/g, " ")} `;
  for (const c of known) {
    let n = 0;
    for (const k of new Set([c.name, ...c.aliases].map(nameKey).filter(usable))) {
      if (k.split(" ").every((w) => avoid.has(w) || NOT_EMPLOYER.has(w))) continue;
      for (let at = flat.indexOf(` ${k} `); at >= 0; at = flat.indexOf(` ${k} `, at + 1)) n++;
    }
    if (n) add(`catalog:${c.id}`, c.name, 2 * n);
  }
  // Any capitalised name: "Citadel", "Point72", "BNP Paribas", "J.P. Morgan", "Rothschild & Co".
  const NAME = /\b([A-Z][A-Za-z0-9'’.-]*[A-Za-z0-9](?:\s+(?:&|and|de|di|del|von|van|of|du)?\s*[A-Z][A-Za-z0-9'’.-]*[A-Za-z0-9]){0,3})/g;
  for (const m of text.matchAll(NAME)) {
    const words = m[1].split(/\s+/);
    // Trim menu, role and place words at both ends ("Apply to Citadel" → "Citadel").
    const isNoise = (w: string) => {
      const f = fold(w).replace(/[^a-z0-9&]/g, "");
      return !f || NOT_EMPLOYER.has(f) || avoid.has(f) || COMMON.has(f) || /^\d+$/.test(f);
    };
    while (words.length && isNoise(words[0])) words.shift();
    while (words.length && (isNoise(words[words.length - 1]) || /^(?:&|and|de|di|del|von|van|of|du)$/i.test(words[words.length - 1]))) words.pop();
    if (!words.length) continue;
    const name = words.join(" ");
    const key = nameKey(name);
    if (key.replace(/[^a-z0-9]/g, "").length < 3 || words.length > 4) continue;
    add(`name:${key}`, name, 1);
  }
  let best: { name: string; n: number; catalog: boolean } | null = null;
  for (const [k, v] of score) {
    const catalog = k.startsWith("catalog:");
    if (!catalog && v.n < 2) continue;
    if (!best || v.n > best.n || (v.n === best.n && catalog && !best.catalog)) best = { ...v, catalog };
  }
  if (!best) return null;
  // A free name that is a catalog company's: the catalog's spelling.
  return best.catalog ? best.name : (catalogSpelling(best.name, known)?.name ?? best.name);
}
