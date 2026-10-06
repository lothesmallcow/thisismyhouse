// "Cosa fai ora?": the track it implies, the right to work, recent graduates, years said vs CV.
import { describe, expect, it, vi } from "vitest";
import { needsVisa, SITUATIONS, situationOf, workRightsOf } from "@/lib/core/situation";
import { NO_CHOICES, rankJob, stageOf, type RankJob, type RankProfile } from "@/lib/core/rank";
import { schema } from "@/lib/db";
import { background } from "@/lib/server/person";
import { getProfile, updateProfile } from "@/lib/server/profile";
import { eq } from "drizzle-orm";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");

describe("Cosa fai ora?", () => {
  it("students get the studies questionnaire, workers the experience one", () => {
    expect(SITUATIONS.filter((s) => s.track === "stage").map((s) => s.key)).toEqual(["superiori", "triennale", "magistrale", "neolaureato"]);
    expect(situationOf("cambio")?.track).toBe("lavoro");
    expect(situationOf("altro")).toBeNull();
  });
  it("a recent graduate counts as final year, high school as the first years", () => {
    expect(stageOf({ situation: "neolaureato", studyYear: null, degreeYears: null })).toBe("ultimo");
    expect(stageOf({ situation: "superiori", studyYear: 4, degreeYears: 5 })).toBe("primi-anni");
    expect(stageOf({ situation: "triennale", studyYear: 2, degreeYears: 3 })).toBe("penultimo");
  });
  it("visa needed? EU citizens free in IT, DE, FR; the UK only with the right ticked", () => {
    expect(needsVisa("DE", ["UE"])).toBe(false);
    expect(needsVisa("GB", ["UE"])).toBe(true);
    expect(needsVisa("GB", ["UE", "GB"])).toBe(false);
    expect(needsVisa("IT", [], ["IT"])).toBe(false); // living and looking in Italy
    expect(needsVisa("FR", [], ["IT"])).toBe(true);
    const f = new FormData();
    f.set("workRightsShown", "1");
    f.append("workRight", "GB");
    f.append("workRight", "XX");
    expect(workRightsOf(f)).toEqual({ workRights: ["GB"] });
    expect(workRightsOf(new FormData())).toEqual({});
  });
  it("the ranking follows the rights they ticked", () => {
    const p: RankProfile = { ...NO_CHOICES, track: "stage", roles: [], synonyms: [], maxKm: 30, remoteOk: true, hours: "any", contracts: [], minAnnualGross: null, languages: [], avoidKeywords: [], avoidCompanies: [], avoidSectors: [], studyYear: 1, degreeYears: 3, countries: ["IT", "GB"] };
    const job: RankJob = { title: "Spring Week", company: "Banca Esempio", description: "", sector: null, distanceKm: null, remote: "onsite", hours: "unknown", contract: "unknown", minAnnualGross: null, maxAnnualGross: null, languages: [], postedAt: NOW, scamFlagCount: 0, city: "London", country: "GB", jobType: "programma", eligibility: ["diritto-lavoro"] };
    const why = (r: ReturnType<typeof rankJob>) => r.factors.map((x) => x.reason).join(" | ");
    expect(why(rankJob(job, p, [], NOW))).toMatch(/servirebbe un visto/);
    expect(why(rankJob(job, { ...p, workRights: ["UE", "GB"] }, [], NOW))).not.toMatch(/visto/);
  });
});

describe("years of experience", () => {
  it("what they said counts until the CV timeline says otherwise", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, NOW);
    await db.delete(schema.experiences).where(eq(schema.experiences.userId, L));
    await updateProfile(db, L, { situation: "esperto", yearsExperience: 5 });
    expect((await background(db, L, await getProfile(db, L))).person.years).toBe(5);
    await db.insert(schema.experiences).values({ userId: L, kind: "lavoro", title: "Segretaria", organization: "Studio Esempio", startYear: 2024, current: true, description: "" });
    expect((await background(db, L, await getProfile(db, L))).person.years).not.toBe(5);
  });
});
