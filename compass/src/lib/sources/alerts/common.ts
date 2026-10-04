// Shared helpers for job-alert e-mail parsers. One parser per sender template sits on top
// of these; a generic fallback uses them to at least pull job links and anchor text.

import { parse, type HTMLElement } from "node-html-parser";
import { canonicalUrl } from "../../core/dedupe";
import { findPlace } from "../../core/geo";
import type { RawJob, SourceKind } from "../../core/normalize";
import { fold } from "../../core/text";

export interface AlertParseResult {
  jobs: RawJob[];
  /** Job links found whose card could not be parsed (template probably changed). */
  failures: number;
}

const BLOCK_TAGS = new Set(["TD", "TR", "TABLE", "DIV", "LI", "SECTION", "ARTICLE", "TBODY"]);
const NOISE_LINE =
  /^(visualizza|vedi|candidati|candidatura semplice|candidatura semplificata|easy apply|apply|nuovo|nuova|new|promoted|promossa|sponsorizzat|salva|save|logo|\d+ candidati|\d+ applicants|attivamente|actively)/i;

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function cleanLine(s: string): string {
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

/** Lines of visible text inside an element (block-level breaks preserved). */
export function blockLines(el: HTMLElement): string[] {
  return el.structuredText
    .split("\n")
    .map(cleanLine)
    .filter((l) => l.length > 0);
}

/** Smallest ancestor that looks like a "card" around a link: has a few lines, not the whole e-mail. */
export function cardFor(a: HTMLElement, maxChars = 700): HTMLElement {
  let best: HTMLElement = a;
  let el: HTMLElement | null = a.parentNode as HTMLElement | null;
  while (el && el.tagName) {
    if (BLOCK_TAGS.has(el.tagName)) {
      const len = el.text.replace(/\s+/g, " ").trim().length;
      if (len > maxChars) break;
      best = el;
      // Stop as soon as the block contains more than the link itself (title + company line).
      if (blockLines(el).length >= 3) break;
    }
    el = el.parentNode as HTMLElement | null;
  }
  return best;
}

export interface Card {
  url: string;
  title: string;
  lines: string[]; // lines of the card after the title
}

/** Group job links by canonical URL and return one card per job. */
export function cardsFromHtml(html: string, isJobHref: (href: string) => boolean): { cards: Card[]; failures: number } {
  const root = parse(html);
  const byUrl = new Map<string, { anchors: HTMLElement[] }>();
  for (const a of root.querySelectorAll("a")) {
    const href = decodeEntities(a.getAttribute("href") ?? "");
    if (!href || !isJobHref(href)) continue;
    const key = canonicalUrl(href);
    const entry = byUrl.get(key) ?? { anchors: [] };
    entry.anchors.push(a);
    byUrl.set(key, entry);
  }
  const cards: Card[] = [];
  let failures = 0;
  for (const [url, { anchors }] of byUrl) {
    const titled = anchors
      .map((a) => ({ a, t: cleanLine(a.text) }))
      .filter(({ t }) => t.length >= 3 && t.length <= 150 && !NOISE_LINE.test(t));
    if (titled.length === 0) {
      failures++;
      continue;
    }
    const { a, t } = titled.sort((x, y) => y.t.length - x.t.length)[0];
    const lines = blockLines(cardFor(a));
    const i = lines.findIndex((l) => l === t || l.includes(t));
    cards.push({ url, title: t, lines: (i >= 0 ? lines.slice(i + 1) : lines.filter((l) => l !== t)).filter((l) => !NOISE_LINE.test(l)) });
  }
  return { cards, failures };
}

const SALARY_LINE = /(€|eur\b|euro|\bral\b|retribuzion|stipendio|al mese|all'ora|l'anno|\/mese|\/ora|lordi|netti)/i;
const CONTRACT_LINE = /(tempo (in)?determinato|part[- ]?time|full[- ]?time|apprendistato|stage|tirocinio|somministrazione|contratto)/i;

/**
 * Turn the lines under a title into company / location / salary / snippet.
 * Handles "Company · Location" (one line) and "Company" + "Location" (two lines).
 */
export function interpretLines(lines: string[]): { company: string | null; location: string | null; salary: string | null; extra: string[] } {
  let company: string | null = null;
  let location: string | null = null;
  let salary: string | null = null;
  const extra: string[] = [];
  for (const line of lines) {
    if (!salary && SALARY_LINE.test(line) && /\d/.test(line)) {
      salary = line;
      continue;
    }
    if (!company && /\s[·•|–-]\s/.test(line) && !SALARY_LINE.test(line)) {
      const [c, ...rest] = line.split(/\s[·•|–]\s|\s-\s/);
      company = c.trim() || null;
      location = rest.join(", ").trim() || null;
      continue;
    }
    if (!company && !CONTRACT_LINE.test(line) && line.length <= 80 && !findPlaceStrict(line)) {
      company = line;
      continue;
    }
    if (!location && (findPlaceStrict(line) || /remoto|remote|italia/i.test(line)) && line.length <= 80) {
      location = line;
      continue;
    }
    extra.push(line);
  }
  return { company, location, salary, extra };
}

const REGIONS =
  /\b(piemonte|lombardia|liguria|valle d'aosta|veneto|trentino alto adige|trentino|alto adige|friuli venezia giulia|friuli|emilia romagna|emilia|toscana|umbria|marche|lazio|abruzzo|molise|campania|puglia|basilicata|calabria|sicilia|sardegna|lombardy|tuscany|sicily|sardinia|piedmont|apulia|italia|italy|provincia di|area metropolitana di|citta metropolitana di|remoto|ibrido|hybrid|remote|in sede|on site)\b/g;

/** A line that is only a place ("Torino, Piemonte, Italia", "Moncalieri (TO)"), not "Hotel Belvedere Torino". */
function findPlaceStrict(line: string): boolean {
  if (line.length > 70) return false;
  const p = findPlace(line);
  if (!p) return false;
  const rest = fold(line)
    .replace(fold(p.name), " ")
    .replace(REGIONS, " ")
    .replace(/\b[a-z]{2}\b/g, " ") // province codes
    .replace(/[\d(),.\-·/]/g, " ")
    .trim();
  return rest.length === 0;
}

export function cardToRawJob(card: Card, source: SourceKind, receivedAt: Date): RawJob {
  const { company, location, salary, extra } = interpretLines(card.lines);
  const description = extra.join("\n");
  return {
    source,
    url: card.url,
    title: card.title,
    company,
    location,
    salaryText: salary,
    description,
    postedAt: receivedAt,
    thin: description.length < 120,
  };
}

/** Plain-text fallback: "Title\nCompany\nLocation\n...https://link". */
export function cardsFromText(text: string, linkRe: RegExp): Card[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const cards: Card[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(linkRe);
    if (!m) continue;
    // Walk back to the previous blank line to find the card.
    let start = i - 1;
    while (start > 0 && lines[start - 1] !== "") start--;
    const block = lines.slice(start, i).filter(Boolean).filter((l) => !NOISE_LINE.test(l));
    const linkLineText = lines[i].replace(m[0], "").replace(/[:\s]+$/, "").trim();
    if (block.length === 0) continue;
    cards.push({ url: canonicalUrl(m[0]), title: block[0], lines: [...block.slice(1), ...(linkLineText && !NOISE_LINE.test(linkLineText) ? [linkLineText] : [])] });
  }
  return cards;
}
