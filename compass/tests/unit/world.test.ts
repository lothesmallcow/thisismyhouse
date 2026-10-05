// Countries, regions, the generated catalog (listed companies + NACE), positions in four languages,
// per-country searches and search priority.
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { findPlace, homeCountries, regionsOf, searchPlaces } from "@/lib/core/geo";
import { NO_CHOICES, rankJob, type RankJob, type RankProfile } from "@/lib/core/rank";
import { findPosition, positionsFor, translations } from "@/lib/catalog/positions";
import { gicsSector, naceSector } from "@/lib/catalog/world";
import { schema, type DB } from "@/lib/db";
import { searchPlan } from "@/lib/pipeline/search-terms";
import { fetchAdzuna } from "@/lib/sources/api/adzuna";
import { parsePersonioXml } from "@/lib/sources/ats";
import { prioritizedCompanies, suggestCompanies, todaysPicks } from "@/lib/server/career";
import { browseCompanies, canChoose, ensureDirectory, listCompanies, listSectors, rankPrefs, searchCompanies, searchSectors, setPref } from "@/lib/server/catalog";
import { getProfile, toRankProfile, updateProfile } from "@/lib/server/profile";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

describe("places in four countries", () => {
  it("finds foreign cities by local, English and Italian names, with country and region", () => {
    expect(findPlace("London, England, United Kingdom")).toMatchObject({ name: "London", country: "GB", region: "England" });
    expect(findPlace("Londra")).toMatchObject({ name: "London", country: "GB" });
    expect(findPlace("Monaco di Baviera")).toMatchObject({ name: "Munich", country: "DE" });
    expect(findPlace("Köln")?.name).toBe(findPlace("Colonia")?.name);
    expect(findPlace("Parigi")).toMatchObject({ name: "Paris", country: "FR", region: "Île-de-France" });
    expect(findPlace("Torino (TO)")).toMatchObject({ country: "IT", region: "Piemonte" });
  });
  it("never mistakes ordinary words for foreign towns, and free text stays Italian", () => {
    expect(findPlace("Reading")).toBeNull(); // a UK town, but also a word
    expect(findPlace("Reading, UK")).toMatchObject({ country: "GB" });
    expect(findPlace("Lavoro a Parigi e dintorni", { abroad: false })).toBeNull();
  });
  it("a place outside the four countries is not one of their towns (New York is not York)", () => {
    expect(findPlace("New York, NY")).toBeNull();
    expect(findPlace("New York, USA")).toBeNull();
    expect(findPlace("Madrid, Spain")).toBeNull();
    expect(findPlace("York, UK")).toMatchObject({ country: "GB" });
    expect(findPlace("Milano, Italia")).toMatchObject({ country: "IT" });
  });
  it("regions per country and city suggestions abroad only when asked", () => {
    expect(regionsOf("IT")).toHaveLength(20);
    expect(regionsOf("DE")).toHaveLength(16);
    expect(searchPlaces("lond").some((p) => p.country === "GB")).toBe(false);
    expect(searchPlaces("lond", 8, ["IT", "GB"]).some((p) => p.name === "London")).toBe(true);
    expect(homeCountries([], "Torino")).toEqual(["IT"]);
    expect(homeCountries(["GB", "XX"], "Torino")).toEqual(["GB"]);
  });
});

describe("positions and industries", () => {
  it("roles in four languages, both ways", () => {
    expect(translations("Contabile", ["en", "de", "fr"])).toEqual(["Accountant", "Buchhalter", "Comptable"]);
    expect(findPosition("accountant")?.it).toBe("Contabile");
    expect(positionsFor("stage").some((p) => p.it === "Spring week")).toBe(true);
    expect(positionsFor("lavoro").some((p) => p.it === "Spring week")).toBe(false);
  });
  it("listed-company industries and NACE codes map to the closest hand-made sector", () => {
    expect(gicsSector("Consumer Discretionary", "Textiles, Apparel & Luxury Goods").slug).toBe("moda-lusso");
    expect(gicsSector("Financials", "Banks")).toEqual({ slug: "banche-assicurazioni", kind: "banca" });
    expect(naceSector("30.12")).toBe("nautica"); // building of pleasure boats
    expect(naceSector("30.30")).toBe("energia-industria"); // aircraft
    expect(naceSector("14.13")).toBe("moda-lusso");
  });
});

