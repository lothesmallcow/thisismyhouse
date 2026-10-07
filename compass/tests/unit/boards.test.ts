// Employers' own boards: from any offer link to the whole board, read through the public endpoint the
// career site itself uses (Workday, Oracle, Eightfold, Recruitee, Greenhouse…), kept to what people
// look for, and remembered in the registry.
import { describe, expect, it, vi } from "vitest";
import { feedFromUrl, feedsInHtml } from "@/lib/sources/ats/feeds";
import { avaturePlace, fetchEnterprise, workdayPosted } from "@/lib/sources/ats/enterprise";
import { fetchAts } from "@/lib/sources/ats";
import { roleTerms, titleMatches } from "@/lib/core/relevance";
import { discoveredFeeds, learnFeeds, registerFeed } from "@/lib/server/feeds";
import { searchKeywords } from "@/lib/pipeline/search-terms";
import { schema } from "@/lib/db";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");

describe("a link → the employer's board", () => {
  it.each([
    ["https://barclays.wd3.myworkdayjobs.com/en-US/External_Career_Site_Barclays/job/London/Analyst_JR-001", { ats: "workday", slug: "barclays.wd3.myworkdayjobs.com/External_Career_Site_Barclays" }],
    ["https://citi.wd5.myworkdayjobs.com/2/job/Milan/Analyst_25", { ats: "workday", slug: "citi.wd5.myworkdayjobs.com/2" }],
    ["https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/210512345", { ats: "oracle", slug: "jpmc.fa.oraclecloud.com/CX_1001" }],
    ["https://aexp.eightfold.ai/careers/job/123?domain=aexp.com", null],
    ["https://boards.greenhouse.io/point72/jobs/7654321", { ats: "greenhouse", slug: "point72" }],
    ["https://job-boards.greenhouse.io/embed/job_board?for=bendingspoons", { ats: "greenhouse", slug: "bendingspoons" }],
    ["https://jobs.lever.co/satispay/abc-123", { ats: "lever", slug: "satispay" }],
    ["https://jobs.smartrecruiters.com/Bosch/744000012345", { ats: "smartrecruiters", slug: "Bosch" }],
    ["https://acme.jobs.personio.de/job/42", { ats: "personio", slug: "acme" }],
    ["https://acme.recruitee.com/o/analyst", { ats: "recruitee", slug: "acme" }],
    ["https://careers.unicredit.eu/it_IT/jobsuche/JobDetail/Risk-Analyst/3150", { ats: "avature", slug: "careers.unicredit.eu/jobsuche" }],
    ["https://careers.unicredit.eu/jobsuche/JobDetail/Risk-Analyst/3150", { ats: "avature", slug: "careers.unicredit.eu/jobsuche" }],
    ["https://acme.avature.net/careers/SearchJobs/?search=x", { ats: "avature", slug: "acme.avature.net/careers" }],
  ])("%s", (url, want) => {
    expect(feedFromUrl(url)).toEqual(want);
  });
  it("not a board: job platforms and plain sites", () => {
    expect(feedFromUrl("https://www.linkedin.com/jobs/view/123")).toBeNull();
    expect(feedFromUrl("https://www.example.com/careers")).toBeNull();
    expect(feedFromUrl("https://jpmc.fa.oraclecloud.com/hcmUI/")).toBeNull();
  });
  it("in a careers page: links, iframes and the Greenhouse embed", () => {
    const html = `<a href="https://citi.wd5.myworkdayjobs.com/en-US/2">Jobs</a><iframe src="https://boards.greenhouse.io/embed/job_board?for=acme"></iframe><script src="https://boards.greenhouse.io/embed/job_board/js?for=acme"></script>`;
    expect(feedsInHtml(html).map((f) => f.ats).sort()).toEqual(["greenhouse", "workday"]);
  });
});

