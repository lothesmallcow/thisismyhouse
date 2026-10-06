// The bank's name is on its page even when the offer did not say it: in the page's code.
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { pageCompanyClues } from "@/lib/core/page-company";
import { ensureCatalog } from "@/lib/server/catalog";
import { companyFromPage, lookUpMissingCompanies, resetKnownCompanies } from "@/lib/server/company-guess";
import { upsertRawJob } from "@/lib/server/jobs";
import { PoliteFetcher } from "@/lib/sources/web/polite-fetch";
import { schema } from "@/lib/db";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");

const CITI = `<!doctype html><html><head><title>Banking, Investment Banking, Summer Analyst, London – United Kingdom 2027 | Citi Careers</title>
<meta property="og:site_name" content="Citi Careers"></head>
<body><header><a class="logo" href="/"><img src="/l.svg" alt="Citi logo"></a></header>
<main><h1>Summer Analyst</h1><p>Join our team in London for ten weeks.</p></main>
<footer>© 2026 Citigroup Inc. All rights reserved.</footer></body></html>`;

describe("the company in a page's code", () => {
  it("collects the clues, best first", () => {
    const c = pageCompanyClues(CITI, "https://jobs.citi.com/job/london/summer-analyst/287/123");
    expect(c).toEqual(["Citi", "Citigroup Inc"]); // site name, logo, footer, address: the same firm once
  });
  it("structured data comes first; software names are not firms", () => {
    const html = `<html><head><title>Workday</title><meta property="og:site_name" content="Workday"><script type="application/ld+json">{"@type":"JobPosting","title":"Off-Cycle Internship","hiringOrganization":{"@type":"Organization","name":"Barclays"}}</script></head><body></body></html>`;
    expect(pageCompanyClues(html, "https://barclays.wd3.myworkdayjobs.com/x/job/1")).toEqual(["Barclays"]);
    expect(pageCompanyClues("<title>Careers | Home</title>", "https://careers.example-bank.co.uk/x")).toEqual(["example-bank"]);
  });
  it("in the catalog's spelling, or the name the page writes", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    resetKnownCompanies();
    expect(await companyFromPage(db, CITI, "https://jobs.citi.com/job/1", "Summer Analyst")).toBe("Citi");
    const other = `<html><head><title>Graduate Programme | Banca Alfa Careers</title></head><body><p>x</p></body></html>`;
    expect(await companyFromPage(db, other, "https://careers.bancaalfa.it/1", "Graduate Programme")).toBe("Banca Alfa");
  });
  it("offers without a company: their page is visited once, never a job platform", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    resetKnownCompanies();
    const a = await upsertRawJob(db, { source: "w1", url: "https://jobs.citi.com/job/london/287/123", title: "Banking, Investment Banking, Summer Analyst, London 2027", company: null, location: "London", description: "Ten weeks in London.", thin: true }, NOW);
    const b = await upsertRawJob(db, { source: "w1", url: "https://www.linkedin.com/jobs/view/4012345678", title: "Investment Banking Off-Cycle Internship 2027", company: null, location: "London", description: "Off-cycle.", thin: true }, NOW);
    const asked: string[] = [];
    const fetchImpl = (async (u: string | URL | Request) => {
      const url = String(u);
      asked.push(url);
      if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /", { status: 200 });
      return new Response(CITI, { status: 200, headers: { "content-type": "text/html" } });
    }) as typeof fetch;
    const polite = new PoliteFetcher(db, fetchImpl, { sleep: async () => {} });
    const fixed = await lookUpMissingCompanies(db, polite, { max: 10, until: Date.now() + 60_000, now: NOW });
    expect(fixed).toEqual([a.jobId]);
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, a.jobId) }))?.company).toBe("Citi");
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, b.jobId) }))?.company).toBeNull();
    expect(asked.some((u) => u.includes("linkedin"))).toBe(false);
    // Once each: a second run visits nothing
    asked.length = 0;
    expect(await lookUpMissingCompanies(db, polite, { max: 10, until: Date.now() + 60_000, now: NOW })).toEqual([]);
    expect(asked).toEqual([]);
  });
});
