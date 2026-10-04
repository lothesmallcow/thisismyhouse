// Adzuna job search API: Italy, UK, Germany, France (country "it", "gb", "de", "fr"). Free developer key, 250 calls/day.
// Docs: https://developer.adzuna.com/  (terms: see docs/adr/0003-job-apis.md)
import type { Contract, Hours } from "../../core/extract";
import type { RawJob } from "../../core/normalize";
import { getJson, type FetchLike } from "../http";

interface AdzunaResult {
  id: string;
  title: string;
  description: string; // snippet, about 500 characters
  created: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: "0" | "1" | number;
  contract_type?: "permanent" | "contract";
  contract_time?: "full_time" | "part_time";
}

export interface AdzunaQuery {
  /** IT, GB, DE or FR (default IT). */
  country?: string;
  what: string;
  where: string;
  distanceKm: number;
  maxDaysOld?: number;
}

export async function fetchAdzuna(fetchImpl: FetchLike, creds: { appId: string; appKey: string }, q: AdzunaQuery): Promise<RawJob[]> {
  const params = new URLSearchParams({
    app_id: creds.appId,
    app_key: creds.appKey,
    what: q.what,
    ...(q.where ? { where: q.where } : {}),
    ...(q.where && q.distanceKm > 0 ? { distance: String(q.distanceKm) } : {}),
    max_days_old: String(q.maxDaysOld ?? 7),
    results_per_page: "50",
    sort_by: "date",
    "content-type": "application/json",
  });
  const data = await getJson<{ results: AdzunaResult[] }>(fetchImpl, `https://api.adzuna.com/v1/api/jobs/${(q.country ?? "IT").toLowerCase()}/search/1?${params}`);
  const pounds = (q.country ?? "IT").toUpperCase() === "GB";
  return (data.results ?? []).map((r) => mapAdzuna(r, pounds));
}

/** `pounds`: UK salaries are in GBP; Compass compares euros, so they are left out rather than misread. */
export function mapAdzuna(r: AdzunaResult, pounds = false): RawJob {
  const predicted = pounds || String(r.salary_is_predicted ?? "0") === "1";
  const contract: Contract | undefined = r.contract_type === "permanent" ? "indeterminato" : r.contract_type === "contract" ? "determinato" : undefined;
  const hours: Hours | undefined = r.contract_time === "full_time" ? "full" : r.contract_time === "part_time" ? "part" : undefined;
  return {
    source: "api:adzuna",
    externalId: String(r.id),
    url: r.redirect_url,
    title: r.title.replace(/<\/?strong>/g, ""),
    company: r.company?.display_name ?? null,
    location: r.location?.display_name ?? null,
    description: r.description.replace(/<\/?strong>/g, ""),
    postedAt: r.created ? new Date(r.created) : null,
    // Adzuna "predicted" salaries are their own estimate: we don't use them as facts.
    hints: {
      contract,
      hours,
      ...(r.salary_min && !predicted ? { minAnnualGross: Math.round(r.salary_min), maxAnnualGross: Math.round(r.salary_max ?? r.salary_min) } : {}),
    },
    thin: true, // Adzuna returns a snippet, not the full ad
  };
}