describe("reading the big boards", () => {
  it("Workday: searched by keyword, newest first, the first ones in full", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push(`${init?.method ?? "GET"} ${u}`);
      if (u.endsWith("/jobs")) {
        const body = JSON.parse(String(init?.body));
        expect(body.searchText).toBe("Sales manager");
        return Response.json({ total: 2, jobPostings: [
          { title: "Sales Manager Italy", externalPath: "/job/Milan/Sales-Manager_R1", locationsText: "Milan, Italy", postedOn: "Posted 3 Days Ago", bulletFields: ["R1"] },
          { title: "Area Sales Manager", externalPath: "/job/Rome/ASM_R2", locationsText: "2 Locations", postedOn: "Posted Today", bulletFields: ["R2"] },
        ] });
      }
      if (u.includes("/job/Milan/")) return Response.json({ jobPostingInfo: { jobDescription: "<p>Guida il team vendite.</p>", location: "Milano", startDate: "2026-10-03", timeType: "Full time" }, hiringOrganization: { name: "Acme Italia S.p.A." } });
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    const jobs = await fetchEnterprise(fetchImpl, "workday", "acme.wd3.myworkdayjobs.com/Careers", "Acme", { keywords: ["Sales manager"], now: NOW, details: 1 });
    expect(jobs).toHaveLength(2);
    // The board's company, not Workday's legal entity
    expect(jobs[0]).toMatchObject({ url: "https://acme.wd3.myworkdayjobs.com/Careers/job/Milan/Sales-Manager_R1", company: "Acme", location: "Milano", description: "Guida il team vendite.", thin: false, source: "ats:workday" });
    expect(jobs[1].location).toBeNull(); // "2 Locations" says nothing
    expect(calls[0]).toBe("POST https://acme.wd3.myworkdayjobs.com/wday/cxs/acme/Careers/jobs");
    expect(workdayPosted("Posted 30+ Days Ago", NOW)?.toISOString().slice(0, 10)).toBe("2026-09-06");
  });
  it("Workday: only the chosen countries, through the board's own country filter", async () => {
    const bodies: { appliedFacets: Record<string, string[]>; searchText: string; limit: number }[] = [];
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      if (body.limit === 1)
        return Response.json({ facets: [
          { facetParameter: "jobFamilyGroup", values: [{ id: "f1", descriptor: "Italy Operations" }] },
          { facetParameter: "Country_and_Jurisdiction", values: [{ id: "us", descriptor: "United States" }, { id: "it", descriptor: "Italy" }] },
        ] });
      return Response.json({ jobPostings: [{ title: "Analyst", externalPath: "/job/Milan/Analyst_1", locationsText: "Milan, Italy" }] });
    }) as typeof fetch;
    const jobs = await fetchEnterprise(fetchImpl, "workday", "citi.wd5.myworkdayjobs.com/2", "Citi", { keywords: ["Analyst"], countries: ["IT"], details: 0 });
    expect(jobs).toHaveLength(1);
    expect(bodies[1]).toMatchObject({ searchText: "Analyst", appliedFacets: { Country_and_Jurisdiction: ["it"] } });
  });
  it("Workday without a country filter: its sites in the chosen countries", async () => {
    const bodies: { appliedFacets: Record<string, string[]>; limit: number }[] = [];
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      if (body.limit === 1)
        return Response.json({ facets: [
          { facetParameter: "timeType", values: [{ id: "t1", descriptor: "Full time" }] },
          { facetParameter: "locationMainGroup", values: [{ facetParameter: "locations", descriptor: "Locations", values: [{ id: "s1", descriptor: "Chennai, DLF IT Park" }, { id: "s2", descriptor: "The Medelan Building, Milan" }] }] },
        ] });
      return Response.json({ jobPostings: [] });
    }) as typeof fetch;
    await fetchAts(fetchImpl, "workday", "barclays.wd3.myworkdayjobs.com/External", "Barclays", ["IT"], { keywords: ["Analyst"] });
    expect(bodies[1].appliedFacets).toEqual({ locations: ["s2"] });
  });
  it("Workday: a country inside the Locations group wins over the sites", async () => {
    const bodies: { appliedFacets: Record<string, string[]>; limit: number }[] = [];
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      if (body.limit === 1)
        return Response.json({ facets: [{ facetParameter: "locationMainGroup", values: [
          { facetParameter: "locationHierarchy1", descriptor: "Locations", values: [{ id: "c-it", descriptor: "Italy" }, { id: "c-gb", descriptor: "United Kingdom" }] },
          { facetParameter: "locations", descriptor: "Sites", values: [{ id: "s-it", descriptor: "Italy, Remote" }] },
        ] }] });
      return Response.json({ jobPostings: [] });
    }) as typeof fetch;
    await fetchAts(fetchImpl, "workday", "nvidia.wd5.myworkdayjobs.com/Site", "NVIDIA", ["IT"], { keywords: ["Engineer"] });
    expect(bodies[1].appliedFacets).toEqual({ locationHierarchy1: ["c-it"] });
  });
  it("Avature: the search feed, then each offer's page for where it is", async () => {
    const seen: string[] = [];
    const page = (city: string, country: string) =>
      `<html><script type="application/ld+json">{"@type":"JobPosting","title":"Risk Analyst","description":"<p>Analisi rischi</p>","datePosted":"2026-10-01","jobLocation":{"address":{"addressLocality":"${city}","addressCountry":"${country}"}}}</script></html>`;
    const fetchImpl = (async (url: string | URL | Request) => {
      const u = String(url);
      seen.push(u);
      if (u.includes("/SearchJobs/feed/"))
        return new Response(`<rss><channel>
          <item><title><![CDATA[Risk Analyst]]></title><link>https://careers.unicredit.eu/jobsuche/JobDetail/Risk-Analyst/3150</link><pubDate>Fri, 27 Aug 2021 10:00:00 GMT</pubDate></item>
          <item><title><![CDATA[Risikoanalyst (m/w/d)]]></title><link>https://careers.unicredit.eu/jobsuche/JobDetail/Risikoanalyst-m-w-d/3151</link></item>
          <item><title>Analyst</title><link>https://careers.unicredit.eu/jobsuche/JobDetail/Analyst/3152</link></item>
        </channel></rss>`);
      if (u.endsWith("/3150")) return new Response(page("Milano", "IT"));
      // UniCredit's pages: no place in the JobPosting data, labelled fields instead
      if (u.endsWith("/3151"))
        return new Response(`<script type="application/ld+json">{"@type":"JobPosting","title":"Risikoanalyst","description":"x"}</script>
          <div class="article__content__view__field"><div class="article__content__view__field__label">Country</div><div class="article__content__view__field__value">Germany</div></div>
          <div class="article__content__view__field"><div class="article__content__view__field__label">City</div><div class="article__content__view__field__value">München</div></div>`);
      return new Response("gone", { status: 404 });
    }) as typeof fetch;
    const jobs = await fetchAts(fetchImpl, "avature", "careers.unicredit.eu/jobsuche", "UniCredit", ["IT"], { keywords: ["Risk analyst"] });
    expect(seen[0]).toBe("https://careers.unicredit.eu/jobsuche/SearchJobs/feed/?search=Risk%20analyst");
    expect(jobs).toEqual([expect.objectContaining({ title: "Risk Analyst", company: "UniCredit", location: "Milano, Italia", description: "Analisi rischi", externalId: "3150", source: "ats:avature", thin: false })]);
  });
  it("Avature's labelled fields → the place", () => {
    const f = (l: string, v: string) => `<div class="article__content__view__field"><div class="article__content__view__field__label">${l}</div><div class="article__content__view__field__value">${v}</div></div>`;
    expect(avaturePlace(f("Job ID", "70767") + f("Company", "UniCredit Bulbank") + f("Country", "Bulgaria") + f("City", "София / Sofia"))).toBe("София / Sofia, Bulgaria");
    expect(avaturePlace(f("Paese", "Italia") + f("Città", "Milano"))).toBe("Milano, Italia");
    expect(avaturePlace("<p>nothing</p>")).toBeNull();
  });
  it("Oracle: only the chosen countries, then the full description and closing date", async () => {
    const fetchImpl = (async (url: string | URL | Request) => {
      const u = decodeURIComponent(String(url));
      if (u.includes("recruitingCEJobRequisitionDetails")) {
        expect(u).toContain('ById;Id="2",siteNumber=CX_1001');
        return Response.json({ items: [{ ExternalDescriptionStr: "<p>Analisi del credito.</p>", ExternalPostedEndDate: "2026-11-01T00:00:00Z" }] });
      }
      return Response.json({ items: [{ requisitionList: [
        { Id: "1", Title: "Analyst", PrimaryLocation: "National Capital Region", PrimaryLocationCountry: "PH" },
        { Id: "2", Title: "Credit Analyst", PrimaryLocation: "Milano, Italy", PrimaryLocationCountry: "IT" },
        { Id: "3", Title: "Risk Analyst", PrimaryLocation: "London", PrimaryLocationCountry: "GB", secondaryLocations: [{ CountryCode: "IT" }] },
      ] }] });
    }) as typeof fetch;
    const jobs = await fetchEnterprise(fetchImpl, "oracle", "jpmc.fa.oraclecloud.com/CX_1001", "J.P. Morgan", { keywords: ["Analyst"], countries: ["IT"], details: 1 });
    expect(jobs.map((j) => j.externalId)).toEqual(["2", "3"]);
    expect(jobs[0]).toMatchObject({ description: "Analisi del credito.", thin: false, hints: { closesAt: new Date("2026-11-01T00:00:00Z") } });
  });
  it("Oracle, Eightfold, Recruitee", async () => {
    const fetchImpl = (async (url: string | URL | Request) => {
      const u = decodeURIComponent(String(url));
      if (u.includes("recruitingCEJobRequisitions")) {
        expect(u).toContain('siteNumber=CX_1001,keyword="Analyst"');
        return Response.json({ items: [{ requisitionList: [{ Id: "210512345", Title: "Credit Analyst", PostedDate: "2026-10-01", PrimaryLocation: "Milano, Lombardia, Italy" }] }] });
      }
      if (u.includes("eightfold.ai/api/apply/v2/jobs")) return Response.json({ positions: [{ id: 99, name: "Analyst, Risk", location: "Milan, Italy", t_create: 1759300000, canonicalPositionUrl: "https://aexp.eightfold.ai/careers/job/99" }] });
      if (u.includes("recruitee.com/api/offers")) return Response.json({ offers: [{ id: 5, title: "Analyst", city: "Milano", country: "Italy", careers_url: "https://acme.recruitee.com/o/analyst", description: "<p>Ruolo</p>", published_at: "2026-10-02T10:00:00Z" }] });
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    const o = await fetchEnterprise(fetchImpl, "oracle", "jpmc.fa.oraclecloud.com/CX_1001", "J.P. Morgan", { keywords: ["Analyst"] });
    expect(o[0]).toMatchObject({ title: "Credit Analyst", url: "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/210512345", location: "Milano, Lombardia, Italy" });
    const e = await fetchEnterprise(fetchImpl, "eightfold", "aexp.eightfold.ai/aexp.com", "American Express", { keywords: ["Analyst"] });
    expect(e[0]).toMatchObject({ title: "Analyst, Risk", url: "https://aexp.eightfold.ai/careers/job/99" });
    const r = await fetchAts(fetchImpl, "recruitee", "acme", "Acme", ["IT"]);
    expect(r[0]).toMatchObject({ title: "Analyst", location: "Milano, Italy", description: "Ruolo" });
  });
  it("European names in North America are not Europe; Italian province codes stay Italian", async () => {
    const { inCountries } = await import("@/lib/sources/ats");
    const all = ["IT", "GB", "DE", "FR"] as const;
    for (const no of ["Naples, FL", "Rome, GA", "Florence, SC", "San Marino, CA", "Venice, Florida", "London, ON", "Paris, TX", "Cambridge, MA", "Remote - United States"])
      expect(inCountries(no, false, [...all]), no).toBe(false);
    for (const yes of ["Milano, MI", "Cagliari, CA", "Como, CO", "Arezzo, AR", "Viterbo, VT", "Monza, MB", "Milan, Italy", "Berlin, DE", "London", "Paris, France", "Cambridge"])
      expect(inCountries(yes, false, [...all]), yes).toBe(true);
  });
  it("kept to the chosen countries", async () => {
    const fetchImpl = (async () => Response.json({ offers: [{ id: 1, title: "Analyst", city: "New York", country: "United States" }, { id: 2, title: "Analyst", city: "Milano", country: "Italy" }] })) as unknown as typeof fetch;
    expect((await fetchAts(fetchImpl, "recruitee", "acme", "Acme", ["IT"])).map((j) => j.location)).toEqual(["Milano, Italy"]);
  });
});

