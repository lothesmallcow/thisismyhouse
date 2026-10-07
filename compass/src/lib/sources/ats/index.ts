// Public ATS job boards: endpoints companies publish so their openings can be read.
// No authentication, no scraping: documented JSON/XML feeds only. Results are filtered to
// Italian locations (or remote roles that mention Italy).

import { parse } from "node-html-parser";
import type { Contract, Hours, Remote } from "../../core/extract";
import { findPlace, type CountryCode } from "../../core/geo";
import type { RawJob, SourceKind } from "../../core/normalize";
import { getJson, htmlToText, request, HttpError, type FetchLike } from "../http";
import { enterpriseEndpoint, fetchEnterprise, type EnterpriseAts } from "./enterprise";

export type AtsType = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "workable" | "personio" | EnterpriseAts;
export const ENTERPRISE: AtsType[] = ["workday", "oracle", "eightfold", "recruitee", "avature"];

export const ATS_LABELS: Record<AtsType, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
  workable: "Workable",
  personio: "Personio",
  workday: "Workday",
  oracle: "Oracle Recruiting",
  eightfold: "Eightfold",
  recruitee: "Recruitee",
  avature: "Avature",
};

/** Where to find the slug, shown in the admin form. */
export const ATS_SLUG_HINT: Record<AtsType, string> = {
  greenhouse: "boards.greenhouse.io/<slug>",
  lever: "jobs.lever.co/<slug>",
  ashby: "jobs.ashbyhq.com/<slug>",
  smartrecruiters: "jobs.smartrecruiters.com/<slug>",
  workable: "apply.workable.com/<slug>",
  personio: "<slug>.jobs.personio.de",
  workday: "<tenant>.wd3.myworkdayjobs.com/<sito> (incolla un link di un'offerta)",
  oracle: "<host>.oraclecloud.com/<CX_1001> (incolla un link di un'offerta)",
  eightfold: "<host>.eightfold.ai/<dominio dell'azienda>",
  recruitee: "<slug>.recruitee.com",
  avature: "<host>/<portale> (incolla un link di un'offerta, es. careers.unicredit.eu/jobsuche)",
};

export function atsEndpoint(ats: AtsType, slug: string, countries: CountryCode[] = ["IT"]): string {
  const s = encodeURIComponent(slug.trim());
  switch (ats) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${s}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`;
    case "smartrecruiters":
      return `https://api.smartrecruiters.com/v1/companies/${s}/postings?${countries.length === 1 ? `country=${countries[0].toLowerCase()}&` : ""}limit=100`;
    case "workable":
      return `https://apply.workable.com/api/v1/widget/accounts/${s}?details=true`;
    case "personio":
      return `https://${s}.jobs.personio.de/xml?language=it`;
    default:
      return enterpriseEndpoint(ats, slug.trim());
  }
}

const COUNTRY_WORDS: Record<CountryCode, RegExp> = {
  IT: /\bital(y|ia|ien)\b/i,
  GB: /\b(uk|united kingdom|england|scotland|wales)\b/i,
  DE: /\b(germany|deutschland)\b/i,
  FR: /\b(france)\b/i,
};
/** Offers located in the countries the people chose (Italy when nobody chose). */
export function inCountries(location: string | null | undefined, remote: boolean, countries: CountryCode[]): boolean {
  if (!location) return remote;
  if (countries.some((c) => COUNTRY_WORDS[c].test(location))) return true;
  if (/,\s*(usa|us|spain|españa|netherlands|ireland|switzerland)\b/i.test(location)) return false;
  const p = findPlace(location);
  return p != null && countries.includes(p.country);
}

/** Career-page offers worth keeping: in the chosen countries, or not saying where (then the person's filters decide). */
export const keepInCountries = (countries: CountryCode[]) => (j: RawJob) => !j.location?.trim() || inCountries(j.location, j.hints?.remote === "remote", countries);

const src = (ats: AtsType) => `ats:${ats}` as SourceKind;

/**
 * One employer's board. `keywords` (what people search) are used by the big boards (Workday, Oracle,
 * Eightfold), which are searched rather than read whole; every board is then kept to the countries.
 */
