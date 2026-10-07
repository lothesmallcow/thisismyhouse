// The job boards large employers run on (banks, consultancies, corporates): Workday, Oracle Recruiting
// Cloud, Eightfold, plus Recruitee. Each one serves its career site from a public JSON endpoint, the
// same one the site's own page calls: no login, no scraping of pages, structured fields (title, place,
// date). Big boards hold thousands of offers, so they are searched with the words people look for,
// not read whole.
import type { CountryCode } from "../../core/geo";
import type { RawJob, SourceKind } from "../../core/normalize";
import { getJson, htmlToText, type FetchLike } from "../http";

export type EnterpriseAts = "workday" | "oracle" | "eightfold" | "recruitee";

/** "Posted Today", "Posted 3 Days Ago", "Posted 30+ Days Ago" → a date. */
export function workdayPosted(s: string | undefined, now: Date): Date | null {
  if (!s) return null;
  if (/today|oggi/i.test(s)) return now;
  if (/yesterday|ieri/i.test(s)) return new Date(now.getTime() - 86_400_000);
  const m = s.match(/(\d+)\+?\s*(day|giorn)/i);
  return m ? new Date(now.getTime() - Number(m[1]) * 86_400_000) : null;
}

/** "barclays.wd3.myworkdayjobs.com/External_Career_Site" → its parts. */
export function splitSlug(slug: string): { host: string; rest: string } {
  const i = slug.indexOf("/");
  return i < 0 ? { host: slug, rest: "" } : { host: slug.slice(0, i), rest: slug.slice(i + 1) };
}

export function enterpriseEndpoint(ats: EnterpriseAts, slug: string): string {
  const { host, rest } = splitSlug(slug);
  switch (ats) {
    case "workday":
      return `https://${host}/wday/cxs/${host.split(".")[0]}/${rest}/jobs`;
    case "oracle":
      return `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`;
    case "eightfold":
      return `https://${host}/api/apply/v2/jobs`;
    case "recruitee":
      return `https://${slug}.recruitee.com/api/offers/`;
  }
}