describe("only what people look for", () => {
  it("a title must carry every word of one of the roles", () => {
    const terms = roleTerms(["Sales manager", "Responsabile vendite", "Key account manager"]);
    expect(titleMatches("Senior Sales Manager - Italy", terms)).toBe(true);
    expect(titleMatches("Responsabile Vendite Nord Italia", terms)).toBe(true);
    expect(titleMatches("Software Engineer", terms)).toBe(false);
    expect(titleMatches("Sales Assistant", terms)).toBe(false);
    expect(searchKeywords(["Responsabile vendite"], ["Sales manager"])).toContain("Sales manager");
  });
});

describe("the registry of boards", () => {
  it("a board learned from a link: on its catalog company, or a new 'scoperta' one; read again later", async () => {
    const db = await freshDb();
    const n = await learnFeeds(db, [
      { source: "w1", url: "https://acme.wd3.myworkdayjobs.com/en-US/Careers/job/Milan/X_1", title: "Sales Manager", company: "Acme Italia" },
      { source: "w1", url: "https://acme.wd3.myworkdayjobs.com/en-US/Careers/job/Rome/Y_2", title: "Sales Manager", company: "Acme Italia" },
      { source: "w1", url: "https://www.linkedin.com/jobs/view/1", title: "x", company: "y" },
    ]);
    expect(n).toBe(1);
    const found = await discoveredFeeds(db);
    expect(found).toEqual([expect.objectContaining({ name: "Acme Italia", ats: "workday", atsSlug: "acme.wd3.myworkdayjobs.com/Careers" })]);
    // Same board again: nothing new; an existing catalog company gets the board it lacked
    expect(await learnFeeds(db, [{ source: "w1", url: "https://acme.wd3.myworkdayjobs.com/Careers/job/Z_3", title: "x", company: null }])).toBe(0);
    await db.insert(schema.catalogCompanies).values({ slug: "banca-esempio", name: "Banca Esempio", source: "curato" });
    const id = await registerFeed(db, { ats: "greenhouse", slug: "bancaesempio" }, "Banca Esempio");
    const row = await db.query.catalogCompanies.findFirst({ where: (c, { eq }) => eq(c.id, id!) });
    expect(row).toMatchObject({ name: "Banca Esempio", ats: "greenhouse", atsSlug: "bancaesempio", source: "curato" });
  });
});

