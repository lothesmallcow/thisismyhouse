// Typed searches, as people write them: the right offers, in the right order.
import { describe, expect, it, vi } from "vitest";
import { upsertRawJob } from "@/lib/server/jobs";
import { runSearch, jobsByIds } from "@/lib/server/search";
import { matchExpression } from "@/lib/server/search-index";
import { parseQuery } from "@/lib/core/query";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-07T09:00:00Z");
const ad = (title: string, company: string, location: string, description: string, url: string) => ({ source: "w1" as const, url, title, company, location, description: description.padEnd(160, " "), postedAt: NOW });

async function setup() {
  const db = await freshDb();
  const { L } = await seedPeople(db, NOW, { onboarded: true });
  const ids: Record<string, number> = {};
  const put = async (k: string, ...a: Parameters<typeof ad>) => (ids[k] = (await upsertRawJob(db, ad(...a), NOW)).jobId);
  await put("smMilano", "Sales Manager Moda", "Maison Rossi", "Milano", "Guiderai le vendite della nostra boutique di moda. Esperienza di almeno 5 anni.", "https://x.example/1");
  await put("smTorino", "Sales Manager", "Acciaierie Nord", "Torino", "Vendite di acciaio nel nord Italia. Part-time non previsto.", "https://x.example/2");
  await put("dirVendite", "Direttore delle vendite", "Lusso SpA", "Milano", "Brand di lusso cerca direttore delle vendite.", "https://x.example/3");
  await put("assistant", "Sales Assistant", "Maison Rossi", "Milano", "Riporterai al sales manager del negozio di moda.", "https://x.example/4");
  await put("contabile", "Impiegata contabile part-time", "Studio Bianchi", "Bergamo", "Contabilità generale, anche senza esperienza. Part-time 20 ore.", "https://x.example/5");
  await put("contabileAg", "Contabile", "Randstad Italia", "Bergamo", "Per importante azienda cliente cerchiamo un contabile. Turni.", "https://x.example/6");
  await put("senior", "Senior Accountant", "Big Four", "Bergamo", "Almeno 8 anni di esperienza in contabilità.", "https://x.example/7");
  return { db, L, ids };
}
const titles = async (db: Awaited<ReturnType<typeof setup>>["db"], L: number, ids: number[]) => (await jobsByIds(db, L, ids)).map((j) => j.title);

describe("typed searches", () => {
  it("a role finds its other names, in the title; a word inside another ad's text comes last or not at all", async () => {
    const { db, L, ids } = await setup();
    const r = await runSearch(db, L, "sales manager", {}, 20, NOW);
    expect(r.mode).toBe("tutte");
    expect(r.ids).toContain(ids.smMilano);
    expect(r.ids).toContain(ids.smTorino);
    expect(r.ids).toContain(ids.dirVendite); // "direttore delle vendite" is the same job (ESCO)
    expect(r.ids).not.toContain(ids.assistant); // mentions "sales manager" only in its text
  });
  it("role + sector word + place: only the fashion one in Milan", async () => {
    const { db, L, ids } = await setup();
    const r = await runSearch(db, L, "sales manager moda Milano", {}, 20, NOW);
    expect(r.ids[0]).toBe(ids.smMilano);
    expect(r.ids).not.toContain(ids.smTorino);
    expect(r.parsed.places.map((p) => p.place.name)).toEqual(["Milano"]);
  });
  it("no experience, without agencies, excluded words", async () => {
    const { db, L, ids } = await setup();
    const r = await runSearch(db, L, "contabile senza esperienza Bergamo -turni", {}, 20, NOW);
    expect(await titles(db, L, r.ids)).toEqual(["Impiegata contabile part-time"]);
    expect(r.ids).not.toContain(ids.senior);
    const noAgency = await runSearch(db, L, "contabile Bergamo senza agenzie", {}, 20, NOW);
    expect(noAgency.ids).not.toContain(ids.contabileAg);
    expect(noAgency.ids).toContain(ids.contabile);
  });
  it("only filters: part-time", async () => {
    const { db, L, ids } = await setup();
    const r = await runSearch(db, L, "part-time", {}, 20, NOW);
    expect(r.ids).toContain(ids.contabile);
  });
  it("nothing with every word: the closest ones, said so", async () => {
    const { db, L } = await setup();
    const r = await runSearch(db, L, "contabile astronauta", {}, 20, NOW);
    expect(r.mode).toBe("alcune");
    expect(r.total).toBeGreaterThan(0);
  });
  it("the FTS query", () => {
    expect(matchExpression(parseQuery("contabile -agenzia"))).toMatch(/^\{title company\} : \(.*"contabil"\*.*\) NOT \("agenzi"\*\)$/);
  });
});
