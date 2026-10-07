// What an ad asks and offers, read by rules: each one a search filter.
import { describe, expect, it } from "vitest";
import { applyEffort, extractBenefits, extractEducation, extractFacts, extractMinYears, extractSeniority, extractSmartDays, isAgency } from "@/lib/core/job-facts";

describe("years of experience", () => {
  it.each([
    ["Richiesta esperienza di almeno 3 anni nel ruolo.", 3],
    ["Hai almeno 2 anni di esperienza nella vendita", 2],
    ["2-3 anni di esperienza in contabilità", 2],
    ["5+ years of experience in sales", 5],
    ["At least three years of experience in a similar role", 3],
    ["Esperienza triennale nella mansione", 3],
    ["Pregressa esperienza pluriennale", 3],
    ["Anche senza esperienza: ti formiamo noi", 0],
    ["Rivolto a neolaureati in economia", 0],
    ["Laurea triennale in economia", null],
    ["Ambiente giovane e dinamico, da 30 anni sul mercato", null],
  ])("%s → %s", (text, want) => expect(extractMinYears(text)).toBe(want));
});

describe("level", () => {
  it.each([
    ["Stage in Marketing", null, "stage"],
    ["Sales Manager Italia", null, "manager"],
    ["Responsabile amministrativo", null, "manager"],
    ["Senior Accountant", null, "senior"],
    ["Junior Analyst", null, "junior"],
    ["Impiegata amministrativa", 1, "junior"],
    ["Impiegata amministrativa", 3, "mid"],
    ["Contabile", 6, "senior"],
    ["Assistant Store Manager", null, null],
    ["Impiegata", null, null],
  ] as const)("%s (%s anni) → %s", (title, years, want) => expect(extractSeniority(title, years)).toBe(want));
});

describe("education", () => {
  it("highest title asked, and whether it is required", () => {
    expect(extractEducation("Requisiti: laurea magistrale in economia")).toEqual({ education: "laurea-magistrale", required: true });
    expect(extractEducation("Laurea in ingegneria preferibile")).toEqual({ education: "laurea", required: false });
    expect(extractEducation("Diploma di scuola superiore")).toEqual({ education: "diploma", required: true });
    expect(extractEducation("Bachelor's degree in Finance or related field")).toEqual({ education: "laurea", required: true });
    expect(extractEducation("Ambiente stimolante")).toEqual({ education: null, required: false });
    expect(extractEducation("Requisiti: diploma o laurea in economia")).toEqual({ education: "diploma", required: true });
    expect(extractEducation("Diploma di laurea in giurisprudenza")).toEqual({ education: "laurea", required: true });
    expect(extractEducation("Diploma.")).toEqual({ education: "diploma", required: true });
  });
});

describe("benefits, shifts, travel, licence, smart working", () => {
  it("benefits", () => {
    expect(extractBenefits("Offriamo buoni pasto, welfare aziendale, auto aziendale ad uso promiscuo e assicurazione sanitaria integrativa")).toEqual(["buoni-pasto", "welfare", "auto", "sanitaria"]);
    expect(extractBenefits("Ticket restaurant e orario flessibile, 14 mensilità")).toEqual(["buoni-pasto", "flessibilita", "quattordicesima"]);
  });
  it.each([
    ["2 giorni di smart working a settimana", 2],
    ["Smart working: 3 gg a settimana", 3],
    ["Hybrid: 2 days in the office", 3],
    ["Posizione full remote", 5],
    ["Lavoro in sede", null],
  ])("%s → %s", (text, want) => expect(extractSmartDays(text)).toBe(want));
  it("the rest", () => {
    const f = extractFacts({ title: "Operaio", description: "Lavoro su turni anche notturni. Richiesta patente B, disponibilità a trasferte. Assunzione riservata alle categorie protette (L. 68/99).", company: "Acme", urls: [], applicationEmail: null });
    expect(f).toMatchObject({ shifts: true, nights: true, license: true, travel: true, protectedCategories: true, agency: false, evergreen: false });
  });
});

describe("who posted it, how long the application is", () => {
  it("agencies", () => {
    expect(isAgency("Randstad Italia", "")).toBe(true);
    expect(isAgency("Gi Group S.p.A.", "")).toBe(true);
    expect(isAgency("Studio Rossi", "Per importante azienda cliente cerchiamo un contabile")).toBe(true);
    expect(isAgency("Ferrero", "Ferrero cerca un analista")).toBe(false);
  });
  it("quick or long application", () => {
    expect(applyEffort(["https://barclays.wd3.myworkdayjobs.com/x/job/1"], null)).toBe("lunga");
    expect(applyEffort(["https://boards.greenhouse.io/acme/jobs/1"], null)).toBe("facile");
    expect(applyEffort(["https://www.example.it/annuncio"], "hr@example.it")).toBe("facile");
    expect(applyEffort(["https://www.example.it/annuncio"], null)).toBeNull();
  });
  it("always-open applications", () => {
    expect(extractFacts({ title: "Candidatura spontanea", description: "Inviaci il tuo CV", company: "Acme", urls: [], applicationEmail: null }).evergreen).toBe(true);
  });
});
