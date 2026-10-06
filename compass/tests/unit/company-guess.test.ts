// Offers that did not name the company: from the title, the link, or the catalog names in the text.
import { describe, expect, it, vi } from "vitest";
import { companyFromTitle, companyFromUrl, firstKnownName } from "@/lib/core/company-names";
import { ensureCatalog } from "@/lib/server/catalog";
import { resetKnownCompanies } from "@/lib/server/company-guess";
import { upsertRawJob } from "@/lib/server/jobs";
import { schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");

describe("the company of an offer", () => {
  it("from a link, a title, or the first catalog name in the text", () => {
    expect(companyFromUrl("https://www.linkedin.com/jobs/view/analyst-at-intesa-sanpaolo-4012345678")).toBe("Intesa Sanpaolo");
    expect(companyFromUrl("https://www.example.com/company/banca-esempio/jobs")).toBe("Banca Esempio");
    expect(companyFromUrl("https://it.indeed.com/viewjob?jk=abc")).toBeNull();
    expect(companyFromTitle("Summer Analyst at Goldman Sachs - London")).toBe("Goldman Sachs");
    expect(companyFromTitle("Stage presso Banca Esempio (Milano)")).toBe("Banca Esempio");
    expect(companyFromTitle("Rossi Srl cerca impiegata amministrativa")).toBe("Rossi Srl");
    expect(companyFromTitle("Impiegata amministrativa part-time")).toBeNull();
    const known = [
      { id: 1, name: "UniCredit", aliases: [] },
      { id: 2, name: "Banco BPM SpA", aliases: [] },
      { id: 3, name: "BPM", aliases: [] },
    ];
    expect(firstKnownName("Per il gruppo Banco BPM cerchiamo... anche UniCredit", known)?.name).toBe("Banco BPM SpA");
    expect(firstKnownName("Nessuna banca qui", known)).toBeNull();
  });

  it("saved offers get it from the catalog's spelling", async () => {
    const db = await freshDb();
    await ensureCatalog(db);
    resetKnownCompanies();
    const r = await upsertRawJob(db, { source: "w1", url: "https://www.linkedin.com/jobs/view/analista-junior-at-intesa-sanpaolo-4099999999", title: "Analista junior", company: null, location: "Milano", description: "Ruolo nel team crediti.", thin: true }, NOW);
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, r.jobId) }))?.company).toBe("Intesa Sanpaolo");
    const t = await upsertRawJob(db, { source: "w1", url: "https://annunci.example/x/2", title: "Stage risk management", company: null, location: "Milano", description: "UniCredit offre uno stage di sei mesi nel risk management.", thin: true }, NOW);
    expect((await db.query.jobs.findFirst({ where: eq(schema.jobs.id, t.jobId) }))?.company).toBe("UniCredit");
  });
});
