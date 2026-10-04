// Public ATS job boards: endpoints companies publish so their openings can be read.
// No authentication, no scraping: documented JSON/XML feeds only. Results are filtered to
// Italian locations (or remote roles that mention Italy).

import { parse } from "node-html-parser";
import type { Contract, Hours, Remote } from "../../core/extract";
import { findPlace } from "../../core/geo";
import type { RawJob, SourceKind } from "../../core/normalize";
import { getJson, htmlToText, request, HttpError, type FetchLike } from "../http";

export type AtsType = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "workable" | "personio";

export const ATS_LABELS: Record<AtsType, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
  workable: "Workable",
  personio: "Personio",
};

/** Where to find the slug, shown in the admin form. */
export const ATS_SLUG_HINT: Record<AtsType, string> = {
  greenhouse: "boards.greenhouse.io/<slug>",
  lever: "jobs.lever.co/<slug>",
  ashby: "jobs.ashbyhq.com/<slug>",
  smartrecruiters: "jobs.smartrecruiters.com/<slug>",
  workable: "apply.workable.com/<slug>",
  personio: "<slug>.jobs.personio.de",
};

export function atsEndpoint(ats: AtsType, slug: string): string {
  const s = encodeURIComponent(slug.trim());
  switch (ats) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${s}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`;
    case "smartrecruiters":
      return `https://api.smartrecruiters.com/v1/companies/${s}/postings?country=it&limit=100`;
    case "workable":
      return `https://apply.workable.com/api/v1/widget/accounts/${s}?details=true`;
    case "personio":
      return `https://${s}.jobs.personio.de/xml?language=it`;
  }
}

function inItaly(location: string | null | undefined, remote: boolean): boolean {
  if (!location) return remote;
  if (/ital(y|ia)/i.test(location)) return true;
  return findPlace(location) != null && !/,\s*(usa|us|uk|germany|deutschland|france|spain|españa)\b/i.test(location);
}

const src = (ats: AtsType) => `ats:${ats}` as SourceKind;

export async function fetchAts(fetchImpl: FetchLike, ats: AtsType, slug: string, company: string): Promise<RawJob[]> {
  const url = atsEndpoint(ats, slug);
  switch (ats) {
    case "greenhouse": {
      const d = await getJson<{ jobs: { id: number; title: string; absolute_url: string; location?: { name?: string }; updated_at?: string; first_published?: string; content?: string }[] }>(fetchImpl, url);
      return d.jobs
        .filter((j) => inItaly(j.location?.name, /remote/i.test(j.location?.name ?? "")))
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
        .filter((j) => inItaly(j.categories?.location, j.workplaceType === "remote"))
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
        .filter((j) => inItaly(j.location, Boolean(j.isRemote)))
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
        .filter((j) => (j.location?.country ?? "").toLowerCase() === "it" || inItaly(j.location?.city, Boolean(j.location?.remote)))
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
        .filter((j) => /ital/i.test(j.country ?? "") || inItaly(j.city, Boolean(j.telecommuting)))
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
      return parsePersonioXml(await res.text(), slug, company);
    }
  }
}

export function parsePersonioXml(xml: string, slug: string, company: string): RawJob[] {
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
    .filter((j) => j.title && inItaly(j.location, false));
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
