// The job boards large employers run on (banks, consultancies, corporates): Workday, Oracle Recruiting
// Cloud, Eightfold, plus Recruitee. Each one serves its career site from a public JSON endpoint, the
// same one the site's own page calls: no login, no scraping of pages, structured fields (title, place,
// date). Big boards hold thousands of offers, so they are searched with the words people look for,
// not read whole.
import type { CountryCode } from "../../core/geo";
import type { RawJob, SourceKind } from "../../core/normalize";
import { getJson, htmlToText, request, type FetchLike } from "../http";
import { jobPostingToRaw, findJobPostings } from "../web/jsonld";

export type EnterpriseAts = "workday" | "oracle" | "eightfold" | "recruitee" | "avature" | "teamtailor";

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
    case "avature":
      return `https://${host}/${rest}/SearchJobs/feed/`;
    case "teamtailor":
      return `https://${slug}.teamtailor.com/jobs.rss`;
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
  opts: {
    keywords?: string[];
    perKeyword?: number;
    now?: Date;
    details?: number;
    countries?: CountryCode[];
    /** Whether a place name is in the chosen countries ("The Medelan Building, Milan" → Italy). */
    inCountry?: (place: string) => boolean;
  } = {},
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
      const applied = opts.countries?.length ? await workdayCountryFacet(post, opts.countries, opts.inCountry).catch(() => null) : null;
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
    case "avature": {
      // Avature career sites (UniCredit…) publish their search as an RSS feed: title and link per offer,
      // "search" narrows it. Each offer's page carries JobPosting data (place, description, dates).
      const feed = enterpriseEndpoint(ats, slug);
      for (const kw of keywords) {
        const res = await request(fetchImpl, kw ? `${feed}?search=${encodeURIComponent(kw)}` : feed, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } }, { retries: 1 });
        const xml = await res.text();
        for (const m of [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, perKeyword)) {
          const tag = (t: string) => m[1].match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
          const title = htmlToText(tag("title") ?? "");
          const url = tag("link") ?? tag("guid");
          if (!title || !url?.startsWith("https://")) continue;
          const pub = tag("pubDate") ? new Date(tag("pubDate")!) : null;
          out.set(url, {
            source: src(ats),
            externalId: url.match(/\/(\d+)\/?$/)?.[1] ?? url,
            url,
            title,
            company,
            location: null,
            description: htmlToText(tag("description") ?? ""),
            // Offers stay in the feed while open; an old first date says nothing then.
            postedAt: pub && !Number.isNaN(pub.getTime()) && now.getTime() - pub.getTime() < 180 * 86_400_000 ? pub : null,
            thin: true,
          });
        }
      }
      // Its page says where (labelled fields: "Country Italy", "City Milano"; its JobPosting data has no
      // place); offers whose page was not read are left out, as the feed mixes every country.
      const read = new Map<string, RawJob>();
      for (const [url, job] of [...out].slice(0, opts.details ?? 12)) {
        try {
          const html = await (await request(fetchImpl, url, { headers: { Accept: "text/html" } }, { retries: 0 })).text();
          const p = findJobPostings(html).map((o) => jobPostingToRaw(o, url))[0];
          const place = p?.location ?? avaturePlace(html);
          if (!p && !place) continue;
          const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i)?.[1];
          read.set(url, { ...job, location: place, description: p?.description || htmlToText(og ?? "") || job.description, salaryText: p?.salaryText, postedAt: p?.postedAt ?? job.postedAt, hints: p?.hints, thin: !p?.description });
        } catch {
          /* skipped */
        }
      }
      return [...read.values()];
    }
    case "teamtailor": {
      // Teamtailor career sites publish every offer as RSS, with its full text; the place comes from the
      // feed when it says, else from the offer's page (JobPosting data), for the first few.
      const base = `https://${slug}.teamtailor.com`;
      const xml = await (await request(fetchImpl, `${base}/jobs.rss`, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } }, { retries: 1 })).text();
      const decode = (x: string) => x.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const tag = (t: string) => m[1].match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`))?.[1]?.trim();
        const title = htmlToText(decode(tag("title") ?? ""));
        const url = decode(tag("link") ?? tag("guid") ?? "").trim();
        if (!title || !url.startsWith("https://")) continue;
        const where = [...m[1].matchAll(/<(?:[\w-]+:)?(?:city|location|locality|country)[^>]*>([^<]{2,80})</gi)].map((x) => decode(x[1]).trim()).filter(Boolean);
        const pub = tag("pubDate") ? new Date(tag("pubDate")!) : null;
        out.set(url, {
          source: src(ats),
          externalId: url.match(/\/jobs\/(\d+)/)?.[1] ?? url,
          url,
          title,
          company,
          location: where.length ? [...new Set(where)].join(", ") : null,
          description: htmlToText(decode(tag("description") ?? "")),
          postedAt: pub && !Number.isNaN(pub.getTime()) ? pub : null,
          hints: /remote|da remoto|fully remote/i.test(m[1]) ? { remote: "remote" } : undefined,
        });
      }
      let n = 0;
      for (const [url, job] of out) {
        if (job.location || n++ >= (opts.details ?? 10)) continue;
        try {
          const html = await (await request(fetchImpl, url, { headers: { Accept: "text/html" } }, { retries: 0 })).text();
          const p = findJobPostings(html).map((o) => jobPostingToRaw(o, url))[0];
          if (p?.location) out.set(url, { ...job, location: p.location, hints: { ...job.hints, ...p.hints } });
        } catch {
          /* the feed entry is enough */
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

/**
 * A Workday board's filter for these countries: { <its facet name>: [ids] }, or null when it has none.
 * The country itself when the board lists countries (also inside the "Locations" group: NVIDIA's
 * locationHierarchy1); otherwise its sites in those countries (Barclays: "The Medelan Building, Milan").
 */
async function workdayCountryFacet(post: <T>(body: object) => Promise<T>, countries: CountryCode[], inCountry?: (place: string) => boolean): Promise<Record<string, string[]> | null> {
  type V = { id?: string; descriptor?: string; facetParameter?: string; values?: V[] };
  const d = await post<{ facets?: V[] }>({ limit: 1 });
  // Every filter, with the groups opened ("locationMainGroup" → "locations", "locationHierarchy1"…)
  const facets: { param: string; values: V[] }[] = [];
  for (const f of d.facets ?? []) {
    if (f.facetParameter && (f.values ?? []).some((v) => v.id)) facets.push({ param: f.facetParameter, values: f.values ?? [] });
    for (const g of f.values ?? []) if (g.facetParameter && g.values?.length) facets.push({ param: g.facetParameter, values: g.values });
  }
  const res = countries.map((c) => COUNTRY_NAMES[c]).filter(Boolean);
  const byCountry = facets.sort((a, b) => Number(/country/i.test(b.param)) - Number(/country/i.test(a.param)));
  for (const f of byCountry) {
    const ids = f.values.filter((v) => v.id && res.some((re) => re.test((v.descriptor ?? "").trim()))).map((v) => v.id!);
    if (ids.length) return { [f.param]: ids };
  }
  if (!inCountry) return null;
  for (const f of facets.filter((x) => /location|site|city/i.test(x.param))) {
    const ids = f.values.filter((v) => v.id && v.descriptor && inCountry(v.descriptor)).map((v) => v.id!);
    if (ids.length) return { [f.param]: ids.slice(0, 50) };
  }
  return null;
}

/** "City, Country" from an Avature job page's labelled fields ("Country" "Bulgaria" "City" "Sofia"). */
export function avaturePlace(html: string): string | null {
  const items = [...html.matchAll(/class="[^"]*field[^"]*"[^>]*>([\s\S]{0,300}?)<\/(?:div|li|dd|span)>/gi)]
    .map((m) => htmlToText(m[1]).replace(/\s+/g, " ").trim())
    .filter((t) => t && t.length < 120);
  const after = (label: RegExp) => {
    const i = items.findIndex((t) => label.test(t));
    return i >= 0 && items[i + 1] && !label.test(items[i + 1]) ? items[i + 1] : null;
  };
  const country = after(/^(?:country|paese|nazione|land|pays|país)$/i);
  const city = after(/^(?:city|città|citta|stadt|ort|ville|ciudad|location|sede|standort)$/i);
  return [city, country].filter(Boolean).join(", ") || null;
}

/** The countries filter of the small boards, applied after (the big ones are asked by keyword). */
export type CountryFilter = (location: string | null | undefined, remote: boolean, countries: CountryCode[]) => boolean;