describe("ranking with countries and regions", () => {
  const profile: RankProfile = { ...NO_CHOICES, roles: ["Contabile"], synonyms: [], maxKm: 25, remoteOk: false, hours: "any", contracts: [], minAnnualGross: null, languages: [], avoidKeywords: [], avoidCompanies: [], avoidSectors: [] };
  const job: RankJob = { title: "Contabile", company: "X", description: "", sector: null, city: "Torino", distanceKm: 3, remote: "onsite", hours: "full", contract: "indeterminato", minAnnualGross: null, maxAnnualGross: null, languages: [], postedAt: null, scamFlagCount: 0, jobType: "unknown", eligibility: [] };
  const now = new Date("2026-10-05T08:00:00Z");
  it("a job in a country they did not choose drops; one in a chosen region counts as near", () => {
    const paris = rankJob({ ...job, city: "Paris", distanceKm: 600 }, { ...profile, countries: ["IT", "GB"] }, [], now);
    expect(paris.factors.find((f) => f.key === "country")?.reason).toMatch(/Francia, fuori dai paesi/);
    const milano = rankJob({ ...job, city: "Milano", distanceKm: 126 }, { ...profile, regions: ["IT:Lombardia"] }, [], now);
    expect(milano.factors.find((f) => f.key === "distance")?.reason).toMatch(/Lombardia: una regione che hai scelto/);
  });
  it("'Londra' chosen matches an ad in 'London'", () => {
    const r = rankJob({ ...job, city: "London", distanceKm: 1000 }, { ...profile, extraPlaces: ["Londra"] }, [], now);
    expect(r.factors.find((f) => f.key === "distance")?.reason).toMatch(/tra le città che hai scelto/);
  });
});

describe("the position is the listing's, not the company's", () => {
  const now = new Date("2026-10-05T08:00:00Z");
  const student: RankProfile = { ...NO_CHOICES, track: "stage", roles: [], synonyms: [], maxKm: 30, remoteOk: true, hours: "any", contracts: [], minAnnualGross: null, languages: [], avoidKeywords: [], avoidCompanies: [], avoidSectors: [], studyYear: 1, degreeYears: 3, likedCompanies: [{ name: "Lazard", aliases: [] }], likedSectors: [{ name: "Investment banking e M&A", keywords: ["m&a", "investment banking"] }] };
  const ad: RankJob = { title: "", company: "Lazard", description: "Lazard is a leading financial advisory firm (M&A, restructuring).", sector: null, city: "Milano", distanceKm: 2, remote: "onsite", hours: "full", contract: "stage", minAnnualGross: null, maxAnnualGross: null, languages: [], postedAt: null, scamFlagCount: 0, jobType: "stage", eligibility: [] };
  it("a chosen company counts fully only when the listing's role fits", () => {
    const ma = rankJob({ ...ad, title: "M&A Spring Week" }, student, [], now);
    const it = rankJob({ ...ad, title: "IT Helpdesk Intern" }, student, [], now);
    expect(ma.factors.find((f) => f.key === "company-liked")?.points).toBe(25);
    expect(it.factors.find((f) => f.key === "company-liked")?.reason).toMatch(/ruolo è diverso/);
    expect(it.factors.find((f) => f.key === "sector-liked")?.reason).toBe("Fuori dai settori che hai scelto");
    expect(it.score).toBeLessThan(ma.score - 25);
  });
  it("the same for job seekers: the role in the title decides", () => {
    const seeker: RankProfile = { ...student, track: "lavoro", roles: ["Impiegata amministrativa"], likedSectors: [], likedCompanies: [{ name: "Rossi Srl", aliases: [] }], studyYear: null, degreeYears: null };
    const ok = rankJob({ ...ad, company: "Rossi Srl", title: "Impiegata amministrativa", jobType: "unknown" }, seeker, [], now);
    const no = rankJob({ ...ad, company: "Rossi Srl", title: "Magazziniere", jobType: "unknown" }, seeker, [], now);
    expect(ok.factors.find((f) => f.key === "company-liked")?.points).toBe(25);
    expect(no.factors.find((f) => f.key === "company-liked")?.points).toBe(6);
  });
});