describe("offers taken down", () => {
  it("an offer no longer on a whole board is marked expired; one still listed, or on a searched board, is not", async () => {
    const { closeMissing } = await import("@/lib/server/feeds");
    const { upsertRawJob } = await import("@/lib/server/jobs");
    const db = await freshDb();
    const a = await upsertRawJob(db, { source: "ats:greenhouse", url: "https://boards.greenhouse.io/acme/jobs/1", title: "Sales Manager Italia", company: "Acme", location: "Milano", description: "Ruolo commerciale." }, NOW);
    const b = await upsertRawJob(db, { source: "ats:greenhouse", url: "https://boards.greenhouse.io/acme/jobs/2", title: "Key Account Manager", company: "Acme", location: "Milano", description: "Clienti chiave." }, NOW);
    const other = await upsertRawJob(db, { source: "ats:greenhouse", url: "https://boards.greenhouse.io/beta/jobs/9", title: "Analyst", company: "Beta", location: "Milano", description: "Analisi." }, NOW);
    const closed = await closeMissing(db, { ats: "greenhouse", slug: "acme" }, ["https://boards.greenhouse.io/acme/jobs/2"], NOW);
    expect(closed).toEqual([a.jobId]);
    const el = async (id: number) => (await db.query.jobs.findFirst({ where: (j, { eq }) => eq(j.id, id) }))!.eligibility as string[];
    expect(await el(a.jobId)).toContain("scaduto");
    expect(await el(b.jobId)).not.toContain("scaduto");
    expect(await el(other.jobId)).not.toContain("scaduto"); // another board
    expect(await closeMissing(db, { ats: "workday", slug: "acme.wd3.myworkdayjobs.com/x" }, [], NOW)).toEqual([]); // searched, not read whole
  });
});
