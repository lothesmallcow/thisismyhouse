// Web scraping of companies' own career pages: home page → careers link → JobPosting, through the
// polite fetcher (robots.txt respected, job platforms never fetched).
import { describe, expect, it, vi } from "vitest";
import { careersLink, scrapeCareers, siteUrl } from "@/lib/sources/web/careers";
import { PoliteFetcher } from "@/lib/sources/web/polite-fetch";
import type { FetchLike } from "@/lib/sources/http";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));

const html = (body: string) => new Response(`<html><body>${body}</body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
const posting = (title: string) =>
  `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "JobPosting", title, datePosted: "2026-10-01", hiringOrganization: { "@type": "Organization", name: "Banca Esempio" }, jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Milano", addressCountry: "IT" } }, description: "Stage di sei mesi." })}</script>`;

function site(robots: string, calls: string[]): FetchLike {
  return async (url) => {
    calls.push(url);
    if (url.endsWith("/robots.txt")) return new Response(robots, { status: 200 });
    if (url === "https://www.bancaesempio.example/") return html(`<a href="/chi-siamo">Chi siamo</a><a href="/lavora-con-noi">Lavora con noi</a>`);
    if (url === "https://www.bancaesempio.example/lavora-con-noi") return html(`<a href="/lavora-con-noi/offerte/stage-finanza">Stage finanza</a>`);
    if (url === "https://www.bancaesempio.example/lavora-con-noi/offerte/stage-finanza") return html(posting("Stage area finanza"));
    return new Response("not found", { status: 404 });
  };
}

describe("career pages", () => {
  it("finds the careers link of a home page", () => {
    expect(siteUrl("bancaesempio.example")).toBe("https://bancaesempio.example/");
    expect(careersLink(`<a href="/news">News</a><a href="https://jobs.esempio.example/it">Opportunità di lavoro</a>`, "https://esempio.example/")).toBe("https://jobs.esempio.example/it");
    expect(careersLink(`<a href="/prodotti">Prodotti</a>`, "https://esempio.example/")).toBeNull();
  });

  it("home page → careers page → job pages, and the careers page is remembered", async () => {
    const db = await freshDb();
    const calls: string[] = [];
    const polite = new PoliteFetcher(db, site("User-agent: *\nAllow: /", calls), { sleep: async () => {} });
    const r = await scrapeCareers(polite, { website: "www.bancaesempio.example" }, new Date("2026-10-05T07:00:00Z"), Date.now() + 60_000);
    expect(r.careersUrl).toBe("https://www.bancaesempio.example/lavora-con-noi");
    expect(r.jobs.map((j) => [j.title, j.company])).toEqual([["Stage area finanza", "Banca Esempio"]]);
    expect(calls.filter((u) => u.endsWith("/robots.txt"))).toHaveLength(1); // read once per site
  });

  it("robots.txt says no: nothing is fetched beyond it", async () => {
    const db = await freshDb();
    const calls: string[] = [];
    const polite = new PoliteFetcher(db, site("User-agent: *\nDisallow: /", calls), { sleep: async () => {} });
    const r = await scrapeCareers(polite, { website: "www.bancaesempio.example" }, new Date(), Date.now() + 60_000);
    expect(r.jobs).toEqual([]);
    expect(calls).toEqual(["https://www.bancaesempio.example/robots.txt"]);
  });

  it("a job platform is never fetched, even when a company links to it", async () => {
    const db = await freshDb();
    const calls: string[] = [];
    const polite = new PoliteFetcher(db, site("", calls), { sleep: async () => {} });
    const r = await scrapeCareers(polite, { careersUrl: "https://www.linkedin.com/company/esempio/jobs" }, new Date(), Date.now() + 60_000);
    expect(r.jobs).toEqual([]);
    expect(calls.some((u) => u.includes("linkedin"))).toBe(false);
  });
});

describe("every company of the sector, and the official boards a site links to", () => {
  it("recognises Greenhouse, Lever, SmartRecruiters, Workable and Personio links", async () => {
    const { atsFromHtml } = await import("@/lib/sources/web/careers");
    expect(atsFromHtml(`<a href="https://boards.greenhouse.io/bancaesempio/jobs/123">Apply</a>`)).toEqual({ ats: "greenhouse", slug: "bancaesempio" });
    expect(atsFromHtml(`<iframe src="https://boards.greenhouse.io/embed/job_board?for=esempio"></iframe>`)).toEqual({ ats: "greenhouse", slug: "esempio" });
    expect(atsFromHtml(`<a href="https://jobs.lever.co/esempio">Jobs</a>`)).toEqual({ ats: "lever", slug: "esempio" });
    expect(atsFromHtml(`<a href="https://esempio.jobs.personio.de/">Jobs</a>`)).toEqual({ ats: "personio", slug: "esempio" });
    expect(atsFromHtml(`<a href="https://www.linkedin.com/company/esempio/jobs">LinkedIn</a>`)).toBeNull();
  });

  it("an investment banking position: every investment bank of the catalog with a website, minus the avoided one", async () => {
    const { searchTargets } = await import("@/lib/pipeline/targets");
    const { ensureCatalog, setPref } = await import("@/lib/server/catalog");
    const { updateProfile } = await import("@/lib/server/profile");
    const { seedPeople } = await import("./helpers/db");
    const { schema } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const db = await freshDb();
    const { L } = await seedPeople(db, new Date("2026-10-05T07:00:00Z"));
    await ensureCatalog(db);
    await updateProfile(db, L, { roles: ["Investment banking analyst"], synonyms: [], city: "Milano", countries: ["IT"] });
    const lazard = (await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.name, "Lazard") }))!;
    expect(lazard.website).toBe("lazard.com");
    const mediobanca = (await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.name, "Mediobanca") }))!;
    await setPref(db, L, "company", mediobanca.id, "avoid");
    const names = (await searchTargets(db, L)).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["Lazard", "Goldman Sachs", "Houlihan Lokey", "UniCredit"]));
    expect(names.length).toBeGreaterThanOrEqual(25);
    expect(names).not.toContain("Mediobanca");
  });
});
