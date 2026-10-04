// Jooble REST API (Italian key from it.jooble.org/api/about). The free key has a small
// LIFETIME quota (about 500 requests), so this source is off by default and used sparingly.
import type { RawJob } from "../../core/normalize";
import { htmlToText, request, HttpError, type FetchLike } from "../http";

interface JoobleJob {
  id: number | string;
  title: string;
  location: string;
  snippet: string;
  salary: string;
  source: string;
  type: string;
  link: string;
  company: string;
  updated: string;
}

export async function fetchJooble(fetchImpl: FetchLike, key: string, q: { keywords: string; location: string; radiusKm: number }): Promise<RawJob[]> {
  const res = await request(fetchImpl, `https://it.jooble.org/api/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: q.keywords, location: q.location, radius: String(q.radiusKm), page: "1" }),
  });
  if (!res.ok) throw new HttpError(res.status, "jooble");
  const data = (await res.json()) as { jobs?: JoobleJob[] };
  return (data.jobs ?? []).map(mapJooble);
}

export function mapJooble(j: JoobleJob): RawJob {
  return {
    source: "api:jooble",
    externalId: String(j.id),
    url: j.link,
    title: htmlToText(j.title),
    company: j.company || null,
    location: j.location || null,
    description: htmlToText(j.snippet ?? ""),
    salaryText: j.salary || null,
    postedAt: j.updated ? new Date(j.updated) : null,
    thin: true,
  };
}
