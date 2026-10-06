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
  opts: { keywords?: string[]; perKeyword?: number; now?: Date; details?: number } = {},
): Promise<RawJob[]> {
  const now = opts.now ?? new Date();
  const perKeyword = opts.perKeyword ?? 20;
  const keywords = [...new Set((opts.keywords?.length ? opts.keywords : [""]).map(clean))].slice(0, 4);
  const out = new Map<string, RawJob>();
  const { host, rest } = splitSlug(slug);
  switch (ats) {
    case "workday": {
      const tenant = host.split(".")[0];
      for (const kw of keywords) {
        const d = await getJson<{ jobPostings?: { title?: string; externalPath?: string; locationsText?: string; postedOn?: string; bulletFields?: string[] }[] }>(
          fetchImpl,
          `https://${host}/wday/cxs/${tenant}/${rest}/jobs`,
          { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: Math.min(20, perKeyword), offset: 0, searchText: kw }) },
          { retries: 1 },
        );
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
      // The first few in full (description, place, start date, employer as Workday names it).
      let n = 0;
      for (const [url, job] of out) {
        if (n++ >= (opts.details ?? 8)) break;
        try {
          const path = url.slice(`https://${host}/${rest}`.length);
          const d = await getJson<{ jobPostingInfo?: { jobDescription?: string; location?: string; startDate?: string; timeType?: string; externalUrl?: string }; hiringOrganization?: { name?: string } }>(
            fetchImpl,
            `https://${host}/wday/cxs/${tenant}/${rest}${path}`,
            { headers: { Accept: "application/json" } },
            { retries: 0 },
          );
          const info = d.jobPostingInfo ?? {};
          out.set(url, {
            ...job,
            company: d.hiringOrganization?.name?.trim() || company,
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
      for (const kw of keywords) {
        const finder = [`findReqs;siteNumber=${rest}`, kw ? `keyword="${kw}"` : "", `limit=${Math.min(25, perKeyword)}`, "offset=0", "sortBy=POSTING_DATES_DESC"].filter(Boolean).join(",");
        const d = await getJson<{ items?: { requisitionList?: { Id?: string; Title?: string; PostedDate?: string; PrimaryLocation?: string; PrimaryLocationCountry?: string; ShortDescriptionStr?: string; WorkplaceType?: string }[] }[] }>(
          fetchImpl,
          `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=${encodeURIComponent(finder)}`,
          { headers: { Accept: "application/json" } },
          { retries: 1 },
        );
        for (const j of d.items?.[0]?.requisitionList ?? []) {
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

/** The countries filter of the small boards, applied after (the big ones are asked by keyword). */
export type CountryFilter = (location: string | null | undefined, remote: boolean, countries: CountryCode[]) => boolean;