const clean = (s: string) => s.replace(/[^\p{L}\p{N} &+.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
const src = (ats: EnterpriseAts) => `ats:${ats}` as SourceKind;

/**
 * Offers of one enterprise board. `keywords`: what people search (roles); big boards are asked once per
 * keyword (newest first), at most `perKeyword` offers each. Recruitee boards are small: read whole.
 */
export async function fetchEnterprise(
  fetchImpl: FetchLike,
  ats: EnterpriseAts,
  slug: string,
  company: string,
  opts: { keywords?: string[]; perKeyword?: number; now?: Date; details?: number; countries?: CountryCode[] } = {},
): Promise<RawJob[]> {
  const now = opts.now ?? new Date();
  const perKeyword = opts.perKeyword ?? 20;
  const keywords = [...new Set((opts.keywords?.length ? opts.keywords : [""]).map(clean))].slice(0, 4);
  const out = new Map<string, RawJob>();
  const { host, rest } = splitSlug(slug);
  switch (ats) {
    case "workday": {
      const tenant = host.split(".")[0];
      const endpoint = `https://${host}/wday/cxs/${tenant}/${rest}/jobs`;
      const post = <T,>(body: object) =>
        getJson<T>(fetchImpl, endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "", ...body }) }, { retries: 1 });
      // The board's own country filter (its name changes from board to board: "locationCountry",
      // "Country_and_Jurisdiction"…): offers in the chosen countries only, not the first 20 worldwide.
      const applied = opts.countries?.length ? await workdayCountryFacet(post, opts.countries).catch(() => null) : null;
      for (const kw of keywords) {
        const d = await post<{ jobPostings?: { title?: string; externalPath?: string; locationsText?: string; postedOn?: string; bulletFields?: string[] }[] }>({ limit: Math.min(20, perKeyword), searchText: kw, ...(applied ? { appliedFacets: applied } : {}) });
        for (const j of d.jobPostings ?? []) {
          if (!j.title || !j.externalPath) continue;
          const url = `https://${host}/${rest}${j.externalPath}`;
          out.set(url, {
            source: src(ats),
            externalId: j.bulletFields?.[0] ?? j.externalPath,
            url,
            title: j.title,
            company,
            location: j.locationsText && !/^\d+\s+locations?$/i.test(j.locationsText) ? j.locationsText : null,
            description: "",
            postedAt: workdayPosted(j.postedOn, now),
            thin: true,
          });
        }
      }
      // The first few in full (description, place, start date). The employer stays the board's company:
      // Workday's own field is the legal entity ("1203 Barclays Global Serv. Cen").
      let n = 0;
      for (const [url, job] of out) {
        if (n++ >= (opts.details ?? 8)) break;
        try {
          const path = url.slice(`https://${host}/${rest}`.length);
          const d = await getJson<{ jobPostingInfo?: { jobDescription?: string; location?: string; startDate?: string; timeType?: string } }>(
            fetchImpl,
            `https://${host}/wday/cxs/${tenant}/${rest}${path}`,
            { headers: { Accept: "application/json" } },
            { retries: 0 },
          );
          const info = d.jobPostingInfo ?? {};
          out.set(url, {
            ...job,
            location: info.location ?? job.location,
            description: htmlToText(info.jobDescription ?? ""),
            postedAt: info.startDate ? new Date(info.startDate) : job.postedAt,
            hints: { hours: /part/i.test(info.timeType ?? "") ? "part" : /full/i.test(info.timeType ?? "") ? "full" : undefined },
            thin: !info.jobDescription,
          });
        } catch {
          /* the list entry is enough */
        }
      }
      break;
    }
    case "oracle": {
      type Req = { Id?: string; Title?: string; PostedDate?: string; PrimaryLocation?: string; PrimaryLocationCountry?: string; ShortDescriptionStr?: string; WorkplaceType?: string; secondaryLocations?: { CountryCode?: string; Name?: string }[] };
      const base = `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=`;
      const wanted = new Set((opts.countries ?? []).map((c) => c.toUpperCase()));
      for (const kw of keywords) {
        // Newest first; then only those in the chosen countries (by the requisition's own country code).
        const finder = [`findReqs;siteNumber=${rest}`, kw ? `keyword="${kw}"` : "", `limit=${wanted.size ? 100 : Math.min(25, perKeyword)}`, "offset=0", "sortBy=POSTING_DATES_DESC"].filter(Boolean).join(",");
        const d = await getJson<{ items?: { requisitionList?: Req[] }[] }>(fetchImpl, base + encodeURIComponent(finder), { headers: { Accept: "application/json" } }, { retries: 1 });
        const list = (d.items?.[0]?.requisitionList ?? []).filter((j) => !wanted.size || wanted.has((j.PrimaryLocationCountry ?? "").toUpperCase()) || (j.secondaryLocations ?? []).some((l) => wanted.has((l.CountryCode ?? "").toUpperCase())));
        for (const j of list.slice(0, perKeyword)) {
          if (!j.Id || !j.Title) continue;
          const url = `https://${host}/hcmUI/CandidateExperience/en/sites/${rest}/job/${j.Id}`;
          out.set(url, {
            source: src(ats),
            externalId: j.Id,
            url,
            title: j.Title,
            company,
            location: j.PrimaryLocation ?? null,
            description: htmlToText(j.ShortDescriptionStr ?? ""),
            postedAt: j.PostedDate ? new Date(j.PostedDate) : null,
            hints: { remote: /remote/i.test(j.WorkplaceType ?? "") ? "remote" : /hybrid/i.test(j.WorkplaceType ?? "") ? "hybrid" : undefined },
            thin: true,
          });
        }
      }
      // The first few in full: the description and when applications close.
      let n = 0;
      for (const [url, job] of out) {
        if (n++ >= (opts.details ?? 8)) break;
        try {
          const finder = `ById;Id="${job.externalId}",siteNumber=${rest}`;
          const d = await getJson<{ items?: { ExternalDescriptionStr?: string; ExternalResponsibilitiesStr?: string; ExternalQualificationsStr?: string; ExternalPostedEndDate?: string }[] }>(
            fetchImpl,
            `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=${encodeURIComponent(finder)}`,
            { headers: { Accept: "application/json" } },
            { retries: 0 },
          );
          const r = d.items?.[0];
          if (!r) continue;
          const description = htmlToText([r.ExternalDescriptionStr, r.ExternalResponsibilitiesStr, r.ExternalQualificationsStr].filter(Boolean).join("\n"));
          const until = r.ExternalPostedEndDate ? new Date(r.ExternalPostedEndDate) : null;
          out.set(url, { ...job, description: description || job.description, thin: !description, hints: { ...job.hints, ...(until && !Number.isNaN(until.getTime()) && until.getFullYear() < 4000 ? { closesAt: until } : {}) } });
        } catch {
          /* the list entry is enough */
        }
      }
      break;
    }
    case "eightfold": {
      for (const kw of keywords) {
        const d = await getJson<{ positions?: { id?: number | string; name?: string; location?: string; locations?: string[]; t_create?: number; canonicalPositionUrl?: string; job_description?: string }[] }>(
          fetchImpl,
          `https://${host}/api/apply/v2/jobs?domain=${encodeURIComponent(rest)}&start=0&num=${Math.min(25, perKeyword)}&query=${encodeURIComponent(kw)}&sort_by=timestamp`,
          { headers: { Accept: "application/json" } },
          { retries: 1 },
        );
        for (const j of d.positions ?? []) {
          if (j.id == null || !j.name) continue;
          const url = j.canonicalPositionUrl || `https://${host}/careers/job/${j.id}?domain=${encodeURIComponent(rest)}`;
          out.set(url, {
            source: src(ats),
            externalId: String(j.id),
            url,
            title: j.name,
            company,
            location: j.location ?? j.locations?.[0] ?? null,
            description: htmlToText(j.job_description ?? ""),
            postedAt: j.t_create ? new Date(j.t_create * 1000) : null,
            thin: !j.job_description,
          });
        }
      }
      break;
    }
    case "recruitee": {
      const d = await getJson<{ offers?: { id: number; title: string; city?: string; country?: string; location?: string; remote?: boolean; careers_url?: string; description?: string; requirements?: string; published_at?: string; employment_type_code?: string }[] }>(fetchImpl, `https://${slug}.recruitee.com/api/offers/`);
      for (const j of d.offers ?? []) {
        const url = j.careers_url ?? `https://${slug}.recruitee.com/o/${j.id}`;
        out.set(url, {
          source: src(ats),
          externalId: String(j.id),
          url,
          title: j.title,
          company,
          location: [j.city, j.country].filter(Boolean).join(", ") || j.location || null,
          description: htmlToText([j.description, j.requirements].filter(Boolean).join("\n")),
          postedAt: j.published_at ? new Date(j.published_at) : null,
          hints: { remote: j.remote ? "remote" : undefined, hours: /part/i.test(j.employment_type_code ?? "") ? "part" : /full/i.test(j.employment_type_code ?? "") ? "full" : undefined },
        });
      }
      break;
    }
  }
  return [...out.values()];
}

