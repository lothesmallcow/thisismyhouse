import { describe, expect, it } from "vitest";
import {
  extractApplicationEmails,
  extractContract,
  extractHours,
  extractLanguages,
  extractRemote,
  extractSector,
} from "@/lib/core/extract";

describe("contract", () => {
  it.each([
    ["Contratto a tempo indeterminato, CCNL Commercio", "indeterminato"],
    ["Si offre contratto a tempo determinato di 6 mesi", "determinato"],
    ["Inserimento tramite agenzia in somministrazione", "somministrazione"],
    ["Contratto di apprendistato professionalizzante", "apprendistato"],
    ["Tirocinio extracurriculare di 6 mesi", "stage"],
    ["Collaborazione in partita IVA", "partita_iva"],
    ["Permanent contract, full-time", "indeterminato"],
    ["Fixed-term contract", "determinato"],
    ["Ti offriamo un ambiente dinamico", "unknown"],
  ])("%s -> %s", (t, c) => expect(extractContract(t)).toBe(c));
});

describe("hours", () => {
  it.each([
    ["Orario part-time 20 ore settimanali", "part"],
    ["Impiego a tempo pieno", "full"],
    ["Full time dal lunedì al venerdì", "full"],
    ["40 ore settimanali", "full"],
    ["24 ore settimanali", "part"],
    ["Orario da definire", "unknown"],
  ])("%s -> %s", (t, h) => expect(extractHours(t)).toBe(h));
});

describe("remote", () => {
  it.each([
    ["Lavoro full remote", "remote"],
    ["Possibilità di smart working", "remote"],
    ["Modalità ibrida: 2 giorni a settimana da remoto", "hybrid"],
    ["Hybrid working", "hybrid"],
    ["Lavoro in sede a Torino", "onsite"],
    ["Nessuna informazione", "unknown"],
  ])("%s -> %s", (t, r) => expect(extractRemote(t)).toBe(r));
});

describe("languages", () => {
  it("finds level near the language", () => {
    expect(extractLanguages("Requisiti: inglese fluente, buona conoscenza del francese.")).toEqual([
      { language: "inglese", level: "fluente" },
      { language: "francese", level: "buono" },
    ]);
  });
  it("CEFR levels", () => {
    expect(extractLanguages("Inglese livello B2")).toEqual([{ language: "inglese", level: "buono" }]);
    expect(extractLanguages("English C1 required")).toEqual([{ language: "inglese", level: "fluente" }]);
  });
  it("mention without level is 'richiesto'", () => {
    expect(extractLanguages("È richiesta la conoscenza della lingua tedesca. Tedesco.")).toEqual([{ language: "tedesco", level: "richiesto" }]);
  });
  it("ignores non-requirement mentions", () => {
    expect(extractLanguages("Il nostro sito in inglese è disponibile.")).toEqual([]);
  });
});

describe("sector", () => {
  it("maps titles to sectors", () => {
    expect(extractSector("Impiegata amministrativa")).toBe("Amministrazione e contabilità");
    expect(extractSector("Receptionist hotel")).toBe("Segreteria e reception");
    expect(extractSector("Addetta vendite part-time")).toBe("Vendita e negozi");
    expect(extractSector("Giardiniere")).toBeNull();
  });
  it("does not see 'IT' in a domain name", () => {
    expect(extractSector("Scrivere a info@rossi.example.it")).toBeNull();
  });
});

describe("application e-mail detection", () => {
  it("finds the address and keeps the sentence as evidence", () => {
    const text = "Cerchiamo impiegata.\nGli interessati possono inviare il CV a selezione@rossisrl.example entro il 30 ottobre.";
    expect(extractApplicationEmails(text)).toEqual([
      { email: "selezione@rossisrl.example", evidence: "Gli interessati possono inviare il CV a selezione@rossisrl.example entro il 30 ottobre." },
    ]);
  });
  it("ignores addresses not asked for applications", () => {
    expect(extractApplicationEmails("Per info sul negozio scrivete a info@rossi.example.")).toEqual([]);
    expect(extractApplicationEmails("Invia il CV a noreply@rossi.example")).toEqual([]);
  });
  it("ignores privacy-notice addresses", () => {
    expect(
      extractApplicationEmails("Informativa privacy: il titolare del trattamento dei dati dei candidati è contattabile a dpo@rossi.example."),
    ).toEqual([]);
  });
  it("handles English ads", () => {
    expect(extractApplicationEmails("Please send your CV to jobs@acme.example.")[0].email).toBe("jobs@acme.example");
  });
  it("deduplicates and lowercases", () => {
    const r = extractApplicationEmails("Invia il CV a HR@Acme.example. Ripeto: invia il curriculum a hr@acme.example");
    expect(r.map((x) => x.email)).toEqual(["hr@acme.example"]);
  });
});
