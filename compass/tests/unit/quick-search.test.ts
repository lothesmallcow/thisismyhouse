// The first search right after the questionnaire: job boards found on their own (only when the
// published name matches), read at once, and not repeated within 10 minutes.
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { schema } from "@/lib/db";
import { runQuickSearch } from "@/lib/pipeline/quick-search";
import { discoverAts, sameCompany, slugCandidates } from "@/lib/sources/ats/discover";
import type { FetchLike } from "@/lib/sources/http";
import { ensureCatalog, setPref } from "@/lib/server/catalog";
import { updateProfile } from "@/lib/server/profile";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
/** A fake internet: one company on Greenhouse, one slug taken by somebody else on Workable. */
function fakeNet(calls: string[]): FetchLike {
  return async (url) => {
    calls.push(url);
    if (url === "https://boards-api.greenhouse.io/v1/boards/acmeesempio") return json({ name: "Acme Esempio" });
    if (url.startsWith("https://boards-api.greenhouse.io/v1/boards/acmeesempio/jobs")) {
      return json({ jobs: [{ id: 1, title: "Stage corporate finance", absolute_url: "https://boards.greenhouse.io/acmeesempio/jobs/1", location: { name: "Milano, Italy" }, updated_at: "2026-10-03T08:00:00Z", content: "&lt;p&gt;Stage di sei mesi in finanza.&lt;/p&gt;" }] });
    }
    if (url === "https://apply.workable.com/api/v1/widget/accounts/omonima") return json({ name: "Tutt'altra Azienda Ltd" });
    return json({ error: "not found" }, 404);
  };
}

describe("finding a company's job board", () => {
  it("slugs from the name, and a board only when its published name is the company's", async () => {
    expect(slugCandidates("Bending Spoons S.p.A.")).toEqual(["bendingspoons", "bending-spoons", "bending"]);
    expect(slugCandidates("Acme Esempio")).toEqual(["acmeesempio", "acme-esempio"]);
    expect(sameCompany("Acme Esempio", "ACME ESEMPIO S.r.l.")).toBe(true);
    expect(sameCompany("Omonima", "Tutt'altra Azienda Ltd")).toBe(false);
    const calls: string[] = [];
    expect(await discoverAts(fakeNet(calls), "Acme Esempio S.p.A.")).toEqual({ ats: "greenhouse", slug: "acmeesempio" });
    expect(await discoverAts(fakeNet(calls), "Omonima")).toBeNull(); // the slug exists, but it is someone else
  });

  it("right after the questionnaire: the board is found, read, the offers ranked; not again within 10 minutes", async () => {
    const db = await freshDb();
    const NOW = new Date("2026-10-05T07:00:00Z");
    const { M } = await seedPeople(db, NOW, { student: true });
    await ensureCatalog(db);
    await updateProfile(db, M, { city: "Milano" });
    const [acme] = await db.insert(schema.catalogCompanies).values({ slug: "acme-esempio", name: "Acme Esempio", city: "Milano", country: "IT", region: "Lombardia", source: "altro", shared: true }).returning();
    await setPref(db, M, "company", acme.id, "like");
    const calls: string[] = [];
    const r = await runQuickSearch(db, M, { fetchImpl: fakeNet(calls), web: null, adzuna: null, now: NOW, politeSleep: async () => {} });
    expect(r).toMatchObject({ boardsFound: 1, feeds: 1, found: 1, created: 1 });
    expect(await db.query.catalogCompanies.findFirst({ where: eq(schema.catalogCompanies.id, acme.id) })).toMatchObject({ ats: "greenhouse", atsSlug: "acmeesempio", atsCheckedAt: NOW });
    expect((await db.select().from(schema.jobs)).some((j) => j.title === "Stage corporate finance")).toBe(true);
    const again = await runQuickSearch(db, M, { fetchImpl: fakeNet(calls), web: null, adzuna: null, now: new Date(NOW.getTime() + 5 * 60_000) });
    expect(again.skipped).toBe("recent");
  });
});
