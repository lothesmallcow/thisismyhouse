// When nothing says the company plainly: the name the page repeats most. And ads that have expired,
// or may have, are said so.
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { mostFrequentName } from "@/lib/core/company-names";
import { EXPIRED_AD, extractEligibility } from "@/lib/core/extract";
import { pageCompanyClues } from "@/lib/core/page-company";
import { ensureCatalog } from "@/lib/server/catalog";
import { companyFromPage, resetKnownCompanies } from "@/lib/server/company-guess";
import { upsertRawJob } from "@/lib/server/jobs";
import { hitToRawJob } from "@/lib/sources/web/w1";
import { schema } from "@/lib/db";
import { fold } from "@/lib/core/text";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");

describe("the most frequent name", () => {
  it("the employer the page repeats, not menus, roles, places or the site", () => {
    const page = `Sign in Apply now
Corporate Debt Capital Markets (DCM) Internship 2026
Citadel Securities London
About the role: at Citadel Securities you will work with traders in London.
Citadel Securities is an equal opportunity employer. Similar jobs: Goldman Sachs analyst.
Bright Network Bright Network Bright Network`;
    expect(mostFrequentName(page, [], { title: "Corporate Debt Capital Markets (DCM) Internship 2026", avoid: ["Bright Network"] })).toBe("Citadel"); // "Securities" is a sector word
    // With the catalog, its name wins (counted double)
    expect(mostFrequentName(page, [{ id: 9, name: "Citadel", aliases: [] }], { avoid: ["Bright Network"] })).toBe("Citadel");
    expect(mostFrequentName("Apply now. London. Summer Internship Programme.", [])).toBeNull();
  });
  it("catalog companies count double, in the catalog's spelling", () => {
    const known = [{ id: 1, name: "J.P. Morgan", aliases: ["JPMorgan"] }];
    expect(mostFrequentName("At JPMorgan you join… Acme Partners, Acme Partners", known)).toBe("J.P. Morgan");
  });
  it("job sites: only the job's data and the company in the address", () => {
    const html = `<html><head><meta property="og:site_name" content="Bright Network"><title>DCM Internship | Bright Network</title></head><body>x</body></html>`;
    expect(pageCompanyClues(html, "https://www.brightnetwork.co.uk/graduate-jobs/mufg/dcm-internship-2026")).toEqual(["Mufg"]);
    expect(pageCompanyClues(html, "https://www.brightnetwork.co.uk/search/?q=dcm")).toEqual([]);
  });
  it("a job site's page: never the site's own name", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    resetKnownCompanies();
    const html = `<html><head><meta property="og:site_name" content="Reed"></head><body><main>
      <h1>Investment Banking Internship Scheme 2027</h1><p>Reed Reed Reed. Houlihan Lokey is hiring interns. Houlihan Lokey offers ten weeks. Join Houlihan Lokey.</p></main></body></html>`;
    expect(await companyFromPage(db, html, "https://www.reed.co.uk/jobs/investment-banking-internship/5555", "Investment Banking Internship Scheme 2027")).toBe("Houlihan Lokey");
  });
});

describe("expired ads", () => {
  it("the page's words", () => {
    for (const t of ["Annuncio di lavoro scaduto", "No longer accepting applications", "This job has expired", "The position has been filled", "Cette offre n'est plus disponible"]) expect(EXPIRED_AD.test(fold(t))).toBe(true);
    expect(EXPIRED_AD.test(fold("Applications open now, apply by 30 November"))).toBe(false);
    expect(extractEligibility("Annuncio di lavoro scaduto. Stage Asset Management SGR")).toContain("scaduto");
  });
  it("a search result whose page says so: kept, marked expired and ranked low; the company from the page", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    resetKnownCompanies();
    const raw = hitToRawJob({
      title: "Stage Asset Management SGR",
      url: "https://it.indeed.com/viewjob?jk=3818035a0d4929b7",
      snippet: "Tirocinio formativo/stage a Milano.",
      publishedAt: new Date("2026-09-01T00:00:00Z"),
      page: "Annuncio di lavoro scaduto\nStage Asset Management SGR\nPrelios Sgr · 3.6\nMilano, Lombardia\nPrelios Sgr cerca uno stagista. Prelios Sgr è una società di gestione.",
    });
    const r = await upsertRawJob(db, raw, NOW);
    const job = (await db.query.jobs.findFirst({ where: eq(schema.jobs.id, r.jobId) }))!;
    expect(job.company).toBe("Prelios Sgr");
    expect(job.eligibility).toContain("scaduto");
  });
});
