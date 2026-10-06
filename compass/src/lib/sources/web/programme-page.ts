// An official programme or internship page (the firm's own site or its job board) read as one offer:
// title, place and the page's own text, from which normalize() takes the type, the dates (deadline,
// opening, when it runs, rolling) and who it is for. JSON-LD JobPosting is used first when present.
import { parse } from "node-html-parser";
import type { RawJob } from "../../core/normalize";
import { findPlace } from "../../core/geo";
import { fold } from "../../core/text";
import { htmlToText } from "../http";
import { extractJobsFromHtml } from "./jsonld";

/** A programme, an internship or an early-careers event: the pages worth turning into an offer. */
export const PROGRAMME_WORDS =
  /spring (?:week|insight|internship|programme|program)|insight (?:day|days|week|programme|program|event|series)|discovery (?:day|days|week|programme|program)|early (?:careers|insights?)|first[- ]year (?:programme|program|insight)|summer (?:internship|analyst|programme|program)|off[- ]cycle|internship|intern\b|stage|tirocini|praktikum|werkstudent|stagiaire|graduate (?:programme|program|scheme)/;

const NOISE = ["script", "style", "noscript", "svg", "nav", "footer", "header", "form", "iframe", "template"];

function titleOf(root: ReturnType<typeof parse>): string {
  const og = root.querySelector('meta[property="og:title"]')?.getAttribute("content");
  const h1 = root.querySelector("h1")?.text;
  const t = root.querySelector("title")?.text;
  const pick = [h1, og, t].map((x) => (x ?? "").replace(/\s+/g, " ").trim()).find((x) => x.length >= 4) ?? "";
  // "Spring Insight Programme | Careers | Firm" → the part that names the programme
  const parts = pick.split(/\s+[|·–—-]\s+/);
  return (parts.find((p) => PROGRAMME_WORDS.test(fold(p))) ?? parts[0]).slice(0, 160);
}

/** The place: a "Location: …" line first, then the title, then the opening text. */
function placeOf(text: string, title: string): string | null {
  const line = text.match(/(?:^|\n)\s*(?:location|locations|office|based in|sede|luogo|standort|arbeitsort|lieu)\s*[:\-–]?\s*([^\n]{2,80})/i);
  for (const cand of [line?.[1], title, text.slice(0, 600)]) {
    if (!cand) continue;
    const p = findPlace(cand);
    if (p) return line?.[1] && cand === line[1] ? cand.trim() : p.name;
  }
  return line?.[1]?.trim() ?? null;
}

/** The readable text of the page (no menus, scripts or footers), at most `max` characters. */
export function pageText(html: string, max = 8000): { title: string; text: string } {
  const root = parse(html, { blockTextElements: { script: true, style: true, noscript: true } });
  const title = titleOf(root);
  for (const tag of NOISE) root.querySelectorAll(tag).forEach((n) => n.remove());
  const main = root.querySelector("main") ?? root.querySelector("article") ?? root.querySelector('[role="main"]') ?? root.querySelector("body") ?? root;
  const text = htmlToText(main.innerHTML)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, max);
  return { title, text };
}

/**
 * The offer on an official page, or null when the page is not about a programme or an internship
 * (a careers home, a news article). `company` is who the page belongs to.
 */
export function programmeFromPage(html: string, url: string, company: string, now = new Date()): RawJob | null {
  const ld = extractJobsFromHtml(html, url, now);
  if (ld.length) return { ...ld[0], company: ld[0].company || company };
  const { title, text } = pageText(html);
  if (!title || !PROGRAMME_WORDS.test(fold(`${title}\n${text.slice(0, 1500)}`))) return null;
  if (text.length < 150) return null; // a shell page drawn by JavaScript: nothing to read
  return { source: "w2", url, title, company, location: placeOf(text, title), description: text };
}