export async function fetchAts(fetchImpl: FetchLike, ats: AtsType, slug: string, company: string, countries: CountryCode[] = ["IT"], opts: { keywords?: string[] } = {}): Promise<RawJob[]> {
  const url = atsEndpoint(ats, slug, countries);
  switch (ats) {
    case "workday":
    case "oracle":
    case "eightfold":
    case "recruitee":
    case "avature": {
      const jobs = await fetchEnterprise(fetchImpl, ats, slug, company, { keywords: opts.keywords, countries, inCountry: (p) => inCountries(p, false, countries) });
      return jobs.filter((j) => !j.location || inCountries(j.location, j.hints?.remote === "remote", countries));
    }
    case "greenhouse": {
      const d = await getJson<{ jobs: { id: number; title: string; absolute_url: string; location?: { name?: string }; updated_at?: string; first_published?: string; content?: string }[] }>(fetchImpl, url);
      return d.jobs
        .filter((j) => inCountries(j.location?.name, /remote/i.test(j.location?.name ?? ""), countries))
        .map((j) => ({
          source: src(ats),
          externalId: String(j.id),
          url: j.absolute_url,
          title: j.title,
          company,
          location: j.location?.name ?? null,
          description: htmlToText(htmlToText(j.content ?? "")), // content is HTML-escaped HTML
          postedAt: j.first_published ? new Date(j.first_published) : j.updated_at ? new Date(j.updated_at) : null,
        }));
    }
    case "lever": {
      const d = await getJson<{ id: string; text: string; hostedUrl: string; createdAt?: number; descriptionPlain?: string; additionalPlain?: string; workplaceType?: string; categories?: { location?: string; commitment?: string } }[]>(fetchImpl, url);
      return d
        .filter((j) => inCountries(j.categories?.location, j.workplaceType === "remote", countries))
        .map((j) => ({
          source: src(ats),
          externalId: j.id,
          url: j.hostedUrl,
          title: j.text,
          company,
          location: j.categories?.location ?? null,
          description: [j.descriptionPlain, j.additionalPlain].filter(Boolean).join("\n\n"),
          postedAt: j.createdAt ? new Date(j.createdAt) : null,
          hints: { hours: commitmentHours(j.categories?.commitment), remote: workplace(j.workplaceType) },
        }));
    }
    case "ashby": {
      const d = await getJson<{ jobs: { id?: string; title: string; location?: string; jobUrl: string; descriptionPlain?: string; publishedAt?: string; isRemote?: boolean; workplaceType?: string; employmentType?: string }[] }>(fetchImpl, url);
      return d.jobs
        .filter((j) => inCountries(j.location, Boolean(j.isRemote), countries))
        .map((j) => ({
          source: src(ats),
          externalId: j.id ?? j.jobUrl,
          url: j.jobUrl,
          title: j.title,
          company,
          location: j.location ?? null,
          description: j.descriptionPlain ?? "",
          postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
          hints: { hours: commitmentHours(j.employmentType), remote: j.isRemote ? "remote" : workplace(j.workplaceType) },
        }));
    }
    case "smartrecruiters": {
      const d = await getJson<{ content: { id: string; name: string; releasedDate?: string; location?: { city?: string; country?: string; remote?: boolean }; typeOfEmployment?: { label?: string } }[] }>(fetchImpl, url);
      return d.content
        .filter((j) => countries.includes((j.location?.country ?? "").toUpperCase() as CountryCode) || inCountries(j.location?.city, Boolean(j.location?.remote), countries))
        .map((j) => ({
          source: src(ats),
          externalId: j.id,
          url: `https://jobs.smartrecruiters.com/${encodeURIComponent(slug)}/${j.id}`,
          title: j.name,
          company,
          location: j.location?.city ?? null,
          description: "",
          postedAt: j.releasedDate ? new Date(j.releasedDate) : null,
          hints: { hours: commitmentHours(j.typeOfEmployment?.label), remote: j.location?.remote ? "remote" : undefined },
          thin: true,
        }));
    }
    case "workable": {
      const d = await getJson<{ jobs: { title: string; shortcode: string; url?: string; shortlink?: string; city?: string; country?: string; telecommuting?: boolean; employment_type?: string; description?: string; published_on?: string }[] }>(fetchImpl, url);
      return d.jobs
        .filter((j) => inCountries(j.country ?? "", false, countries) || inCountries(j.city, Boolean(j.telecommuting), countries))
        .map((j) => ({
          source: src(ats),
          externalId: j.shortcode,
          url: j.url ?? j.shortlink ?? `https://apply.workable.com/${encodeURIComponent(slug)}/j/${j.shortcode}/`,
          title: j.title,
          company,
          location: j.city ?? null,
          description: htmlToText(j.description ?? ""),
          postedAt: j.published_on ? new Date(j.published_on) : null,
          hints: { hours: commitmentHours(j.employment_type), remote: j.telecommuting ? "remote" : undefined },
        }));
    }
    case "personio": {
      const res = await request(fetchImpl, url, { headers: { Accept: "application/xml" } });
      if (!res.ok) throw new HttpError(res.status, url);
      return parsePersonioXml(await res.text(), slug, company, countries);
    }
  }
}

export function parsePersonioXml(xml: string, slug: string, company: string, countries: CountryCode[] = ["IT"]): RawJob[] {
  const root = parse(xml, { blockTextElements: { script: false, style: false } });
  return root
    .querySelectorAll("position")
    .map((p) => {
      const get = (tag: string) => p.querySelector(tag)?.text.trim() ?? "";
      const descs = p.querySelectorAll("jobDescription").map((d) => `${d.querySelector("name")?.text.trim() ?? ""}\n${htmlToText(d.querySelector("value")?.text.replace(/<!\[CDATA\[|\]\]>/g, "") ?? "")}`);
      const id = get("id");
      return {
        source: "ats:personio" as SourceKind,
        externalId: id,
        url: `https://${slug}.jobs.personio.de/job/${id}`,
        title: get("name"),
        company,
        location: get("office") || null,
        description: descs.join("\n\n").trim(),
        postedAt: get("createdAt") ? new Date(get("createdAt")) : null,
        hints: { hours: commitmentHours(get("schedule")), contract: personioContract(get("employmentType")) },
      };
    })
    .filter((j) => j.title && inCountries(j.location, false, countries));
}

function commitmentHours(s?: string | null): Hours | undefined {
  if (!s) return undefined;
  if (/part/i.test(s)) return "part";
  if (/full/i.test(s)) return "full";
  return undefined;
}

function workplace(s?: string | null): Remote | undefined {
  if (!s) return undefined;
  if (/remote/i.test(s)) return "remote";
  if (/hybrid/i.test(s)) return "hybrid";
  if (/on-?site/i.test(s)) return "onsite";
  return undefined;
}

function personioContract(s: string): Contract | undefined {
  if (/permanent/i.test(s)) return "indeterminato";
  if (/temporary|fixed/i.test(s)) return "determinato";
  if (/intern|trainee/i.test(s)) return "stage";
  if (/freelance/i.test(s)) return "partita_iva";
  return undefined;
}
