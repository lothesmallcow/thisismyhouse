// Early-careers programmes: dates in four languages, who can apply, firm names from trackers (names
// only), the official page as the source of each offer, and a low score with the reason (never hidden).
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { keyDates, runLabel } from "@/lib/core/dates";
import { deadlineText } from "@/lib/core/deadline";
import { extractEligibility } from "@/lib/core/extract";
import { leadingName, listedNamesIn, nameKey } from "@/lib/core/company-names";
import { normalizeJob } from "@/lib/core/normalize";
import { graduationYearOf, NO_CHOICES, rankJob, type RankJob, type RankProfile } from "@/lib/core/rank";
import { schema } from "@/lib/db";
import { belongsTo, cycleYear, firmFromUrl, programmeQueries, refreshTrackerLeads, searchProgrammes, trackerPages, verifyLeads } from "@/lib/pipeline/programmes";
import { ensureCatalog } from "@/lib/server/catalog";
import type { FetchLike } from "@/lib/sources/http";
import { PoliteFetcher } from "@/lib/sources/web/polite-fetch";
import { programmeFromPage } from "@/lib/sources/web/programme-page";
import type { SearchProvider } from "@/lib/sources/web/w1";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));

const NOW = new Date("2026-10-06T09:00:00Z");
const page = (body: string, head = "") => new Response(`<html><head>${head}</head><body>${body}</body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });

describe("dates in pages and ads", () => {
  it("deadline, opening, when it runs, rolling: English, Italian, German, French", () => {
    const a = keyDates("Applications open on 17 September 2026 and close on 16 October 2026. The programme takes place in March-April 2027.", NOW);
    expect(a.closesAt?.toISOString().slice(0, 10)).toBe("2026-10-16");
    expect(a.opensAt?.toISOString().slice(0, 10)).toBe("2026-09-17");
    expect(runLabel(a.runs!)).toBe("marzo-aprile 2027");
    const b = keyDates("Deadline: 1st November 2026. We review applications on a rolling basis. The Spring Insight Programme will run from 20-22 April 2027 in London.", NOW);
    expect(b.closesAt?.toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(b.rolling).toBe(true);
    expect(runLabel(b.runs!)).toBe("20-22 aprile 2027");
    const c = keyDates("Scadenza candidature: 31/10/2026. Il programma si svolge dal 13 al 15 aprile 2027 a Milano.", NOW);
    expect(c.closesAt?.toISOString().slice(0, 10)).toBe("2026-10-31");
    expect(runLabel(c.runs!)).toBe("13-15 aprile 2027");
    expect(keyDates("Bewerbungsschluss ist der 18.10.2026.", NOW).closesAt?.toISOString().slice(0, 10)).toBe("2026-10-18");
    expect(keyDates("Date limite : 30 novembre 2026", NOW).closesAt?.toISOString().slice(0, 10)).toBe("2026-11-30");
    expect(keyDates("Applications close October 31st, 2026", NOW).closesAt?.toISOString().slice(0, 10)).toBe("2026-10-31");
  });
  it("a date without the year is the next one; impossible dates and US order are handled", () => {
    expect(keyDates("Apply by 15 Nov", NOW).closesAt?.toISOString().slice(0, 10)).toBe("2026-11-15");
    expect(keyDates("Apply by 15 Jan", NOW).closesAt?.toISOString().slice(0, 10)).toBe("2027-01-15");
    expect(keyDates("Deadline 31/06/2027", NOW).closesAt).toBeNull();
    expect(keyDates("Deadline 10/25/2026", NOW).closesAt?.toISOString().slice(0, 10)).toBe("2026-10-25");
    expect(keyDates("Nothing to see here", NOW)).toEqual({ closesAt: null, opensAt: null, runs: null, rolling: false });
  });
  it("in words for people", () => {
    const base = { opensAt: null, runsStart: null, runsEnd: null, runsMonthOnly: false, rolling: false };
    expect(deadlineText({ ...base, closesAt: new Date("2026-10-16T12:00:00Z") }, NOW)).toEqual({ text: "Scade il 16 ottobre, tra 11 giorni", urgent: false });
    expect(deadlineText({ ...base, closesAt: new Date("2026-10-08T12:00:00Z") }, NOW)?.urgent).toBe(true);
    expect(deadlineText({ ...base, closesAt: new Date("2026-10-01T12:00:00Z") }, NOW)?.text).toBe("Candidature chiuse il 1 ottobre");
  });
});

describe("who can apply", () => {
  it("UK-only, right to work, visa sponsorship, restricted, year of study, master's, graduation year", () => {
    expect(extractEligibility("You must be studying at a UK university.")).toContain("solo-uk");
    expect(extractEligibility("Candidates must have the right to work in the UK. We are unable to sponsor visas.")).toContain("diritto-lavoro");
    expect(extractEligibility("Visa sponsorship is available for this role.")).toContain("sponsor-visto");
    expect(extractEligibility("This programme is open only to women and non-binary students.")).toContain("riservato");
    expect(extractEligibility("Not open to first-year students.")).toEqual(expect.arrayContaining(["dal-secondo-anno"]));
    expect(extractEligibility("Not open to first-year students.")).not.toContain("primo-anno");
    expect(extractEligibility("For students graduating in 2029 or 2030.")).toEqual(expect.arrayContaining(["laurea-2029", "laurea-2030"]));
    expect(extractEligibility("Pre-penultimate year students")).toContain("primo-anno");
    expect(extractEligibility("Pre-penultimate year students")).not.toContain("penultimo-anno");
    expect(extractEligibility("Riservato agli studenti di laurea magistrale")).toContain("magistrale");
  });

  const student: RankProfile = { ...NO_CHOICES, track: "stage", roles: [], synonyms: [], maxKm: 30, remoteOk: true, hours: "any", contracts: [], minAnnualGross: null, languages: [], avoidKeywords: [], avoidCompanies: [], avoidSectors: [], studyYear: 1, degreeYears: 3, countries: ["IT"] };
  const job = (over: Partial<RankJob>): RankJob => ({ title: "Spring Insight Programme", company: "Banca Esempio", description: "", sector: null, distanceKm: null, remote: "onsite", hours: "unknown", contract: "unknown", minAnnualGross: null, maxAnnualGross: null, languages: [], postedAt: NOW, scamFlagCount: 0, city: "London", country: "GB", jobType: "programma", eligibility: [], ...over });

  const why = (r: ReturnType<typeof rankJob>) => r.factors.map((f) => f.reason).join(" | ");
  it("never hidden: a lower score and the reason", () => {
    expect(graduationYearOf(student, NOW)).toBe(2029);
    const open = rankJob(job({}), student, [], NOW);
    const ukOnly = rankJob(job({ eligibility: ["solo-uk", "diritto-lavoro"] }), student, [], NOW);
    expect(ukOnly.score).toBeLessThan(open.score);
    expect(why(ukOnly)).toMatch(/Solo per studenti di università del Regno Unito/);
    expect(why(ukOnly)).toMatch(/servirebbe un visto/);
    const mine = rankJob(job({ eligibility: ["laurea-2029"] }), student, [], NOW);
    const other = rankJob(job({ eligibility: ["laurea-2027"] }), student, [], NOW);
    expect(why(mine)).toMatch(/è il tuo anno/);
    expect(why(other)).toMatch(/Per chi si laurea nel 2027, tu nel 2029/);
    expect(mine.score).toBeGreaterThan(other.score);
    const closed = rankJob(job({ closesAt: new Date("2026-09-30T12:00:00Z") }), student, [], NOW);
    expect(why(closed)).toMatch(/Candidature chiuse/);
    expect(closed.score).toBeLessThan(open.score);
    // In an EU country the right to work is no issue for an EU citizen.
    expect(rankJob(job({ city: "Milano", country: "IT", eligibility: ["diritto-lavoro"] }), student, [], NOW).factors.map((f) => f.reason).join(" ")).not.toMatch(/visto/);
  });
});

describe("names from a tracker, the offer from the official page", () => {
  it("company names: legal suffixes, table rows, list items, embedded data", () => {
    expect(nameKey("Barclays PLC")).toBe("barclays");
    expect(nameKey("J.P. Morgan")).toBe("jp morgan");
    expect(leadingName("Blackstone – 2027 EMEA Future Leaders Spring Insight Programme")).toBe("Blackstone");
    expect(leadingName("Applications open")).toBeNull();
    const names = listedNamesIn(`<table><tr><th>Firm</th><th>Programme</th></tr><tr><td>Evercore</td><td>Spring Week</td></tr></table><ul><li>Jefferies - Investment Banking Spring Week</li><li>Read more</li></ul><script>{"companyName":"Citadel Securities"}</script>`);
    expect(names).toEqual(expect.arrayContaining(["Evercore", "Jefferies", "Citadel Securities"]));
    expect(names).not.toContain("Read more");
  });
  it("the firm a job-board link belongs to", () => {
    expect(firmFromUrl("https://rothschildandco.tal.net/vx/lang-en-GB/candidate/so/pm/1/pl/2/opp/994")).toBe("rothschildandco");
    expect(firmFromUrl("https://job-boards.greenhouse.io/point72/jobs/8845395002")).toBe("point72");
    expect(belongsTo("https://rothschildandco.tal.net/vx/opp/994", "Rothschild & Co")).toBe(true);
    expect(belongsTo("https://www.evercore.com/careers/students", "Evercore")).toBe(true);
    expect(belongsTo("https://www.brightnetwork.co.uk/evercore", "Evercore")).toBe(false);
  });
  it("an official page becomes an offer with its dates, place and who it is for", () => {
    const html = `<html><head><title>Spring Insight Programme 2027 | Careers | Banca Esempio</title></head><body><nav>Home Careers</nav><main><h1>Spring Insight Programme 2027</h1><p>Location: London</p><p>Our three-day Spring Insight Programme will run from 20-22 April 2027. It is open to first-year students graduating in 2029.</p><p>Applications close on 15 November 2026 and are reviewed on a rolling basis.</p></main><footer>Cookies</footer></body></html>`;
    const raw = programmeFromPage(html, "https://careers.bancaesempio.example/spring", "Banca Esempio", NOW)!;
    expect(raw.title).toBe("Spring Insight Programme 2027");
    expect(raw.location).toBe("London");
    expect(raw.description).not.toMatch(/Cookies|Home Careers/);
    const n = normalizeJob(raw, null, NOW);
    expect(n.jobType).toBe("programma");
    expect(n.country).toBe("GB");
    expect(n.closesAt?.toISOString().slice(0, 10)).toBe("2026-11-15");
    expect(n.runsStart?.toISOString().slice(0, 10)).toBe("2027-04-20");
    expect(n.rolling).toBe(true);
    expect(n.eligibility).toEqual(expect.arrayContaining(["primo-anno", "laurea-2029"]));
    expect(programmeFromPage("<html><body><main><h1>About us</h1><p>We are a bank.</p></main></body></html>", "https://x.example/", "X", NOW)).toBeNull();
  });

  it("trackers give names only (robots.txt respected); each offer comes from the firm's own page", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    const y = cycleYear(NOW);
    const tracker = trackerPages(NOW)[0].url;
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      if (url === "https://www.trakvia.de/robots.txt") return new Response("User-agent: *\nDisallow: /", { status: 200 });
      if (url.endsWith("/robots.txt")) return new Response("", { status: 200 });
      if (url === tracker) return page(`<table><tr><td>Evercore</td><td>Spring Week</td><td>Opens 1 October 2026, closes 30 October 2026</td></tr><tr><td>Zeta Capitale</td><td>Spring Insight</td><td>TBC</td></tr></table>`);
      if (url === "https://careers.zetacapitale.example/spring-insight")
        return page(`<main><h1>Spring Insight ${y}</h1><p>Location: Milano</p><p>Two days at our Milan office, open to first-year students. Deadline: 20 November 2026.</p><p>You will meet our bankers, learn how deals are done and take part in a case study with the team.</p></main>`, `<meta property="og:site_name" content="Zeta Capitale">`);
      return new Response("not found", { status: 404 });
    };
    const polite = new PoliteFetcher(db, fetchImpl, { sleep: async () => undefined });
    const t = await refreshTrackerLeads(db, polite, NOW);
    expect(t.pages).toBe(1); // trakvia says no in robots.txt: never read; the others are down (404)
    expect(calls).not.toContain("https://www.trakvia.de/en/tracker/investment-banking/spring-week");
    const leads = await db.select().from(schema.programmeLeads);
    expect(leads.map((l) => l.name).sort()).toEqual(["Evercore", "Zeta Capitale"]);
    expect(leads.find((l) => l.name === "Evercore")?.catalogCompanyId).not.toBeNull(); // known from the catalog
    expect(JSON.stringify(leads)).not.toMatch(/30 October|TBC/); // nothing else from the tracker is kept

    const searched: string[] = [];
    const web: SearchProvider = {
      name: "fake",
      search: async (q) => {
        searched.push(q.q);
        return /Zeta/.test(q.q)
          ? [
              { title: "Zeta Capitale spring insight - Bright Network", url: "https://www.brightnetwork.co.uk/zeta", snippet: "", publishedAt: null },
              { title: "Spring Insight", url: "https://careers.zetacapitale.example/spring-insight", snippet: "", publishedAt: null },
            ]
          : [];
      },
    };
    const saved: string[] = [];
    const v = await verifyLeads(db, { polite, fetchImpl, web, now: NOW, countries: ["IT"], searchCap: 10, save: async (jobs) => void saved.push(...jobs.map((j) => `${j.company}: ${j.title} @ ${j.url}`)) }, 10);
    expect(v.checked).toBe(2);
    expect(saved).toEqual([`Zeta Capitale: Spring Insight ${y} @ https://careers.zetacapitale.example/spring-insight`]); // the official page, not the aggregator
    expect(searched.some((q) => q.includes(`Zeta Capitale spring week ${y}`))).toBe(true);
    const zeta = await db.query.programmeLeads.findFirst({ where: eq(schema.programmeLeads.name, "Zeta Capitale") });
    expect(zeta?.officialUrl).toBe("https://careers.zetacapitale.example/spring-insight");
    expect(zeta?.found).toBe(1);
    // Checked leads wait a week (found) or a month (nothing found) before the next look.
    expect((await verifyLeads(db, { polite, fetchImpl, web, now: NOW, countries: ["IT"], searchCap: 10, save: async () => undefined }, 10)).checked).toBe(0);
  });

  it("web search for a student: official pages become offers, aggregator pages only names", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    const qs = programmeQueries({ careers: ["investment-banking"], countries: ["IT", "GB"], stage: "primi-anni" }, NOW, 3);
    expect(qs[0]).toBe(`spring insight programme ${cycleYear(NOW)} first year investment banking Milan apply`);
    expect(programmeQueries({ careers: [], countries: ["IT"], stage: "penultimo" }, NOW)[0]).toMatch(/^summer internship \d{4} finance Milan/);
    const fetchImpl: FetchLike = async (url) => {
      if (url.endsWith("/robots.txt")) return new Response("", { status: 200 });
      if (url === "https://www.gorizzume.co.uk/list") return page(`<ul><li>Lambda Partners - Spring Week</li></ul>`);
      if (url === "https://careers.omega.example/insight") return page(`<main><h1>Insight Day Milano</h1><p>Sede: Milano</p><p>Una giornata nei nostri uffici di Milano per studenti del primo anno di economia e finanza. Scadenza candidature: 30/11/2026.</p></main>`, `<meta property="og:site_name" content="Omega Advisory">`);
      return new Response("not found", { status: 404 });
    };
    const web: SearchProvider = { name: "fake", search: async () => [{ title: "list", url: "https://www.gorizzume.co.uk/list", snippet: "", publishedAt: null }, { title: "Insight", url: "https://careers.omega.example/insight", snippet: "", publishedAt: null }, { title: "LinkedIn", url: "https://www.linkedin.com/jobs/view/1", snippet: "", publishedAt: null }] };
    const saved: string[] = [];
    const polite = new PoliteFetcher(db, fetchImpl, { sleep: async () => undefined });
    const r = await searchProgrammes(db, qs.slice(0, 1), { polite, fetchImpl, web, now: NOW, countries: ["IT"], searchCap: 10, save: async (jobs) => void saved.push(...jobs.map((j) => `${j.company}: ${j.title}`)) });
    expect(r).toEqual({ queries: 1, offers: 1, leads: 1 });
    expect(saved).toEqual(["Omega Advisory: Insight Day Milano"]);
    expect((await db.select().from(schema.programmeLeads)).map((l) => l.name)).toEqual(["Lambda Partners"]);
  });
});
