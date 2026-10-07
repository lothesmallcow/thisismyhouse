// Employers' own boards: from any offer link to the whole board, read through the public endpoint the
// career site itself uses (Workday, Oracle, Eightfold, Recruitee, Greenhouse…), kept to what people
// look for, and remembered in the registry.
import { describe, expect, it, vi } from "vitest";
import { feedFromUrl, feedsInHtml } from "@/lib/sources/ats/feeds";
import { fetchEnterprise, workdayPosted } from "@/lib/sources/ats/enterprise";
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
    ["https://aexp.eightfold.ai/careers/job/123?domain=aexp.com", { ats: "eightfold", slug: "aexp.eightfold.ai/aexp.com" }],
    ["https://boards.greenhouse.io/point72/jobs/7654321", { ats: "greenhouse", slug: "point72" }],
    ["https://job-boards.greenhouse.io/embed/job_board?for=bendingspoons", { ats: "greenhouse", slug: "bendingspoons" }],
    ["https://jobs.lever.co/satispay/abc-123", { ats: "lever", slug: "satispay" }],
    ["https://jobs.smartrecruiters.com/Bosch/744000012345", { ats: "smartrecruiters", slug: "Bosch" }],
    ["https://acme.jobs.personio.de/job/42", { ats: "personio", slug: "acme" }],
    ["https://acme.recruitee.com/o/analyst", { ats: "recruitee", slug: "acme" }],
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
    expect(jobs[0]).toMatchObject({ url: "https://acme.wd3.myworkdayjobs.com/Careers/job/Milan/Sales-Manager_R1", company: "Acme Italia S.p.A.", location: "Milano", description: "Guida il team vendite.", thin: false, source: "ats:workday" });
    expect(jobs[1].location).toBeNull(); // "2 Locations" says nothing
    expect(calls[0]).toBe("POST https://acme.wd3.myworkdayjobs.com/wday/cxs/acme/Careers/jobs");
    expect(workdayPosted("Posted 30+ Days Ago", NOW)?.toISOString().slice(0, 10)).toBe("2026-09-06");
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
