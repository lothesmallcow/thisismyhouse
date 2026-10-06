// Web results: title, company and place as job sites write them. A place or the site's own name is
// never taken for the company.
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { parseResultTitle } from "@/lib/sources/web/w1";
import { mostFrequentName } from "@/lib/core/company-names";
import { ensureCatalog } from "@/lib/server/catalog";
import { backfillCompanies, resetKnownCompanies } from "@/lib/server/company-guess";
import { schema } from "@/lib/db";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");

describe("result titles", () => {
  it.each([
    ["Impiegata amministrativa - Rossi Srl - Torino | LinkedIn", { title: "Impiegata amministrativa", company: "Rossi Srl", location: "Torino" }],
    ["MUFG hiring Corporate Debt Capital Markets (DCM) Internship 2026 in London, England, United Kingdom | LinkedIn", { title: "Corporate Debt Capital Markets (DCM) Internship 2026", company: "MUFG", location: "London, England, United Kingdom" }],
    ["Stage Asset Management SGR - Milano, Lombardia - Indeed.com", { title: "Stage Asset Management SGR", company: null, location: "Milano, Lombardia" }],
    ["Investment Banking Internship Scheme 2027 - Reed.co.uk", { title: "Investment Banking Internship Scheme 2027", company: null, location: null }],
    ["Analista - Banca Sella - Biella | LinkedIn", { title: "Analista", company: "Banca Sella", location: "Biella" }],
    ["Si cerca stagista contabile", { title: "Si cerca stagista contabile", company: null, location: null }],
  ])("%s", (raw, want) => {
    expect(parseResultTitle(raw)).toEqual(want);
  });
});

describe("a name said once", () => {
  it("counts when it sits where a company is written, not anywhere", () => {
    expect(mostFrequentName("Tirocinio formativo/stage\nPrelios Sgr · 3.6\nMilano, Lombardia\nRequisiti: laurea in economia.", [], { title: "Stage Asset Management SGR" })).toBe("Prelios Sgr");
    expect(mostFrequentName(`${"Descrizione lunga del ruolo. ".repeat(20)} Excel avanzato richiesto.`, [], { title: "Stage" })).toBeNull();
    expect(mostFrequentName(`${"Descrizione lunga del ruolo. ".repeat(20)} Lavorerai presso Fondo Alfa nel team.`, [], { title: "Stage" })).toBe("Fondo Alfa");
  });
});

describe("companies that were not one", () => {
  it("a place or a job site saved as the company is emptied and guessed again", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    resetKnownCompanies();
    const base = { dedupeKey: "k", title: "Stage Asset Management SGR", city: "Milano", firstSeenAt: NOW, updatedAt: NOW };
    const [a] = await db.insert(schema.jobs).values({ ...base, company: "Milano, Lombardia", description: "Prelios Sgr · 3.6\nMilano, Lombardia" }).returning({ id: schema.jobs.id });
    const [b] = await db.insert(schema.jobs).values({ ...base, dedupeKey: "k2", title: "IB Internship Scheme 2027", company: "Reed.co.uk", description: "Ten weeks." }).returning({ id: schema.jobs.id });
    await backfillCompanies(db);
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, a.id) }))?.company).toBe("Prelios Sgr");
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, b.id) }))?.company).toBeNull();
  });
});
