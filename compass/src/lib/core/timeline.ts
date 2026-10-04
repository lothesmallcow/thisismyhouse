import { findPlace } from "./geo";
import { fold } from "./text";

// Experience timeline from a CV's text or a LinkedIn data export. Rule-based and forgiving:
// anything not understood is simply left out, and the person can fix the timeline by hand.

export interface TimelineItem {
  kind: "lavoro" | "studio" | "volontariato" | "altro";
  title: string;
  organization: string;
  city: string | null;
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  current: boolean;
  description: string;
}

const MONTHS: Record<string, number> = {
  gen: 1, gennaio: 1, jan: 1, january: 1,
  feb: 2, febbraio: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  apr: 4, aprile: 4, april: 4,
  mag: 5, maggio: 5, may: 5,
  giu: 6, giugno: 6, jun: 6, june: 6,
  lug: 7, luglio: 7, jul: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  set: 9, settembre: 9, sep: 9, sept: 9, september: 9,
  ott: 10, ottobre: 10, oct: 10, october: 10,
  nov: 11, novembre: 11, november: 11,
  dic: 12, dicembre: 12, dec: 12, december: 12,
};
const NOW_WORDS = /^(oggi|presente|attuale|in corso|ad oggi|present|current|now|today)$/i;
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
/** "2019", "03/2019", "mar 2019", "marzo 2019", "oggi" */
const DATE = `(?:(?:(?:${MONTH_RE})\\.?\\s+|(?:0?[1-9]|1[0-2])[/.-])?(?:19|20)\\d{2}|oggi|presente|attuale|in corso|ad oggi|present|current|now)`;
const RANGE_RE = new RegExp(`^\\s*(?:dal\\s+|da\\s+|from\\s+)?(${DATE})\\s*(?:[-–—]|a|al|to|fino a)\\s*(${DATE})\\b[\\s:,.|-]*`, "i");
const SINGLE_RE = new RegExp(`^\\s*((?:19|20)\\d{2})\\b[\\s:,.|-]+`);

export function parseDate(s: string): { year: number | null; month: number | null; current: boolean } {
  const t = s.trim().toLowerCase();
  if (NOW_WORDS.test(t)) return { year: null, month: null, current: true };
  const y = t.match(/(19|20)\d{2}/)?.[0];
  const num = t.match(/^(0?[1-9]|1[0-2])[/.-]/)?.[1];
  const word = t.match(/^([a-z]+)\.?\s/)?.[1];
  const month = num ? Number(num) : word && MONTHS[word] ? MONTHS[word] : null;
  return { year: y ? Number(y) : null, month, current: false };
}

const SECTION_RULES: [TimelineItem["kind"] | "stop", RegExp][] = [
  ["lavoro", /^(esperienz[ae]( professional[ie]| lavorativ[ae])?|esperienze di lavoro|work experience|experience|professional experience|lavoro)\s*:?$/i],
  ["studio", /^(istruzione( e formazione)?|formazione|studi|titoli di studio|education)\s*:?$/i],
  ["volontariato", /^(volontariato|volunteering|volunteer experience|attivit[aà] extra[- ]?curricolari|associazioni|extracurricular( activities)?)\s*:?$/i],
  ["stop", /^(competenze|skills|lingue|languages|interessi|interests|hobby|certificazioni|certifications|patente|referenze|autorizzo)/i],
];

/** Headings spelled out with letter spacing ("I S T R U Z I O N E", as many designed CVs print them). */
const SQUASHED: [TimelineItem["kind"] | "stop", RegExp][] = [
  ["lavoro", /^(esperienz[ae](professional[ie]|lavorativ[ae])?|esperienzedilavoro|workexperience|experience|professionalexperience|lavoro)$/],
  ["studio", /^(istruzione(eformazione)?|formazione|studi|titolidistudio|education)$/],
  ["volontariato", /^(volontariato|volunteering|volunteerexperience|attivit[aà]extra-?curricolari|associazioni|extracurricular(activities)?)$/],
  ["stop", /^(competenze|skills|lingue|languages|interessi|interests|hobby|certificazioni|certifications|patente|referenze)/],
];

