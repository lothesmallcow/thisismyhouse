// Generic schema.org JobPosting extractor (JSON-LD). Sites publish this for search engines;
// it often includes title, employmentType, jobLocation, datePosted, validThrough, baseSalary.
import { parse } from "node-html-parser";
import type { Contract, Hours, Remote } from "../../core/extract";
import type { RawJob } from "../../core/normalize";
import { htmlToText } from "../http";

type Json = Record<string, unknown>;

function asArray<T = Json>(x: T | T[] | undefined | null): T[] {
  return x == null ? [] : Array.isArray(x) ? x : [x];
}

function isJobPosting(o: Json): boolean {
  return asArray(o["@type"] as string | string[]).some((t) => String(t).toLowerCase() === "jobposting");
}

function collect(node: unknown, out: Json[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => collect(n, out));
  const o = node as Json;
  if (isJobPosting(o)) out.push(o);
  if (o["@graph"]) collect(o["@graph"], out);
}

export function findJobPostings(html: string): Json[] {
  const root = parse(html, { blockTextElements: { script: true } });
  const out: Json[] = [];
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collect(JSON.parse(s.text.trim().replace(/^\s*<!--|-->\s*$/g, "")), out);
    } catch {
      // Broken JSON-LD on a page is common; skip it.
    }
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

function employment(types: unknown): { hours?: Hours; contract?: Contract } {
  const t = asArray(types as string | string[]).map((x) => String(x).toUpperCase());
  return {
    hours: t.includes("PART_TIME") ? "part" : t.includes("FULL_TIME") ? "full" : undefined,
    contract: t.includes("INTERN") ? "stage" : t.includes("TEMPORARY") ? "determinato" : t.includes("CONTRACTOR") ? "partita_iva" : undefined,
  };
}

function salary(base: unknown): { text: string | null; min?: number; max?: number } {
  const b = asArray<Json>(base as Json)[0];
  if (!b) return { text: null };
  const v = (b.value ?? {}) as Json;
  const unit = String(v.unitText ?? b.unitText ?? "").toUpperCase();
  const min = Number(v.minValue ?? v.value ?? b.minValue);
  const max = Number(v.maxValue ?? v.value ?? b.maxValue ?? min);
  if (!Number.isFinite(min) || min <= 0) return { text: null };
  const unitIt = unit === "HOUR" ? "/ora" : unit === "MONTH" ? "al mese" : unit === "WEEK" ? "a settimana" : "l'anno lordi";
  const f = (n: number) => n.toLocaleString("it-IT");
  return { text: `${f(min)}${max !== min ? ` - ${f(max)}` : ""} € ${unitIt}`, min: unit === "YEAR" ? min : undefined, max: unit === "YEAR" ? max : undefined };
}

/** The country as a word the place lookup understands ("US" → "USA"), so "New York, USA" is not York in England. */
const COUNTRY_WORD: Record<string, string> = { IT: "Italia", GB: "UK", UK: "UK", DE: "Germany", FR: "France", US: "USA", ES: "Spain", NL: "Netherlands", IE: "Ireland", CH: "Switzerland", BE: "Belgium", LU: "Luxembourg" };
function countryWord(v: unknown): string | null {
  const raw = typeof v === "string" ? v : v && typeof v === "object" ? (str((v as Json).name) ?? null) : null;
  if (!raw?.trim()) return null;
  return COUNTRY_WORD[raw.trim().toUpperCase()] ?? raw.trim();
}

export function jobPostingToRaw(o: Json, pageUrl: string): RawJob | null {
  const title = str(o.title) ?? str(o.name);
  if (!title) return null;
  const org = asArray<Json>(o.hiringOrganization as Json)[0];
  const loc = asArray<Json>(o.jobLocation as Json)[0];
  const addr = (loc?.address ?? {}) as Json;
  const locality = str(addr.addressLocality) ?? str(addr.addressRegion);
  const remote: Remote | undefined = String(o.jobLocationType ?? "").toUpperCase() === "TELECOMMUTE" ? "remote" : undefined;
  const sal = salary(o.baseSalary);
  const emp = employment(o.employmentType);
  return {
    source: "w2",
    url: str(o.url) ?? pageUrl,
    externalId: str((asArray<Json>(o.identifier as Json)[0] ?? {}).value) ?? null,
    title,
    company: str(org?.name) ?? (typeof o.hiringOrganization === "string" ? (o.hiringOrganization as string) : null),
    location: [locality, countryWord(addr.addressCountry)].filter(Boolean).join(", ") || null,
    description: htmlToText(str(o.description) ?? ""),
    salaryText: sal.text,
    postedAt: str(o.datePosted) ? new Date(str(o.datePosted)!) : null,
    hints: { ...emp, remote, ...(sal.min ? { minAnnualGross: sal.min, maxAnnualGross: sal.max } : {}), ...(str(o.validThrough) && !Number.isNaN(Date.parse(str(o.validThrough)!)) ? { closesAt: new Date(str(o.validThrough)!) } : {}) },
  };
}

export function extractJobsFromHtml(html: string, pageUrl: string, now = new Date()): RawJob[] {
  return findJobPostings(html)
    .filter((o) => {
      const until = str(o.validThrough);
      return !until || new Date(until).getTime() >= now.getTime();
    })
    .map((o) => jobPostingToRaw(o, pageUrl))
    .filter((j): j is RawJob => j != null);
}

/** Same-site links that look like job detail pages (for career pages without JSON-LD on the list). */
export function jobLinks(html: string, pageUrl: string, max = 20): string[] {
  const base = new URL(pageUrl);
  const root = parse(html);
  const out = new Set<string>();
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    try {
      const u = new URL(href, base);
      if (u.host !== base.host) continue;
      if (!/(job|lavor|offert|posizion|career|carrier|annunc|vacanc|opportunit)/i.test(u.pathname)) continue;
      if (u.href === base.href) continue;
      u.hash = "";
      out.add(u.href);
    } catch {
      /* ignore bad hrefs */
    }
    if (out.size >= max) break;
  }
  return [...out];
}
