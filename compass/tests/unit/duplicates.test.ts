// The same offer must appear once: company written differently, one copy without a company, and the
// copies already stored before the check knew these cases.
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { findDuplicate } from "@/lib/core/dedupe";
import { companyFromText, mostNamed } from "@/lib/core/company-names";
import { ensureCatalog } from "@/lib/server/catalog";
import { guessCompany, resetKnownCompanies } from "@/lib/server/company-guess";
import { mergeDuplicateJobs, upsertRawJob } from "@/lib/server/jobs";
import { schema } from "@/lib/db";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");

describe("duplicates", () => {
  const existing = [
    { id: 1, company: "J.P. Morgan", title: "Investment Banking Summer Analyst", city: "Milano", urls: [] },
    { id: 2, company: null, title: "Stage Controllo di Gestione Junior", city: "Torino", urls: [] },
    { id: 3, company: "Rossi Srl", title: "Addetto contabilità fornitori", city: "Bologna", urls: [] },
  ];
  it("the same company written another way", () => {
    expect(findDuplicate({ company: "JPMorgan", title: "Investment Banking Summer Analyst", city: "Milano" }, existing)).toBe(1);
    expect(findDuplicate({ company: "JP Morgan", title: "Summer Analyst Investment Banking", city: "Milano" }, existing)).toBe(1);
  });
  it("one copy without the company: same precise title, same city", () => {
    expect(findDuplicate({ company: "Banca Esempio", title: "Stage controllo di gestione junior", city: "Torino" }, existing)).toBe(2);
    expect(findDuplicate({ company: null, title: "Addetto contabilità fornitori", city: "Bologna" }, existing)).toBe(3);
  });
  it("not when the city or the title differs, or the title is too short", () => {
    expect(findDuplicate({ company: "Banca Esempio", title: "Stage controllo di gestione junior", city: "Milano" }, existing)).toBeNull();
    expect(findDuplicate({ company: null, title: "Addetto contabilità clienti", city: "Bologna" }, existing)).toBeNull();
    expect(findDuplicate({ company: null, title: "Segretaria", city: "Bologna" }, [{ id: 9, company: "Bianchi", title: "Segretaria", city: "Bologna", urls: [] }])).toBeNull();
    // Two companies that both say who they are stay apart
    expect(findDuplicate({ company: "Verdi Spa", title: "Addetto contabilità fornitori", city: "Bologna" }, existing)).toBeNull();
  });

  it("stored twice before: merged at deploy, with links, folders and people", async () => {
    const db = await freshDb();
    const a = await upsertRawJob(db, { source: "w1", url: "https://annunci.example/a/1", title: "Stage Controllo di Gestione Junior", company: null, location: "Torino", description: "Sei mesi nel team di controllo.", thin: true }, NOW);
    // Stored before the check matched it (an old copy, written straight in)
    const [b] = await db
      .insert(schema.jobs)
      .values({ dedupeKey: "x", title: "Stage controllo di gestione junior", company: "Banca Esempio", city: "Torino", description: "Banca Esempio cerca uno stagista.", firstSeenAt: NOW, updatedAt: NOW })
      .returning({ id: schema.jobs.id });
    await db.insert(schema.jobSources).values({ jobId: b.id, source: "email_linkedin", url: "https://www.linkedin.com/jobs/view/4011111111", seenAt: NOW });
    const other = await upsertRawJob(db, { source: "w1", url: "https://annunci.example/a/3", title: "Analista credito senior", company: "Banca Esempio", location: "Torino", description: "Ruolo nel team crediti.", thin: false }, NOW);
    expect(await mergeDuplicateJobs(db, NOW)).toBe(1);
    const left = await db.select().from(schema.jobs);
    expect(left.map((j) => j.id).sort()).toEqual([a.jobId, other.jobId].sort());
    const kept = left.find((j) => j.id === a.jobId)!;
    expect(kept.company).toBe("Banca Esempio");
    const urls = (await db.select().from(schema.jobSources).where(eq(schema.jobSources.jobId, a.jobId))).map((s) => s.url);
    expect(urls).toContain("https://www.linkedin.com/jobs/view/4011111111");
    expect(await mergeDuplicateJobs(db, NOW)).toBe(0);
  });
});

describe("the company from the whole text", () => {
  it("a sentence that states it", () => {
    expect(companyFromText("Ruolo nel team.\nAzienda: Banca Esempio S.p.A. - Milano\nRequisiti...")).toBe("Banca Esempio S.p.A");
    expect(companyFromText("What you'll do... About Acme Capital\nAcme is a boutique.")).toBe("Acme Capital");
    expect(companyFromText("Il ruolo. Fondo Alfa è una società di gestione del risparmio.")).toBe("Fondo Alfa");
    expect(companyFromText("About Us\nWe are hiring. Join our team in Milan.")).toBeNull();
    expect(companyFromText("Il nostro cliente è una società leader. Primaria banca italiana, leader nel settore.")).toBeNull();
  });
  it("the catalog company named most, never a client named once among many", () => {
    const known = [
      { id: 1, name: "UniCredit", aliases: [] },
      { id: 2, name: "Mediobanca", aliases: [] },
    ];
    expect(mostNamed("Lorem. In Mediobanca lavorerai con... Mediobanca offre... clienti come UniCredit", known)?.name).toBe("Mediobanca");
    expect(mostNamed("Clienti: UniCredit, Mediobanca", known)).toBeNull();
    expect(mostNamed(`${"x ".repeat(900)} il team di Mediobanca`, known)?.name).toBe("Mediobanca");
  });
  it("past the opening lines, and in the catalog's spelling", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    resetKnownCompanies();
    const long = `${"Descrizione del ruolo e delle attività quotidiane. ".repeat(30)}\nChi siamo: lavorerai nel team di UniCredit a Milano.`;
    expect(await guessCompany(db, { title: "Stage risk", url: null, description: long })).toBe("UniCredit");
    expect(await guessCompany(db, { title: "Summer Analyst at JPMorgan Chase", url: null, description: "" })).toBe("J.P. Morgan");
    const r = await upsertRawJob(db, { source: "w1", url: "https://annunci.example/jp/1", title: "Operations analyst", company: "JPMorgan", location: "Milano", description: "Team operations.", thin: false }, NOW);
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, r.jobId) }))?.company).toBe("J.P. Morgan");
  });
});
