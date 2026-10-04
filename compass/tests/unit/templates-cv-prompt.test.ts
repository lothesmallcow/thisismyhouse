import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, merge, unknownFields } from "@/lib/core/templates";
import { pickCv } from "@/lib/core/cv-pick";
import { buildClaudePrompt } from "@/lib/core/prompt";
import { normalizeJob } from "@/lib/core/normalize";

describe("templates", () => {
  it("fills merge fields", () => {
    expect(merge("Candidatura per {ruolo} | {nome}", { ruolo: "Impiegata", nome: "Maria Bianchi" })).toBe("Candidatura per Impiegata | Maria Bianchi");
  });
  it("uses gentle fallbacks for missing values", () => {
    expect(merge("Gentile {azienda},", {})).toBe("Gentile la vostra azienda,");
    expect(merge("Lavoro a {citta}.", {})).toBe("Lavoro a.");
  });
  it("flags unknown fields", () => {
    expect(unknownFields("Ciao {nome} {cognome}")).toEqual(["cognome"]);
  });
  it("default templates only use known fields and never claim experience", () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(unknownFields(t.subject + t.body)).toEqual([]);
      expect(t.body).not.toMatch(/anni di esperienza|esperienza pluriennale/);
    }
  });
});

describe("pickCv", () => {
  const cvs = [
    { id: 1, label: "CV Amministrazione", roleFamily: "Amministrazione", isDefault: true },
    { id: 2, label: "CV Segreteria", roleFamily: "Segreteria", isDefault: false },
  ];
  it("picks by title", () => {
    expect(pickCv(cvs, { title: "Receptionist", sector: null })?.id).toBe(2);
    expect(pickCv(cvs, { title: "Addetta contabilità", sector: null })?.id).toBe(1);
  });
  it("falls back to sector, then default", () => {
    expect(pickCv(cvs, { title: "Operatrice", sector: "Segreteria e reception" })?.id).toBe(2);
    expect(pickCv(cvs, { title: "Operatrice", sector: null })?.id).toBe(1);
  });
  it("no CVs -> null", () => expect(pickCv([], { title: "x", sector: null })).toBeNull());
});

describe("Claude prompt", () => {
  it("contains the job, the CV and the no-invention rule", () => {
    const p = buildClaudePrompt({
      job: { title: "Impiegata", company: "Rossi Srl", city: "Torino", description: "Testo annuncio", url: "https://x.it/1" },
      cvText: "Esperienza: contabilità",
      name: "Maria",
    });
    expect(p).toMatch(/Non inventare nulla/);
    expect(p).toMatch(/Rossi Srl/);
    expect(p).toMatch(/Esperienza: contabilità/);
    expect(p).toMatch(/firmata "Maria"/);
  });
});

describe("normalizeJob", () => {
  it("turns a raw ad into normalized fields", () => {
    const home = { lat: 45.06776, lng: 7.68249 }; // Torino
    const j = normalizeJob(
      {
        source: "manual",
        url: "https://www.rossisrl.it/lavora-con-noi?utm_source=x",
        title: "Impiegata amministrativa part-time",
        company: "Rossi Srl",
        location: "Moncalieri (TO)",
        description:
          "Rossi Srl cerca una impiegata amministrativa part-time, 25 ore settimanali.\nContratto a tempo indeterminato.\nRAL 24.000 € lordi.\nRichiesta buona conoscenza dell'inglese.\nInviare il CV a selezione@rossisrl.it",
      },
      home,
    );
    expect(j).toMatchObject({
      city: "Moncalieri",
      province: "TO",
      hours: "part",
      contract: "indeterminato",
      applicationEmail: "selezione@rossisrl.it",
      sector: "Amministrazione e contabilità",
      url: "https://rossisrl.it/lavora-con-noi",
      scamFlags: [],
    });
    expect(j.salary.minAnnualGross).toBe(24000);
    expect(j.distanceKm).toBeLessThan(10);
    expect(j.languages).toEqual([{ language: "inglese", level: "buono" }]);
  });
});
