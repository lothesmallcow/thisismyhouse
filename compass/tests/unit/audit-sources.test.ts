// Tests added for the audit checklist: sources (APIs, ATS, W1, W2), isolation, idempotency.
import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { schema, type DB } from "@/lib/db";
import { runDiscover, usageToday } from "@/lib/pipeline/discover";
import { runIngest } from "@/lib/pipeline/ingest";
import { mapAdzuna } from "@/lib/sources/api/adzuna";
import { mapJooble } from "@/lib/sources/api/jooble";
import { fetchAts } from "@/lib/sources/ats";
import { demoFetch } from "@/lib/sources/demo-fetch";
import { BlockedError, request } from "@/lib/sources/http";
import { extractJobsFromHtml, findJobPostings } from "@/lib/sources/web/jsonld";
import { PoliteFetcher, RobotsDisallowed } from "@/lib/sources/web/polite-fetch";
import { isAllowed, parseRobots } from "@/lib/sources/web/robots";
import { TavilyProvider, type SearchProvider } from "@/lib/sources/web/w1";
import { updateProfile } from "@/lib/server/profile";
import { setSetting } from "@/lib/server/settings";
import { guessFromUrl } from "@/lib/core/url-guess";
import { freshDb } from "./helpers/db";

const NOW = new Date("2026-10-05T07:00:00Z");
const fixture = (f: string) => fs.readFileSync(path.join("fixtures/http", f), "utf8");

describe("job APIs map their documented fields", () => {
  it("Adzuna: Italian results, predicted salaries ignored", () => {
    const rows = JSON.parse(fixture("adzuna-it.json")).results.map(mapAdzuna);
    expect(rows[0]).toMatchObject({ source: "api:adzuna", company: "Studio Merlo & Associati", location: "Torino, Piemonte", hints: { contract: "indeterminato", hours: "part", minAnnualGross: 22000 } });
    expect(rows[1].hints.minAnnualGross).toBeUndefined(); // salary_is_predicted = 1
    expect(rows[0].title).not.toMatch(/<strong>/);
  });
  it("Jooble: snippet HTML stripped, salary text kept", () => {
    const j = mapJooble(JSON.parse(fixture("jooble-it.json")).jobs[0]);
    expect(j).toMatchObject({ source: "api:jooble", company: "Cooperativa Sole", salaryText: "1.200 € netti al mese" });
    expect(j.description).not.toMatch(/<b>/);
  });
});

