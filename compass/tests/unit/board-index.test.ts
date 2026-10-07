// The index of employers' boards (Common Crawl → catalog) and the hourly sweep that reads them.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { crawlFeeds, feedsFromCdx } from "@/lib/sources/ats/crawl-index";
import { runBoardIndex, topCountry } from "@/lib/pipeline/board-index";
import { runBoardSweep } from "@/lib/pipeline/board-sweep";
import { schema } from "@/lib/db";
import { freshDb, seedPeople } from "./helpers/db";

const NOW = new Date("2026-10-07T09:00:00Z");
const line = (url: string) => JSON.stringify({ url });

describe("boards from the public web archive", () => {
  it("one board per employer, whatever page of it was archived", () => {
    const text = [
      line("https://boards.greenhouse.io/acme/jobs/1"),
      line("https://boards.greenhouse.io/acme/jobs/2"),
      line("https://boards.greenhouse.io/embed/job_board?for=bendingspoons"),
      line("https://acme.wd3.myworkdayjobs.com/en-US/Careers/job/Milan/X_1"),
      line("https://acme.wd3.myworkdayjobs.com/"), // no site: not a board
      "not json",
      line("https://www.linkedin.com/jobs/view/1"),
    ].join("\n");
    expect(feedsFromCdx(text)).toEqual([
      { ats: "greenhouse", slug: "acme" },
      { ats: "greenhouse", slug: "bendingspoons" },
      { ats: "workday", slug: "acme.wd3.myworkdayjobs.com/Careers" },
    ]);
  });
  it("the latest crawl, every page of every pattern", async () => {
    const asked: string[] = [];
    const fetchImpl = (async (url: string) => {
      asked.push(url);
      if (url.endsWith("collinfo.json")) return Response.json([{ id: "CC-MAIN-2026-39" }, { id: "CC-MAIN-2026-35" }]);
      if (url.includes("showNumPages")) return Response.json({ pages: 2 });
      const page = url.match(/page=(\d)/)?.[1];
      return new Response(line(`https://jobs.lever.co/team${page}/abc`));
    }) as unknown as typeof fetch;
    const r = await crawlFeeds(fetchImpl, { patterns: ["jobs.lever.co/*"] });
    expect(r).toMatchObject({ crawl: "CC-MAIN-2026-39", pages: 2, failed: 0 });
    expect(r.feeds.map((f) => f.slug)).toEqual(["team0", "team1"]);
    expect(asked[1]).toContain("CC-MAIN-2026-39-index?url=jobs.lever.co%2F*&output=json");
  });
  it("where a board hires most", () => {
    expect(topCountry(["Milan, Italy", "Roma", "London, UK"])).toBe("IT");
    expect(topCountry(["New York, USA", null])).toBeNull();
  });
});

describe("the weekly index", () => {
  it("adds the boards with offers in a covered country, once", async () => {
    const db = await freshDb();
    const fetchImpl = (async (url: string) => {
      const slug = url.match(/boards\/([^/]+)\/jobs/)?.[1];
      const where = slug === "acme" ? "Milan, Italy" : "Austin, TX, USA";
      return Response.json({ jobs: [{ id: 1, title: "Analyst", absolute_url: `https://boards.greenhouse.io/${slug}/jobs/1`, location: { name: where } }] });
    }) as unknown as typeof fetch;
    const crawl = async () => ({ crawl: "CC-TEST", feeds: [{ ats: "greenhouse" as const, slug: "acme" }, { ats: "greenhouse" as const, slug: "texasonly" }] });
    const first = await runBoardIndex(db, fetchImpl, { crawl });
    expect(first).toMatchObject({ crawl: "CC-TEST", found: 2, checked: 2, added: 1, byCountry: { IT: 1 } });
    const row = await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.atsSlug, "acme") });
    expect(row).toMatchObject({ name: "Acme", source: "scoperta", country: "IT", ats: "greenhouse" });
    // Known boards are not checked again
    expect((await runBoardIndex(db, fetchImpl, { crawl })).checked).toBe(1);
  });
});

describe("the hourly sweep", () => {
  it("reads every board where someone looks; boards nobody chose keep the offers with their roles", async () => {
    const db = await freshDb();
    await seedPeople(db, NOW, { onboarded: true });
    await db.insert(schema.catalogCompanies).values({ slug: "scoperta-acme", name: "Acme", source: "scoperta", country: "IT", ats: "greenhouse", atsSlug: "acmesweep" });
    const fetchImpl = (async (url: string) => {
      if (!url.includes("/boards/acmesweep/")) return new Response("no", { status: 404 });
      return Response.json({ jobs: [
        { id: 1, title: "Impiegata amministrativa", absolute_url: "https://boards.greenhouse.io/acmesweep/jobs/1", location: { name: "Milano, Italy" }, first_published: "2026-10-07T08:30:00Z" },
        { id: 2, title: "Software Engineer", absolute_url: "https://boards.greenhouse.io/acmesweep/jobs/2", location: { name: "Milano, Italy" } },
      ] });
    }) as unknown as typeof fetch;
    const r = await runBoardSweep(db, fetchImpl, NOW, { gapMs: 0, sleep: async () => {} });
    expect(r.read).toBeGreaterThanOrEqual(1);
    expect(r).toMatchObject({ kept: 1, newJobs: 1 });
    const stored = await db.select({ title: schema.jobs.title }).from(schema.jobs);
    expect(stored.map((j) => j.title)).toContain("Impiegata amministrativa");
    expect(stored.map((j) => j.title)).not.toContain("Software Engineer");
  });
  it("nothing to do without anyone onboarded", async () => {
    const db = await freshDb();
    expect(await runBoardSweep(db, (async () => Response.json({})) as unknown as typeof fetch, NOW)).toMatchObject({ skipped: "nobody to search for" });
  });
});