describe("the generated catalog, searches and priority", () => {
  let db: DB;
  let L: number;
  let M: number;
  const NOW = new Date("2026-10-05T07:00:00Z");
  beforeAll(async () => {
    db = await freshDb();
    ({ L, M } = await seedPeople(db, NOW));
    const r = await ensureDirectory(db);
    expect(r.companies).toBeGreaterThan(2500);
    expect(r.sectors).toBeGreaterThan(1000);
  }, 60_000);

  it("loads once; listed companies and NACE industries are searchable, never dumped into the short lists", async () => {
    expect((await ensureDirectory(db)).skipped).toBe(true);
    expect((await listCompanies(db, M)).some((c) => c.source === "borsa")).toBe(false);
    expect((await listSectors(db, M)).some((s) => s.source === "nace")).toBe(false);
    const uk = await searchCompanies(db, M, "lloyds", { countries: ["GB"] });
    expect(uk.some((c) => /Lloyds Banking Group/.test(c.name) && c.source === "borsa" && c.country === "GB")).toBe(true);
    expect(await searchCompanies(db, M, "lloyds", { countries: ["IT"] })).toHaveLength(0);
    expect((await searchSectors(db, M, "Bekleidung")).some((s) => s.nace === "14")).toBe(true);
  });

  it("browsing pages through everything, in the chosen countries and regions", async () => {
    const all = await browseCompanies(db, M, { countries: ["IT", "GB", "DE", "FR"], perPage: 30 });
    expect(all.total).toBeGreaterThan(2500);
    const lomb = await browseCompanies(db, M, { countries: ["IT"], regions: ["IT:Lombardia"], perPage: 100 });
    expect(lomb.rows.every((c) => c.region == null || c.region === "Lombardia")).toBe(true);
    const page2 = await browseCompanies(db, M, { countries: ["IT"], page: 2, perPage: 30 });
    expect(page2.rows[0].id).not.toBe(lomb.rows[0].id);
  });

  it("a listed company can be chosen, then counts in the ranking and in the short list", async () => {
    const [enel] = await searchCompanies(db, M, "Snam", { countries: ["IT"] });
    expect(await canChoose(db, M, "company", enel.id)).toBe(true);
    await setPref(db, M, "company", enel.id, "like");
    expect((await listCompanies(db, M)).some((c) => c.id === enel.id)).toBe(true);
    expect((await rankPrefs(db, M)).likedCompanies.some((c) => c.name === enel.name)).toBe(true);
  });

  it("suggestions stay inside the countries chosen", async () => {
    await updateProfile(db, M, { countries: ["GB"] });
    const s = await suggestCompanies(db, M, 30);
    expect(s.filter((x) => x.company.source === "borsa").every((x) => x.company.country === "GB")).toBe(true);
    await updateProfile(db, M, { countries: [] });
  });

  it("searches only in the chosen countries, in their language, from a place they chose", async () => {
    await updateProfile(db, L, { countries: ["IT", "GB"], extraPlaces: ["Londra"], roles: ["Contabile"] });
    const plan = searchPlan(await getProfile(db, L), await rankPrefs(db, L));
    expect(plan.searches.map((s) => s.country)).toEqual(["IT", "GB"]);
    expect(plan.searches[1]).toMatchObject({ country: "GB", what: "Accountant", where: "London" });
    expect(toRankProfile(await getProfile(db, L)).synonyms).toContain("Accountant");
    const asked: string[] = [];
    await fetchAdzuna(async (u: string) => (asked.push(u), new Response(JSON.stringify({ results: [] }))), { appId: "a", appKey: "b" }, plan.searches[1]);
    expect(asked[0]).toMatch(/\/jobs\/gb\/search\/1\?.*what=Accountant.*where=London/);
  });

  it("company feeds keep offers in the chosen countries only", () => {
    const xml = (office: string) => `<workzag-jobs><position><id>1</id><name>Analyst</name><office>${office}</office></position></workzag-jobs>`;
    expect(parsePersonioXml(xml("London"), "x", "X")).toHaveLength(0);
    expect(parsePersonioXml(xml("London"), "x", "X", ["IT", "GB"])).toHaveLength(1);
    expect(parsePersonioXml(xml("Milano"), "x", "X")).toHaveLength(1);
  });

  it("hundreds of choices: the best fits are searched every day, the rest in rotation", async () => {
    const some = [...(await searchCompanies(db, M, "plc", { countries: ["GB"], limit: 25 })), ...(await searchCompanies(db, M, "s.p.a", { countries: ["IT"], limit: 25 }))];
    for (const c of some) await setPref(db, M, "company", c.id, "like");
    const ranked = await prioritizedCompanies(db, M);
    expect(ranked.length).toBeGreaterThan(30);
    // Companies outside the countries they look at come last.
    const firstOutside = ranked.findIndex((r) => r.company.country === "GB");
    expect(ranked.slice(firstOutside).every((r) => r.company.country !== "IT" || r.score <= ranked[firstOutside].score)).toBe(true);
    const names = ranked.map((r) => r.company.name);
    const seen = new Set<string>();
    for (let day = 0; day < 40; day++) {
      const picks = todaysPicks(names, 4, day);
      expect(picks.slice(0, 2)).toEqual(names.slice(0, 2)); // the two best, every day
      picks.forEach((p) => seen.add(p));
    }
    expect(seen.size).toBe(names.length); // and everyone else gets a turn
  });

  it("the migration marks people's own entries", async () => {
    const own = await db.select().from(schema.catalogCompanies).where(eq(schema.catalogCompanies.source, "altro"));
    expect(own.every((c) => c.createdByUserId != null)).toBe(true);
  });
});