describe("ATS adapters (saved responses), Italy only", () => {
  it.each([
    ["greenhouse", "greenhouse-board.json", "Office Administrator - Torino"],
    ["lever", "lever-postings.json", "Customer Care Specialist (italiano)"],
    ["ashby", "ashby-board.json", "Amministrazione e contabilità"],
    ["smartrecruiters", "smartrecruiters-postings.json", "Impiegata Back Office"],
    ["workable", "workable-account.json", "Receptionist"],
    ["personio", "personio.xml", "Impiegata amministrativa"],
  ] as const)("%s", async (ats, file, title) => {
    const urls: string[] = [];
    const f = (async (u: string) => {
      urls.push(u);
      return new Response(fixture(file), { status: 200 });
    }) as typeof fetch;
    const jobs = await fetchAts(f, ats, "esempio", "Esempio");
    expect(jobs.map((j) => j.title)).toEqual([title]); // the non-Italian posting is dropped
    expect(jobs[0].url).toMatch(/^https:\/\//);
    expect(urls).toHaveLength(1);
  });
});

describe("HTTP helper", () => {
  it("retries network errors and 5xx with backoff, then succeeds", async () => {
    let n = 0;
    const waits: number[] = [];
    const f = (async () => {
      n++;
      if (n === 1) throw new Error("ECONNRESET");
      if (n === 2) return new Response("busy", { status: 503 });
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    const res = await request(f, "https://x.example/", {}, { sleep: async (ms) => void waits.push(ms) });
    expect(await res.text()).toBe("ok");
    expect(waits).toEqual([2000, 4000]);
  });
  it("never retries 403/429: stops immediately", async () => {
    let n = 0;
    const f = (async () => {
      n++;
      return new Response("no", { status: 429 });
    }) as typeof fetch;
    await expect(request(f, "https://x.example/", {}, { sleep: async () => {} })).rejects.toBeInstanceOf(BlockedError);
    expect(n).toBe(1);
  });
  it("sends an honest User-Agent with the contact address", async () => {
    process.env.CONTACT_EMAIL = "contatto@compass.example";
    let ua = "";
    const f = (async (_u: string, init?: RequestInit) => {
      ua = (init?.headers as Record<string, string>)["User-Agent"];
      return new Response("ok");
    }) as typeof fetch;
    await request(f, "https://x.example/");
    expect(ua).toBe("CompassJobFinder/0.1 (personal job search, low volume; contact: contatto@compass.example)");
    delete process.env.CONTACT_EMAIL;
  });
});

describe("W2: robots.txt, 5 seconds per domain, cache, JSON-LD", () => {
  let db: DB;
  beforeEach(async () => {
    db = await freshDb();
  });

  it("robots.txt is checked before fetching; a disallowed path is never requested", async () => {
    const asked: string[] = [];
    const f = (async (u: string) => {
      asked.push(u);
      if (u.endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow: /lavora-con-noi/", { status: 200 });
      return new Response("page");
    }) as typeof fetch;
    const p = new PoliteFetcher(db, f, { sleep: async () => {} });
    await expect(p.get("https://site.example/lavora-con-noi/1")).rejects.toBeInstanceOf(RobotsDisallowed);
    expect(asked).toEqual(["https://site.example/robots.txt"]);
  });

  it("robots parser: longest match wins, Allow beats Disallow on ties, wildcards", () => {
    const r = parseRobots("User-agent: *\nDisallow: /\nAllow: /lavora-con-noi\nDisallow: /*.pdf$");
    expect(isAllowed(r, "/lavora-con-noi/1")).toBe(true);
    expect(isAllowed(r, "/privato")).toBe(false);
    expect(isAllowed(r, "/lavora-con-noi/bando.pdf")).toBe(true); // longer Allow wins
  });

  it("waits at least 5 seconds between requests to the same domain", async () => {
    let clock = 0;
    const waits: number[] = [];
    const f = (async (u: string) => new Response(u.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : "<html></html>")) as typeof fetch;
    const p = new PoliteFetcher(db, f, {
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    });
    await p.get("https://site.example/a");
    await p.get("https://site.example/b");
    // robots -> a -> b: two waits of 5 s each
    expect(waits).toEqual([5000, 5000]);
  });

  it("uses conditional GET and serves 304 from cache", async () => {
    let n = 0;
    const f = (async (u: string, init?: RequestInit) => {
      if (u.endsWith("robots.txt")) return new Response("");
      n++;
      const h = init?.headers as Record<string, string>;
      if (h["If-None-Match"] === '"v1"') return new Response(null, { status: 304 });
      return new Response("<p>v1</p>", { headers: { ETag: '"v1"' } });
    }) as typeof fetch;
    const p = new PoliteFetcher(db, f, { sleep: async () => {} });
    expect((await p.get("https://site.example/x")).fromCache).toBe(false);
    const second = await p.get("https://site.example/x");
    expect(second).toEqual({ body: "<p>v1</p>", fromCache: true });
    expect(n).toBe(2);
  });

  it("a 403 blocks the domain for the rest of the run", async () => {
    let pages = 0;
    const f = (async (u: string) => {
      if (u.endsWith("robots.txt")) return new Response("");
      pages++;
      return new Response("no", { status: 403 });
    }) as typeof fetch;
    const p = new PoliteFetcher(db, f, { sleep: async () => {} });
    await expect(p.get("https://site.example/1")).rejects.toBeInstanceOf(BlockedError);
    await expect(p.get("https://site.example/2")).rejects.toBeInstanceOf(BlockedError);
    expect(pages).toBe(1);
  });

  const wrap = (json: string) => `<html><head><script type="application/ld+json">${json}</script></head></html>`;
  it("JSON-LD: missing fields", () => {
    const jobs = extractJobsFromHtml(wrap(`{"@type":"JobPosting","title":"Segretaria"}`), "https://s.example/1", NOW);
    expect(jobs).toEqual([expect.objectContaining({ title: "Segretaria", company: null, location: null, url: "https://s.example/1" })]);
  });
  it("JSON-LD: an array of postings and a @graph wrapper", () => {
    expect(extractJobsFromHtml(wrap(`[{"@type":"JobPosting","title":"A"},{"@type":"JobPosting","title":"B"}]`), "https://s.example", NOW)).toHaveLength(2);
    const g = `{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":["JobPosting"],"title":"C","hiringOrganization":{"name":"Org"}}]}`;
    expect(extractJobsFromHtml(wrap(g), "https://s.example", NOW).map((j) => [j.title, j.company])).toEqual([["C", "Org"]]);
  });
  it("JSON-LD: expired postings dropped, broken JSON ignored", () => {
    expect(extractJobsFromHtml(wrap(`{"@type":"JobPosting","title":"Old","validThrough":"2026-01-01"}`), "https://s.example", NOW)).toEqual([]);
    expect(findJobPostings(wrap(`{ not json`))).toEqual([]);
  });
  it("JSON-LD: salary units", () => {
    const h = wrap(`{"@type":"JobPosting","title":"X","baseSalary":{"value":{"minValue":10,"maxValue":12,"unitText":"HOUR"}}}`);
    expect(extractJobsFromHtml(h, "https://s.example", NOW)[0].salaryText).toBe("10 - 12 € /ora");
  });
});

describe("W1", () => {
  let db: DB;
  beforeEach(async () => {
    db = await freshDb();
    await updateProfile(db, { roles: ["Impiegata amministrativa", "Segretaria", "Receptionist"], city: "Torino" });
  });

  it("the 26th query of the day is refused (cap 25) and the provider is not called", async () => {
    let calls = 0;
    const provider: SearchProvider = { name: "fake", search: async () => (calls++, []) };
    await db.insert(schema.usageCounters).values({ counter: "w1-queries", day: "2026-10-05", count: 24 });
    const r = await runDiscover(db, provider, NOW);
    expect(r.queries).toBe(1); // the 25th
    expect(r.capReached).toBe(true);
    expect(calls).toBe(1);
    expect(await usageToday(db, "w1-queries", NOW)).toBe(25);
    const again = await runDiscover(db, provider, NOW);
    expect(again).toMatchObject({ queries: 0, capReached: true });
    expect(calls).toBe(1);
  });

  it("the admin cannot raise the cap above 100", async () => {
    await setSetting(db, "w1DailyCap", 5000);
    await db.insert(schema.usageCounters).values({ counter: "w1-queries", day: "2026-10-05", count: 100 });
    let calls = 0;
    expect((await runDiscover(db, { name: "f", search: async () => (calls++, []) }, NOW)).capReached).toBe(true);
    expect(calls).toBe(0);
  });

  it("only talks to the search API: never fetches LinkedIn, Indeed or InfoJobs pages", async () => {
    const urls: string[] = [];
    const f = (async (u: string, i?: RequestInit) => {
      urls.push(u);
      return demoFetch()(u, i);
    }) as typeof fetch;
    const r = await runDiscover(db, new TavilyProvider(f, "k"), NOW);
    expect(r.found).toBeGreaterThan(0);
    expect(urls.length).toBe(r.queries);
    expect(urls.every((u) => u === "https://api.tavily.com/search")).toBe(true);
    const stored = await db.select({ url: schema.jobSources.url }).from(schema.jobSources);
    expect(stored.some((s) => s.url?.includes("linkedin.com"))).toBe(true); // stored as links for her...
    expect(urls.some((u) => /linkedin\.com|indeed\.com|infojobs\.it/.test(u))).toBe(false); // ...never fetched
  });
});

describe("isolation and idempotency", () => {
  it("one source throwing does not stop the others", async () => {
    const db = await freshDb();
    const { seedDemo } = await import("@/lib/seed");
    await seedDemo(db, NOW);
    const broken = (async (u: string, i?: RequestInit) => {
      if (u.includes("adzuna")) throw new Error("adzuna is down");
      return demoFetch()(u, i);
    }) as typeof fetch;
    const s = await runIngest({ db, fetchImpl: broken, mailbox: null, demo: true, now: NOW, politeSleep: async () => {} });
    expect(s.sources["api:adzuna"]).toBeNull();
    expect(s.sources["ats:greenhouse:esempiotech"]).toBe(1);
    expect(s.sources["w2:careers.esempio-demo.example"]).toBe(1);
    const h = await db.query.sourceHealth.findFirst({ where: eq(schema.sourceHealth.source, "api:adzuna") });
    expect(h!.lastError).toMatch(/adzuna is down/);
    expect(h!.consecutiveFailures).toBe(1);
  }, 30_000); // the failing source is retried twice with real 2 s + 4 s backoff

  it("running ingestion twice creates no duplicates", async () => {
    const db = await freshDb();
    const { seedDemo } = await import("@/lib/seed");
    await seedDemo(db, NOW);
    const { DemoMailbox } = await import("@/lib/sources/mail/demo");
    const deps = { db, fetchImpl: demoFetch(), mailbox: new DemoMailbox(db), demo: true, now: NOW, politeSleep: async () => {} };
    await runIngest(deps);
    const [{ a }] = await db.select({ a: sql<number>`count(*)` }).from(schema.jobs);
    const [{ s1 }] = await db.select({ s1: sql<number>`count(*)` }).from(schema.jobSources);
    await runIngest(deps);
    const [{ b }] = await db.select({ b: sql<number>`count(*)` }).from(schema.jobs);
    const [{ s2 }] = await db.select({ s2: sql<number>`count(*)` }).from(schema.jobSources);
    expect(Number(b)).toBe(Number(a));
    expect(Number(s2)).toBe(Number(s1));
  });
});

describe("manual add from a link only (the page is never fetched)", () => {
  it.each([
    ["https://it.linkedin.com/jobs/view/impiegata-amministrativa-at-rossi-srl-4012345601?trk=x", { title: "Impiegata amministrativa", company: "Rossi srl", city: null, platform: "linkedin" }],
    ["https://www.infojobs.it/torino/impiegata-contabile/of-i8b2c3d4e5f6a7b8", { title: "Impiegata contabile", company: null, city: "Torino", platform: "infojobs" }],
    ["https://it.indeed.com/viewjob?jk=abc", { title: null, company: null, city: null, platform: "indeed" }],
    ["https://www.esempio.example/lavora-con-noi/addetta-segreteria", { title: "Addetta segreteria", company: null, city: null, platform: "other" }],
    ["non è un link", { title: null, company: null, city: null, platform: null }],
  ])("%s", (url, want) => expect(guessFromUrl(url)).toEqual(want));
});

describe("geocoder fallback (off by default)", () => {
  it("is off by default; when on: cached, 1 request per second, distance filled in", async () => {
    const db = await freshDb();
    const { getSettings } = await import("@/lib/server/settings");
    expect((await getSettings(db)).geocoderEnabled).toBe(false);
    await updateProfile(db, { city: "Torino", lat: 45.06776, lng: 7.68249, roles: ["Impiegata"] });
    const { upsertRawJob } = await import("@/lib/server/jobs");
    await upsertRawJob(db, { source: "manual", url: null, title: "Impiegata", company: "A", location: "Lingotto" }, NOW);
    await setSetting(db, "geocoderEnabled", true);
    const sleeps: number[] = [];
    let calls = 0;
    const f = (async (u: string, i?: RequestInit) => {
      if (u.includes("nominatim")) calls++;
      return demoFetch()(u, i);
    }) as typeof fetch;
    await runIngest({ db, fetchImpl: f, mailbox: null, demo: true, now: NOW, politeSleep: async (ms) => void sleeps.push(ms) });
    const j = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "A") });
    expect(j!.distanceKm).toBeGreaterThan(0);
    expect(j!.distanceKm).toBeLessThan(5);
    expect(sleeps).toContain(1100);
    await db.update(schema.jobs).set({ lat: null }).where(eq(schema.jobs.company, "A"));
    await runIngest({ db, fetchImpl: f, mailbox: null, demo: true, now: NOW, politeSleep: async () => {} });
    expect(calls).toBe(1); // second time from cache
  });
});
