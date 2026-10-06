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
