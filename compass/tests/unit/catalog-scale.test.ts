// The catalog at register scale (~950,000 rows): searches and pages read through indexes, never the
// whole table (online databases bill by rows read).
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { RegisterRecord } from "@/lib/catalog/registers";
import { schema } from "@/lib/db";
import { BROWSE_COUNT_CAP, browseCompanies, catalogCounts, ensureCatalog, ftsQuery, importRegister, searchCompanies } from "@/lib/server/catalog";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

const rec = (name: string, i: number, extra: Partial<RegisterRecord> = {}): RegisterRecord => ({ name, id: `R${i}`, country: "IT", city: "Bergamo", nace: null, industry: null, employees: null, website: null, ...extra });

describe("catalog at scale", () => {
  it("full-text query: every word as a prefix, accents and punctuation ignored", () => {
    expect(ftsQuery("Sartoria  Esempio")).toBe('"sartoria"* "esempio"*');
    expect(ftsQuery("Società d'arte")).toBe('"societa"* "arte"*');
    expect(ftsQuery("a")).toBeNull();
  });

  it("register companies are found through the index, which follows renames and deletions", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, new Date("2026-10-05T07:00:00Z"));
    await ensureCatalog(db);
    await importRegister(db, [rec("Pelletteria Esempio Srl", 1, { employees: 30 }), rec("Officina Prova Spa", 2)]);
    const [pel] = await searchCompanies(db, L, "pellet", { countries: ["IT"] });
    expect(pel).toMatchObject({ name: "Pelletteria Esempio Srl", source: "registro" });
    expect(await searchCompanies(db, L, "bergamo", { countries: ["GB"] })).toHaveLength(0);
    await db.update(schema.catalogCompanies).set({ name: "Calzaturificio Esempio Srl" }).where(eq(schema.catalogCompanies.id, pel.id));
    expect(await searchCompanies(db, L, "pelletteria", { countries: ["IT"] })).toHaveLength(0);
    expect((await searchCompanies(db, L, "calzatur", { countries: ["IT"] }))[0]?.id).toBe(pel.id);
    await db.delete(schema.catalogCompanies).where(eq(schema.catalogCompanies.id, pel.id));
    expect(await searchCompanies(db, L, "calzatur", { countries: ["IT"] })).toHaveLength(0);
    // The register count is stored at import time: pages never count the register rows.
    expect((await catalogCounts(db)).listed).toBeGreaterThanOrEqual(2);
  });

  it("browsing: hand-made and listed companies first, then the register ones biggest first, the count capped", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, new Date("2026-10-05T07:00:00Z"));
    await ensureCatalog(db);
    const many = Array.from({ length: BROWSE_COUNT_CAP + 50 }, (_, i) => rec(`Impresa Esempio ${String(i).padStart(5, "0")} Srl`, i, { employees: i === 7 ? 6000 : null }));
    await importRegister(db, many);
    const first = await browseCompanies(db, L, { countries: ["IT"], perPage: 30 });
    expect(first.capped).toBe(true);
    const small = first.total - BROWSE_COUNT_CAP; // the hand-made and listed ones she can see, all counted
    expect(small).toBeGreaterThan(30);
    expect(first.rows.every((r) => r.source !== "registro")).toBe(true);
    // The first register page starts right after the last hand-made/listed company, biggest first.
    const page = Math.floor(small / 30) + 1;
    const boundary = await browseCompanies(db, L, { countries: ["IT"], page, perPage: 30 });
    const firstReg = boundary.rows.find((r) => r.source === "registro");
    expect(firstReg?.name).toBe("Impresa Esempio 00007 Srl");
    const next = await browseCompanies(db, L, { countries: ["IT"], page: page + 1, perPage: 30 });
    expect(next.rows.every((r) => r.source === "registro")).toBe(true);
    expect(new Set([...boundary.rows, ...next.rows].map((r) => r.id)).size).toBe(boundary.rows.length + next.rows.length);
  }, 60_000);
});