function sectionOf(line: string): [TimelineItem["kind"] | "stop", RegExp] | undefined {
  const head = SECTION_RULES.find(([, re]) => re.test(line.replace(/[^\p{L} :'-]/gu, "").trim()));
  if (head) return head;
  // Mostly one-letter tokens: compare without spaces.
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 4 || tokens.filter((t) => t.length <= 2).length / tokens.length < 0.7) return undefined;
  const squashed = line.toLowerCase().replace(/[^\p{L}-]/gu, "");
  return SQUASHED.find(([, re]) => re.test(squashed));
}

/** Split "Title, Organization, City" / "Title presso Organization" / "Organization - Title" into parts. */
export function splitRole(rest: string, kind: TimelineItem["kind"]): { title: string; organization: string; city: string | null } {
  const clean = rest.replace(/\s+/g, " ").trim().replace(/^[-–—•·|:,]\s*/, "");
  const presso = clean.match(/^(.+?)\s+(?:presso|at|@|c\/o)\s+(.+)$/i);
  if (presso) {
    const [org, city] = presso[2].split(/\s*,\s*/);
    return { title: presso[1].trim(), organization: (org ?? "").trim(), city: city?.trim() || null };
  }
  const parts = clean.split(/\s*[,|]\s*|\s+[-–—]\s+/).filter(Boolean);
  if (parts.length >= 3) return { title: parts[0], organization: parts[1], city: parts.slice(2).join(", ") };
  if (parts.length === 2) {
    // "Liceo scientifico, Milano": the second part is just a town.
    const place = findPlace(parts[1]);
    if (place && fold(place.name) === fold(parts[1])) return { title: parts[0], organization: "", city: place.name };
    // Studies usually read "Degree, School"; work "Role, Company".
    return { title: parts[0], organization: parts[1], city: null };
  }
  return kind === "studio" ? { title: clean, organization: "", city: null } : { title: clean, organization: "", city: null };
}

/** Timeline from the plain text of a CV (Italian or English). */
export function parseCvTimeline(text: string): TimelineItem[] {
  const out: TimelineItem[] = [];
  let section: TimelineItem["kind"] | "stop" | null = null;
  let last: TimelineItem | null = null;
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.replace(/\t/g, " ").trim();
    if (!line) continue;
    const head = sectionOf(line);
    if (head && line.length < 60) {
      section = head[0];
      last = null;
      continue;
    }
    if (section === "stop") continue;
    const range = line.match(RANGE_RE);
    const single = range ? null : line.match(SINGLE_RE);
    const m = range ?? single;
    if (m) {
      const kind: TimelineItem["kind"] = section ?? "lavoro";
      const start = parseDate(m[1]);
      const end = range ? parseDate(range[2]) : { year: start.year, month: null, current: false };
      const rest = line.slice(m[0].length);
      if (!rest.trim()) continue;
      const role = splitRole(rest, kind);
      last = {
        kind,
        ...role,
        startYear: start.year,
        startMonth: start.month,
        endYear: end.current ? null : end.year,
        endMonth: end.current ? null : end.month,
        current: end.current,
        description: "",
      };
      out.push(last);
      continue;
    }
    // Bullet or continuation lines describe the last item.
    if (last && (/^[-–•·*]/.test(line) || line.length > 25)) {
      last.description = (last.description ? last.description + "\n" : "") + line.replace(/^[-–•·*]\s*/, "");
    }
  }
  return out.slice(0, 40);
}

// --- LinkedIn data export ("Settings > Data privacy > Get a copy of your data") -------------------

/** Minimal RFC 4180 CSV reader (quotes, commas and newlines inside quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

/** Positions.csv: Company Name, Title, Description, Location, Started On, Finished On ("Jan 2019"). */
export function parseLinkedInPositions(csv: string): TimelineItem[] {
  return parseCsv(csv)
    .filter((r) => r["Company Name"] || r["Title"])
    .map((r) => {
      const s = parseDate(r["Started On"] ?? "");
      const e = r["Finished On"] ? parseDate(r["Finished On"]) : { year: null, month: null, current: true };
      return {
        kind: "lavoro" as const,
        title: r["Title"] ?? "",
        organization: r["Company Name"] ?? "",
        city: r["Location"] || null,
        startYear: s.year,
        startMonth: s.month,
        endYear: e.current ? null : e.year,
        endMonth: e.current ? null : e.month,
        current: e.current,
        description: r["Description"] ?? "",
      };
    });
}

/** Education.csv: School Name, Start Date, End Date, Notes, Degree Name, Activities. */
export function parseLinkedInEducation(csv: string): TimelineItem[] {
  return parseCsv(csv)
    .filter((r) => r["School Name"])
    .map((r) => {
      const s = parseDate(r["Start Date"] ?? "");
      const e = r["End Date"] ? parseDate(r["End Date"]) : { year: null, month: null, current: true };
      return {
        kind: "studio" as const,
        title: r["Degree Name"] ?? "",
        organization: r["School Name"] ?? "",
        city: null,
        startYear: s.year,
        startMonth: s.month,
        endYear: e.current ? null : e.year,
        endMonth: e.current ? null : e.month,
        current: e.current,
        description: [r["Notes"], r["Activities"]].filter(Boolean).join("\n"),
      };
    });
}

export function formatPeriod(i: { startYear: number | null; startMonth?: number | null; endYear: number | null; endMonth?: number | null; current: boolean }): string {
  const f = (y: number | null, m?: number | null) => (y ? `${m ? `${String(m).padStart(2, "0")}/` : ""}${y}` : "?");
  if (!i.startYear && !i.endYear && !i.current) return "";
  return `${f(i.startYear, i.startMonth)} – ${i.current ? "oggi" : f(i.endYear, i.endMonth)}`;
}
