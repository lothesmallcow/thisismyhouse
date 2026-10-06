// Every ESCO occupation: a typed role pinned to a real one by any of its names, suggestions while
// typing, and where a career can move (jobs that need most of the same skills).
import { afterEach, describe, expect, it, vi } from "vitest";
import { careerMoves, findOccupation, occupationNames, searchOccupations, setOccupationsForTest } from "@/lib/catalog/occupations";
import { suggestSynonyms } from "@/lib/server/profile";

vi.mock("server-only", () => ({}));

const occ = (id: string, it: string, en: string, isco: string, ess: number[], opt: number[] = [], alt: { it?: string[]; en?: string[] } = {}) => ({ id, it, en, de: en, fr: en, isco, alt: { it: alt.it ?? [], en: alt.en ?? [] }, ess, opt });
const DATA = {
  skills: ["negoziare contratti", "gestire un team", "analizzare dati di vendita", "relazioni con i clienti", "pianificare budget", "programmare in Python", "contabilità"],
  occupations: [
    occ("sm", "responsabile vendite", "sales manager", "1221", [0, 1, 2, 3, 4], [], { it: ["direttore commerciale", "sales manager"], en: ["head of sales"] }),
    occ("kam", "key account manager", "key account manager", "2433", [0, 3, 2], [1]),
    occ("bdm", "responsabile sviluppo commerciale", "business development manager", "1221", [0, 3, 4, 2]),
    occ("cs", "addetto al servizio clienti", "customer service representative", "4222", [3]),
    occ("dev", "sviluppatore software", "software developer", "2512", [5, 2]),
    occ("acc", "contabile", "accountant", "2411", [6, 4]),
  ],
};
afterEach(() => setOccupationsForTest(null));

describe("occupations", () => {
  it("a role is pinned by any of its names, in Italian or English", () => {
    setOccupationsForTest(DATA);
    expect(findOccupation("Sales Manager")?.id).toBe("sm");
    expect(findOccupation("Direttore commerciale")?.id).toBe("sm");
    expect(findOccupation("head of sales")?.id).toBe("sm");
    expect(findOccupation("astronauta")).toBeNull();
  });
  it("suggestions while typing: what starts with it first", () => {
    setOccupationsForTest(DATA);
    expect(searchOccupations("sales")[0].occ.id).toBe("sm");
    expect(searchOccupations("key acc")[0].occ.id).toBe("kam");
    expect(searchOccupations("dir comm")[0].occ.id).toBe("sm"); // words in any name
    expect(searchOccupations("x")).toEqual([]);
  });
  it("its other names become the searches' synonyms", () => {
    setOccupationsForTest(DATA);
    expect(occupationNames(findOccupation("sales manager")!)).toEqual(expect.arrayContaining(["direttore commerciale", "head of sales"]));
    expect(suggestSynonyms(["Sales manager"])).toEqual(expect.arrayContaining(["Responsabile vendite", "Direttore commerciale", "Head of sales"]));
  });
  it("career moves: the jobs needing most of the same skills, with the skills in common", () => {
    setOccupationsForTest(DATA);
    const moves = careerMoves(findOccupation("sales manager")!);
    expect(moves.map((m) => m.occ.id).slice(0, 2)).toEqual(expect.arrayContaining(["bdm", "kam"]));
    expect(moves[0].score).toBeGreaterThanOrEqual(90);
    expect(moves[0].shared.length).toBeGreaterThan(0);
    expect(moves.some((m) => m.occ.id === "dev" && m.score > 60)).toBe(false); // little in common
    expect(moves.some((m) => m.occ.id === "sm")).toBe(false); // not itself
  });
});
