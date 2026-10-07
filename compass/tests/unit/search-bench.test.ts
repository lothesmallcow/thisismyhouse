// The search benchmark (tests/bench/search-bench.ts): realistic ads, the searches people type, and how
// well the search does. A change that makes it worse fails here.
import { describe, expect, it, vi } from "vitest";
import { upsertRawJob } from "@/lib/server/jobs";
import { runSearch } from "@/lib/server/search";
import { seedAccounts } from "@/lib/seed";
import { BENCH_ADS, BENCH_QUERIES, scoreQuery } from "../bench/search-bench";
import { freshDb } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-07T09:00:00Z");

describe("search benchmark", () => {
  it("precision of the first 5 and recall stay high; the wrong ads stay out", async () => {
    const db = await freshDb();
    const [L] = await seedAccounts(db, { admin: { email: "a@example.com", password: "admin-password" }, people: [{ email: "u@example.com", password: "demo-password", name: "Prova", track: "lavoro", mailboxKey: null }] });
    const keyOf = new Map<number, string>();
    for (const [i, a] of BENCH_ADS.entries()) {
      const r = await upsertRawJob(db, { source: "w1", url: `https://bench.example/${i}`, title: a.title, company: a.company, location: a.location, description: a.description.padEnd(130, " "), postedAt: NOW }, NOW);
      keyOf.set(r.jobId, a.key);
    }
    const rows: { q: string; precision: number; recall: number; wrong: string[] }[] = [];
    for (const q of BENCH_QUERIES) {
      const r = await runSearch(db, L, q.q, {}, 50, NOW);
      rows.push({ q: q.q, ...scoreQuery(r.ids.map((id) => keyOf.get(id)!), q) });
    }
    const avg = (k: "precision" | "recall") => rows.reduce((a, r) => a + r[k], 0) / rows.length;
    const report = rows.map((r) => `${r.q.padEnd(45)} P@5 ${r.precision.toFixed(2)}  R ${r.recall.toFixed(2)}${r.wrong.length ? `  wrong: ${r.wrong.join(",")}` : ""}`).join("\n");
    expect(rows.flatMap((r) => r.wrong), report).toEqual([]);
    expect(avg("recall"), report).toBeGreaterThanOrEqual(0.95);
    expect(avg("precision"), report).toBeGreaterThanOrEqual(0.85);
  });
});

describe("metrics on real data", () => {
  it("coverage by source, hours to Compass, facts read (counts only)", async () => {
    const { searchMetrics } = await import("@/lib/pipeline/metrics");
    const db = await freshDb();
    await seedAccounts(db, { admin: { email: "a@example.com", password: "admin-password" }, people: [] });
    const posted = new Date(NOW.getTime() - 5 * 3_600_000);
    await upsertRawJob(db, { source: "ats:greenhouse", url: "https://boards.greenhouse.io/acme/jobs/1", title: "Contabile", company: "Acme", location: "Milano", description: "Almeno 2 anni di esperienza. Diploma. 2 giorni di smart working.".padEnd(130), postedAt: posted }, NOW);
    const m = await searchMetrics(db, NOW);
    expect(m.italyLast7Days).toEqual({ ats: 1 });
    expect(m.hoursToCompass).toEqual({ median: 5, p90: 5, sample: 1 });
    expect(m.facts).toMatchObject({ total: 1, years: 1, edu: 1, smart: 1 });
  });
});
