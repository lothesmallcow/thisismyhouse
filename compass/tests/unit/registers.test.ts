// Official company registers and ESCO positions: readers on fake samples in the official layouts,
// the import with its filters, and positions in four languages.
import fs from "node:fs";
import { execSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { csvCells, naceFromCode, readerFor, sizeBand, tidyRegisterName, type RegisterFormat, type RegisterRecord } from "@/lib/catalog/registers";
import { schema } from "@/lib/db";
import { ensureCatalog, importRegister, listCompanies, searchCompanies } from "@/lib/server/catalog";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

function read(format: RegisterFormat, file: string): RegisterRecord[] {
  const lines = fs.readFileSync(`fixtures/registers/${file}`, "utf8").split("\n").filter(Boolean);
  const r = readerFor(format);
  const out: RegisterRecord[] = [];
  lines.forEach((l, i) => {
    if (i === 0 && format !== "offeneregister") return r.header(l);
    const x = r.row(l);
    if (x) out.push(x);
  });
  return out;
}

describe("register readers (fake rows in the official layouts)", () => {
  it("Companies House: active companies with a real activity, SIC → NACE", () => {
    const r = read("companies-house", "companies-house.csv");
    expect(r.map((x) => x.name)).toEqual(["Example Luxury Retail LTD", "Example Watches, Jewellers LTD"]); // dormant and dissolved skipped
    expect(r[0]).toMatchObject({ country: "GB", city: "London", nace: "47.71", id: "00000001" });
  });
  it("SIRENE: active head offices only, NAF → NACE, employee band", () => {
    const r = read("sirene", "sirene.csv");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ name: "Maison Exemple Couture", country: "FR", nace: "47.71", employees: 100 });
  });
  it("OffeneRegister, GLEIF, plain CSV", () => {
    expect(read("offeneregister", "offeneregister.jsonl")).toEqual([expect.objectContaining({ name: "Beispiel Mode GmbH", city: "München", country: "DE" })]);
    expect(read("gleif", "gleif.csv")).toEqual([expect.objectContaining({ name: "Esempio Moda S.P.A.", city: "Milano", country: "IT" })]);
    expect(read("csv", "aziende.csv").map((x) => [x.name, x.nace, x.employees])).toEqual([["Sartoria Esempio Srl", "14.13", 12], ["Orologeria Esempio Srl", "47.77", 4]]);
  });
  it("small helpers", () => {
    expect(csvCells('"A, B",c,"d ""e"""')).toEqual(["A, B", "c", 'd "e"']);
    expect([naceFromCode("47710"), naceFromCode("47.71Z"), naceFromCode("99999"), naceFromCode("")]).toEqual(["47.71", "47.71", null, null]);
    expect([sizeBand(4), sizeBand(120), sizeBand(12000), sizeBand(null)]).toEqual([0, 2, 5, null]);
    expect(tidyRegisterName("SOCIETA' ESEMPIO SRL")).toBe("Societa' Esempio SRL");
  });
});

describe("import into the catalog", () => {
  it("adds register companies (hidden until searched), with filters, never twice", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, new Date("2026-10-05T07:00:00Z"));
    await ensureCatalog(db);
    const all = [...read("companies-house", "companies-house.csv"), ...read("sirene", "sirene.csv"), ...read("csv", "aziende.csv"), ...read("gleif", "gleif.csv")];
    const r = await importRegister(db, all, { minEmployees: 10 });
    expect(r.added).toBe(2); // Paris couture (100) and the Napoli tailor (12); the rest have fewer or unknown employees
    const again = await importRegister(db, all, {});
    expect(again.added).toBe(all.length - 2); // the two already there are skipped
    expect((await importRegister(db, all, {})).added).toBe(0);
    const watches = (await searchCompanies(db, L, "watches", { countries: ["GB"] }))[0];
    expect(watches).toMatchObject({ source: "registro", country: "GB", city: "Manchester", region: "England" });
    const napoli = (await searchCompanies(db, L, "sartoria esempio", { countries: ["IT"] }))[0];
    expect(napoli.region).toBe("Campania");
    expect(napoli.sectorId).toBe((await db.query.catalogSectors.findFirst({ where: eq(schema.catalogSectors.slug, "moda-lusso") }))!.id); // NACE 14.13 → fashion
    expect((await listCompanies(db, L)).some((c) => c.source === "registro")).toBe(false); // not dumped into the short lists
  });
  it("region and NACE filters", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    const all = [...read("csv", "aziende.csv"), ...read("companies-house", "companies-house.csv")];
    expect((await importRegister(db, all, { regions: ["IT:Lombardia"] })).added).toBe(1); // only Milano
    expect((await importRegister(db, all, { nace: ["47.7"] })).added).toBe(2); // the UK shops (Milano's watch shop is there already)
  });
});

describe("ESCO positions in four languages", () => {
  it("the importer writes them and the questionnaire and searches use them", async () => {
    execSync("npx tsx scripts/import-esco.ts --dir fixtures/esco", { stdio: "pipe" });
    try {
      vi.resetModules();
      const { findPosition, translations, positionsFor } = await import("@/lib/catalog/positions");
      expect(findPosition("orologiaio")?.en).toBe("watchmaker");
      expect(translations("orologiaio", ["de", "fr"])).toEqual(["Uhrmacher", "horloger"]);
      expect(positionsFor("lavoro").some((p) => p.it === "assistente alle vendite")).toBe(true);
    } finally {
      fs.rmSync("data/world/positions-esco.json", { force: true });
    }
  });
});
