// Duplicate detection across sources (email alerts, APIs, W1, W2, W3, manual).
// Primary key: normalized company + title + city. Fuzzy fallback: same company and city,
// titles with Jaccard similarity >= 0.6. Thin records without company dedupe on their URL.

import { fold, jaccard, keyTokens } from "./text";

const COMPANY_SUFFIXES =
  /\b(s\.?\s?r\.?\s?l\.?s?|s\.?\s?p\.?\s?a\.?|s\.?\s?n\.?\s?c\.?|s\.?\s?a\.?\s?s\.?|s\.?\s?c\.?\s?a\.?\s?r\.?\s?l\.?|soc(?:ieta)?\.? coop(?:erativa)?\.?|onlus|unipersonale|group|gruppo|italia|italy|spa|srl|ltd|inc|gmbh)\b/g;

export function normalizeCompany(company: string | null | undefined): string {
  if (!company) return "";
  return fold(company)
    .replace(COMPANY_SUFFIXES, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TITLE_NOISE = /\(.*?\)|\b(m\/f|f\/m|m\/w|h\/f|anche prima esperienza|urgente|cercasi|si ricerca|ricerchiamo)\b/g;

export function normalizeTitle(title: string): string {
  const t = fold(title).replace(TITLE_NOISE, " ").replace(/\/[a-z]\b/g, " ");
  return keyTokens(t).sort().join(" ");
}

export function normalizeCity(city: string | null | undefined): string {
  return city ? fold(city).replace(/[^a-z ]/g, "").trim() : "";
}

export function dedupeKey(job: { company?: string | null; title: string; city?: string | null }): string {
  return [normalizeCompany(job.company), normalizeTitle(job.title), normalizeCity(job.city)].join("|");
}

const TRACKING_PARAMS = /^(utm_|ref|refid|trk|trackingid|src|source|from|fbclid|gclid|mc_|campaign|position|pagenum|alertid|tk|lipi)/i;

/** Canonical URL: no tracking params, no fragment, platform job ids normalized. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    const host = u.hostname.replace(/^www\.|^it\.|^m\./, "");
    // LinkedIn: /jobs/view/<slug>-<id>/ or currentJobId=<id>
    if (host.endsWith("linkedin.com")) {
      const id = u.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d{6,})/)?.[1] ?? u.searchParams.get("currentJobId");
      if (id) return `https://www.linkedin.com/jobs/view/${id}`;
    }
    // Indeed: viewjob?jk=<id> or rc/clk?jk=<id>
    if (host.endsWith("indeed.com")) {
      const jk = u.searchParams.get("jk") ?? u.searchParams.get("vjk");
      if (jk) return `https://it.indeed.com/viewjob?jk=${jk}`;
    }
    for (const k of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(k)) u.searchParams.delete(k);
    const path = u.pathname.replace(/\/+$/, "");
    const qs = u.searchParams.toString();
    return `${u.protocol}//${host}${path}${qs ? "?" + qs : ""}`;
  } catch {
    return raw.trim();
  }
}

export interface DedupeCandidate {
  id: number;
  company: string | null;
  title: string;
  city: string | null;
  urls: string[];
}

/**
 * Find an existing job that is the same as `incoming`. Returns its id or null.
 */
export function findDuplicate(
  incoming: { company?: string | null; title: string; city?: string | null; url?: string | null },
  existing: DedupeCandidate[],
): number | null {
  const url = incoming.url ? canonicalUrl(incoming.url) : null;
  if (url) {
    const hit = existing.find((e) => e.urls.some((u) => canonicalUrl(u) === url));
    if (hit) return hit.id;
  }
  const comp = normalizeCompany(incoming.company);
  const city = normalizeCity(incoming.city);
  if (!comp) return null; // thin record: only URL dedupe is safe
  const key = dedupeKey(incoming);
  const exact = existing.find((e) => dedupeKey(e) === key);
  if (exact) return exact.id;
  const tt = normalizeTitle(incoming.title).split(" ");
  for (const e of existing) {
    if (normalizeCompany(e.company) !== comp) continue;
    const ec = normalizeCity(e.city);
    if (city && ec && city !== ec) continue;
    if (jaccard(tt, normalizeTitle(e.title).split(" ")) >= 0.6) return e.id;
  }
  return null;
}