const COUNTRY_NAMES: Record<string, RegExp> = {
  IT: /^(?:italy|italia)$/i,
  GB: /^(?:united kingdom|uk|great britain|england)$/i,
  DE: /^(?:germany|deutschland)$/i,
  FR: /^(?:france)$/i,
};

/** A Workday board's country filter for these countries: { <its facet name>: [ids] }, or null when it has none. */
async function workdayCountryFacet(post: <T>(body: object) => Promise<T>, countries: CountryCode[]): Promise<Record<string, string[]> | null> {
  type V = { id?: string; descriptor?: string; values?: V[] };
  const d = await post<{ facets?: { facetParameter?: string; values?: V[] }[] }>({ limit: 1 });
  const res = countries.map((c) => COUNTRY_NAMES[c]).filter(Boolean);
  const facets = (d.facets ?? []).sort((a, b) => Number(/country/i.test(b.facetParameter ?? "")) - Number(/country/i.test(a.facetParameter ?? "")));
  for (const f of facets) {
    const ids = (f.values ?? []).filter((v) => v.id && res.some((re) => re.test((v.descriptor ?? "").trim()))).map((v) => v.id!);
    if (f.facetParameter && ids.length) return { [f.facetParameter]: ids };
  }
  return null;
}

/** The countries filter of the small boards, applied after (the big ones are asked by keyword). */
export type CountryFilter = (location: string | null | undefined, remote: boolean, countries: CountryCode[]) => boolean;
