// Job priority (alta/media/bassa) and the positions recommended from the CV.
import { describe, expect, it } from "vitest";
import { recommendPositions, type CvPositionInput } from "@/lib/core/cv-positions";
import { NO_CHOICES, rankJob, type RankJob, type RankProfile } from "@/lib/core/rank";
import { buildSearchCode, type CodeInput } from "@/lib/core/search-code";

const code: CodeInput = {
  track: "lavoro",
  roles: ["Venditrice moda"],
  sectors: [{ slug: "moda-lusso", term: "moda" }],
  companies: [],
  places: [{ country: "IT", where: "Milano", distanceKm: 15 }],
  years: 8,
  studyStage: null,
  hours: "full",
  contracts: [],
};
const api = (i: CodeInput) => buildSearchCode(i).queries.filter((q) => q.channel === "api").map((q) => q.what);

describe("priorità di lavoro: the searches", () => {
  it("alta searches more titles (also a step below), bassa only the best one", () => {
    const media = api(code);
    const alta = api({ ...code, priority: "alta" });
    const bassa = api({ ...code, priority: "bassa" });
    expect(media).toEqual(["Store manager lusso", "Client advisor"]);
    expect(alta).toEqual(expect.arrayContaining(["Store manager lusso", "Client advisor", "Sales associate lusso"]));
    expect(alta.length).toBeGreaterThan(media.length);
    expect(bassa).toEqual(["Store manager lusso"]);
    expect(buildSearchCode({ ...code, priority: "bassa" }).brackets.at(-1)).toEqual({ label: "Priorità", value: "bassa" });
  });
});

describe("priorità di lavoro: the score", () => {
  const profile: RankProfile = { ...NO_CHOICES, roles: ["Contabile"], synonyms: [], maxKm: 25, remoteOk: false, hours: "full", contracts: [], minAnnualGross: null, languages: [], avoidKeywords: [], avoidCompanies: [], avoidSectors: [], person: { years: 9, hasDegree: false, studying: false, text: "" } };
  const job: RankJob = { city: "Milano", jobType: "unknown", eligibility: [], title: "Contabile junior", company: "Rossi Srl", description: "", sector: null, distanceKm: 5, remote: "onsite", hours: "full", contract: "unknown", minAnnualGross: null, maxAnnualGross: null, languages: [], postedAt: new Date("2026-10-04T08:00:00Z"), scamFlagCount: 0 };
  const now = new Date("2026-10-05T08:00:00Z");
  it("a junior job for someone with 9 years: no penalty in a hurry, a bigger one when waiting", () => {
    const at = (priority: RankProfile["priority"]) => rankJob(job, { ...profile, priority }, [], now);
    const alta = at("alta");
    const media = at("media");
    const bassa = at("bassa");
    expect(alta.factors.some((f) => f.key === "exp-level")).toBe(false);
    expect(media.factors.some((f) => f.key === "exp-level")).toBe(true);
    expect(bassa.score).toBeLessThan(media.score);
    expect(media.score).toBeLessThanOrEqual(alta.score);
  });
});

describe("posizioni consigliate dal CV", () => {
  const base: CvPositionInput = {
    track: "lavoro",
    experiences: [
      { kind: "lavoro", title: "Store manager", organization: "Boutique Esempio", current: true },
      { kind: "lavoro", title: "Commessa", organization: "Negozio Uno", current: false },
      { kind: "studio", title: "Diploma", organization: "Liceo", current: false },
    ],
    cvText: "Esperienza come visual merchandiser e store manager. Inglese fluente.",
    years: 9,
    sectors: ["moda-lusso"],
    roles: [],
    priority: "media",
  };
  it("what they did, the next step, and titles in the CV, each with a reason", () => {
    const r = recommendPositions(base);
    const titles = r.map((x) => x.title);
    expect(titles[0]).toBe("Store manager");
    expect(r[0]).toMatchObject({ kind: "fatto", why: "Lo fai ora da Boutique Esempio" });
    // The generic "Commessa" becomes the precise titles of the sector, not "Commessa".
    expect(titles).not.toContain("Commessa");
    expect(titles).toContain("Store manager lusso");
    expect(r.filter((x) => x.kind === "prossimo").map((x) => x.title)).toContain("Area manager");
    expect(r.find((x) => x.title === "Visual merchandiser")?.kind).toBe("nel-cv");
    expect(titles).not.toContain("Diploma");
    expect(titles).not.toContain("Responsabile di negozio"); // the same role as "Store manager", in Italian
    expect(titles.length).toBeLessThanOrEqual(8);
  });
  it("roles already searched are not proposed again; in a hurry no step up", () => {
    const r = recommendPositions({ ...base, roles: ["store manager"], priority: "alta" });
    expect(r.map((x) => x.title)).not.toContain("Store manager");
    expect(r.some((x) => x.kind === "prossimo")).toBe(false);
  });
  it("no CV and no experiences: nothing to propose", () => {
    expect(recommendPositions({ ...base, experiences: [], cvText: "" })).toEqual([]);
  });
});
