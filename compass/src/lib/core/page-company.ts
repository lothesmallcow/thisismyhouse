// Whose page is this? What a person sees at a glance on an offer's page (the logo, the site's name,
// the tab title, the footer) is also in its code: structured data, meta tags, the <title>, the
// copyright line, the logo's alt text, the address. Each clue is a candidate name, best first.
import { parse } from "node-html-parser";
import { fold } from "./text";

/** Job boards firms use for their own offers: an official source. */
export const ATS_HOST = /(^|\.)(tal\.net|myworkdayjobs\.com|greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com|personio\.(de|com)|successfactors\.(com|eu)|oraclecloud\.com|icims\.com|taleo\.net|avature\.net|eightfold\.ai|jobvite\.com|recruitee\.com|teamtailor\.com|breezy\.hr|intervieweb\.it|inrecruiting\.com)$/i;

/** The firm a job-board link belongs to: "rothschildandco.tal.net" → "rothschildandco", "job-boards.greenhouse.io/point72" → "point72". */
export function firmFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (/greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com/.test(host)) return first || null;
    if (ATS_HOST.test(host)) return host.split(".")[0].replace(/^(careers|jobs|www)$/, "") || null;
    return host.replace(/^(www|careers|jobs|career|en|uk)\./, "").split(".")[0];
  } catch {
    return null;
  }
}

/** Names that are the software or the section, not the firm ("Workday", "Careers", "Job Details"). */
const NOT_FIRM =
  /^(?:workday|greenhouse|lever|ashby|smartrecruiters|workable|personio|successfactors|sap successfactors|oracle|oracle cloud|icims|taleo|avature|eightfold|jobvite|recruitee|teamtailor|breezy|phenom|careers?|jobs?|job details?|job search|search jobs|home|homepage|apply|candidate|candidate home|login|sign in|carriere|lavora con noi|offerte di lavoro|opportunit(?:y|ies|à)|early careers|students?|graduates?|internships?|programmes?|programs?|untitled|index|page not found|404|error)$/i;

/** "Citi Careers" → "Citi", "Careers at Rothschild & Co" → "Rothschild & Co", "© 2026 Citigroup Inc." → "Citigroup Inc.". */
function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  let t = s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  t = t
    .replace(/^(?:careers?|jobs?|lavora|opportunities|early careers|students?)\s+(?:at|with|in|con|presso|bei|chez)\s+/i, "")
    .replace(/\s+(?:careers?|jobs?|job board|careers? site|careers? portal|recruiting|recruitment|talent|carriere|lavora con noi|karriere|logo)$/i, "")
    .replace(/^(?:logo|logotipo)\s+(?:of\s+|di\s+)?/i, "")
    .replace(/\s+(?:logo|home(?:page)?)$/i, "")
    .replace(/[,;:.\s]+$/, "")
    .trim();
  if (t.length < 2 || t.length > 50 || t.split(" ").length > 6) return null;
  if (NOT_FIRM.test(fold(t)) || /^\d+$/.test(t)) return null;
  return t;
}

/** Every name the page's code gives for its owner, best first (duplicates removed). */
export function pageCompanyClues(html: string, url: string): string[] {
  const out: string[] = [];
  const add = (s: string | null | undefined) => {
    const c = clean(s);
    if (c && !out.some((o) => fold(o) === fold(c))) out.push(c);
  };
  // 1. Structured data: the job's hiring organisation, then the site's organisation.
  for (const m of html.matchAll(/"hiringOrganization"\s*:\s*(?:\{[^{}]*?"name"\s*:\s*"([^"\\]{2,80})"|"([^"\\]{2,80})")/g)) add(m[1] ?? m[2]);
  for (const m of html.matchAll(/"@type"\s*:\s*"(?:Organization|Corporation|BankOrCreditUnion|FinancialService)"[^{}]*?"name"\s*:\s*"([^"\\]{2,80})"/g)) add(m[1]);
  for (const m of html.matchAll(/"(?:companyName|company_name|employerName|organizationName|hiringCompany)"\s*:\s*"([^"\\]{2,80})"/g)) add(m[1]);
  const root = parse(html, { blockTextElements: { script: false, style: false } });
  const meta = (sel: string) => root.querySelector(sel)?.getAttribute("content");
  // 2. The site's own name.
  add(meta('meta[property="og:site_name"]'));
  add(meta('meta[name="application-name"]'));
  add(meta('meta[name="apple-mobile-web-app-title"]'));
  add(meta('meta[name="twitter:site"]')?.replace(/^@/, ""));
  // 3. The tab title: its last part names the site ("Summer Analyst | Citi Careers").
  const title = (root.querySelector("title")?.text ?? "").replace(/\s+/g, " ").trim();
  const parts = title.split(/\s+[|·–—-]\s+/);
  if (parts.length >= 2) {
    add(parts[parts.length - 1]);
    add(parts[0]);
  }
  // 4. The logo in the page head: its alt text or title.
  for (const img of root.querySelectorAll("header img, nav img, a[class*=logo] img, [class*=logo] img, img[class*=logo], img[id*=logo], img[alt*=logo i]").slice(0, 4)) {
    add(img.getAttribute("alt") ?? img.getAttribute("title"));
  }
  for (const a of root.querySelectorAll("a[class*=logo], a[class*=brand], [class*=logo] a").slice(0, 3)) add(a.getAttribute("aria-label") ?? a.getAttribute("title"));
  // 5. The footer's copyright line.
  const text = root.text.replace(/\s+/g, " ");
  for (const m of text.matchAll(/(?:©|&copy;|\(c\)|copyright)\s*(?:\d{4}\s*(?:[-–]\s*\d{4})?\s*)?([A-Z][\w&.'’ ,-]{1,60}?)(?=\s*(?:\.|,|\||all rights|tutti i diritti|alle rechte|tous droits|$))/gi)) add(m[1]);
  // 6. The address itself (the job board's slug or the firm's domain).
  add(firmFromUrl(url));
  return out;
}
