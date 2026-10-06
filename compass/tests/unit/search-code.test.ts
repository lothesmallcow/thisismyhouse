// Search codes (ADR 0021): brackets from the questionnaire, a stable batch of searches, shared and
// cached, and only the affected searches change when an answer changes.
import { describe, expect, it, vi } from "vitest";
import { buildSearchCode, levelBracket, type CodeInput } from "@/lib/core/search-code";
import { freshQueries, markSearched, searchCodeFor } from "@/lib/pipeline/search-terms";
import { eq } from "drizzle-orm";
import { schema } from "@/lib/db";
import { getProfile, updateProfile } from "@/lib/server/profile";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

const base: CodeInput = {
  track: "lavoro",
  roles: ["Store manager", "Client advisor"],
  sectors: [{ slug: "moda-lusso", term: "moda" }],
  companies: [],
  places: [{ country: "IT", where: "Milano", distanceKm: 15 }],
  years: 11,
  studyStage: null,
  hours: "full",
  contracts: ["indeterminato"],
};

describe("the grammar of searches", () => {
  it("role × place, then the boards, the chosen companies, the sectors, the other names", () => {
    const q = buildSearchCode({ ...base, roles: ["Sales manager"], years: 6, companies: ["Gucci", "Prada"], synonyms: ["Direttore commerciale"], remoteOk: true }).queries;
    const kinds = q.map((x) => x.kind ?? "ruolo");
    // The plain role searches come first; the rest follow, best first.
    expect(kinds.indexOf("bacheca")).toBeGreaterThan(kinds.lastIndexOf("ruolo") - 1);
    expect(q).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "bacheca", what: "Sales manager", where: "Milano" }),
      expect.objectContaining({ kind: "azienda", what: "Sales manager", extra: "Gucci", sites: ["linkedin.com"] }),
      expect.objectContaining({ kind: "settore", channel: "api", what: "Sales manager", extra: "moda" }),
      expect.objectContaining({ kind: "variante", channel: "api", what: "Direttore commerciale" }),
      expect.objectContaining({ kind: "variante", extra: "da remoto" }),
    ]));
    expect(new Set(q.map((x) => x.key)).size).toBe(q.length); // each once
    expect(q.length).toBeGreaterThan(20); // one role, two companies, one sector: already more than twenty searches
  });
});

describe("search code", () => {
  it("brackets and a stable batch: same answers, same code and same keys", () => {
    const a = buildSearchCode(base);
    expect(a.code).toBe("L · IT:Milano(15) · store-manager + client-advisor · lead · moda-lusso · full + indeterminato");
    expect(buildSearchCode({ ...base }).queries.map((q) => q.key)).toEqual(a.queries.map((q) => q.key));
    expect(a.queries.filter((q) => q.channel === "api" && !q.kind).map((q) => q.what)).toEqual(["Store manager", "Client advisor"]);
    expect(a.queries.filter((q) => q.channel === "web").some((q) => q.sites?.[0] === "infojobs.it")).toBe(true);
  });
  it("changing one answer changes only the searches that depend on it", () => {
    const a = buildSearchCode(base).queries.map((q) => q.key);
    const b = buildSearchCode({ ...base, roles: ["Store manager", "Area manager"] }).queries.map((q) => q.key);
    const kept = a.filter((k) => b.includes(k));
    expect(kept.length).toBeGreaterThan(0); // the Store manager searches stay (and stay cached)
    expect(kept.every((k) => k.includes("store manager"))).toBe(true);
    const londra = buildSearchCode({ ...base, places: [...base.places, { country: "GB", where: "London", distanceKm: 30 }] });
    expect(londra.queries.filter((q) => q.country === "GB").map((q) => q.what)).toContain("Store manager"); // no translation known: kept as is
    expect(londra.queries.filter((q) => q.country === "IT").map((q) => q.key)).toEqual(expect.arrayContaining(a));
  });
  it("level and students change the words searched", () => {
    expect(levelBracket(1)).toBe("junior");
    expect(buildSearchCode({ ...base, roles: ["Contabile"], years: 1 }).queries[0].what).toBe("Contabile junior");
    const s = buildSearchCode({ ...base, track: "stage", roles: [], sectors: [{ slug: "investment-banking", term: "m&a" }], studyStage: "primi-anni", places: [{ country: "GB", where: "London", distanceKm: 30 }] });
    expect(s.queries[0].what).toBe("internship m&a");
    expect(s.code.startsWith("S · GB:London(30) · investment-banking · primi-anni")).toBe(true);
  });
  it("ready links to create the alerts on LinkedIn, Indeed and InfoJobs", () => {
    const a = buildSearchCode(base).alerts;
    expect(a.map((x) => x.site)).toEqual(["LinkedIn", "Indeed", "InfoJobs"]);
    expect(a[0].url).toBe("https://www.linkedin.com/jobs/search/?keywords=Store%20manager&location=Milano");
  });
});

describe("shared and cached in the database", () => {
  it("a search made by anyone in the last 20 hours is not made again", async () => {
    const db = await freshDb();
    const NOW = new Date("2026-10-05T07:00:00Z");
    const { L, M } = await seedPeople(db, NOW);
    // Same answers as Lucia where it matters: role, place, radius; no work history (no "junior" form).
    const lucia = await getProfile(db, L);
    await updateProfile(db, M, { track: "lavoro", roles: lucia.roles, city: lucia.city, maxKm: lucia.maxKm, countries: [], regions: [], extraPlaces: [] });
    await db.delete(schema.experiences).where(eq(schema.experiences.userId, M));
    const a = (await searchCodeFor(db, L, NOW)).queries;
    const b = (await searchCodeFor(db, M, NOW)).queries;
    const shared = a.filter((q) => b.some((x) => x.key === q.key));
    expect(shared.length).toBeGreaterThan(0); // same brackets → same searches, made once for both
    await markSearched(db, shared[0].key, 12, NOW);
    expect((await freshQueries(db, a, new Date(NOW.getTime() + 3_600_000))).some((q) => q.key === shared[0].key)).toBe(false);
    expect((await freshQueries(db, a, new Date(NOW.getTime() + 21 * 3_600_000))).some((q) => q.key === shared[0].key)).toBe(true);
  });
});
