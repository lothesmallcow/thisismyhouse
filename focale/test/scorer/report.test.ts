import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rubric, fromParts, fromPartsAll, assertReadable } from "../../src/scorer/analyze";
import { guessSector, resolveRubric } from "../../src/scorer/sectors";
import { readPage } from "../../src/scorer/page";
import { CHECKS } from "../../src/scorer/checks";
import offer from "../../src/scorer/offer.json";
import { perfCacheable, perfFrom } from "../../src/scorer/perf";

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const goodPsi = {
  lighthouseResult: {
    lighthouseVersion: "13.0.0",
    audits: {
      "largest-contentful-paint": { numericValue: 1800 },
      "total-blocking-time": { numericValue: 80 },
      "cumulative-layout-shift": { numericValue: 0.01 },
      "total-byte-weight": { numericValue: 900_000 },
    },
    categories: { accessibility: { score: 0.97 } },
  },
};

describe("rubric file", () => {
  it("is versioned and every sector profile totals exactly 100, with an Altro fallback", () => {
    expect(rubric.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(rubric.sectors.map((s) => s.id)).toContain("altro");
    for (const s of rubric.sectors) {
      const r = resolveRubric(rubric, s.id);
      expect(r.checks.reduce((t, c) => t + c.points, 0), s.id).toBe(100);
      expect(r.categories.reduce((t, c) => t + c.weight, 0), s.id).toBe(100);
      for (const id of Object.keys(s.points)) expect(rubric.checks.some((c) => c.id === id), `${s.id} ${id}`).toBe(true);
      for (const id of Object.keys(s.texts)) expect(rubric.checks.some((c) => c.id === id), `${s.id} text ${id}`).toBe(true);
      for (const [k, v] of Object.entries(s.vocab)) if (typeof v === "string" && v) expect(() => new RegExp(v, "iu"), `${s.id} ${k}`).not.toThrow();
    }
  });
  it("flags never carry points", () => {
    for (const s of rubric.sectors) for (const c of resolveRubric(rubric, s.id).checks) if (c.flag) expect(c.points, `${s.id} ${c.id}`).toBe(0);
  });
  it("every check has code, a plain sentence and a fix, and ids are unique", () => {
    const ids = rubric.checks.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of rubric.checks) {
      expect(CHECKS[c.id], c.id).toBeTypeOf("function");
      expect(c.why.length, c.id).toBeGreaterThan(20);
      expect(c.fix.length, c.id).toBeGreaterThan(15);
      expect(c.why + c.fix + c.title, c.id).not.toMatch(/[—–]/);
    }
    for (const s of rubric.sectors) for (const t of Object.values(s.texts)) expect(JSON.stringify(t)).not.toMatch(/[—–]/);
    expect(Object.keys(CHECKS).sort()).toEqual([...ids].sort());
  });
});

describe("report", () => {
  it("is deterministic: same page and data, same report", () => {
    const a = fromParts("https://n.example.it/", fixture("new-studio.html"), goodPsi, { measuredAt: "2026-11-21T10:00:00Z" });
    const b = fromParts("https://n.example.it/", fixture("new-studio.html"), goodPsi, { measuredAt: "2026-11-21T10:00:00Z" });
    expect(a).toEqual(b);
  });
  it("a good studio page scores high, a typical old one low, with fixes ranked by points", () => {
    const good = fromParts("https://n.example.it/", fixture("new-studio.html"), goodPsi);
    const bad = fromParts("http://o.example.it/", fixture("old-studio.html"), goodPsi);
    expect(good.report.total).toBeGreaterThanOrEqual(90);
    expect(bad.report.total).toBeLessThan(45);
    const gains = bad.report.fixes.map((f) => f.gain);
    expect(gains).toEqual([...gains].sort((x, y) => y - x));
    expect(bad.report.fixes).toHaveLength(5);
    expect(bad.report.fixes[0].id).toBe("conv.primary");
    expect(good.guessed).toBe("fitness");
  });
  it("without speed data the report says it is partial and scales the measured points", () => {
    const r = fromParts("https://n.example.it/", fixture("new-studio.html"), null).report;
    expect(r.partial).toBe(true);
    expect(r.perfSource).toBe("none");
    expect(r.checks.filter((c) => c.status === "unmeasured").map((c) => c.id)).toEqual(["speed.lcp", "speed.interaction", "speed.cls", "speed.weight", "a11y.lighthouse"]);
    expect(r.total).toBeLessThanOrEqual(100);
  });
  it("prefers real-user data and says so", () => {
    const r = fromParts("https://n.example.it/", fixture("new-studio.html"), {
      ...goodPsi,
      loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 5200 }, INTERACTION_TO_NEXT_PAINT: { percentile: 120 }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 3 } } },
    }).report;
    expect(r.perfSource).toBe("field");
    expect(r.checks.find((c) => c.id === "speed.lcp")?.status).toBe("fail");
  });
});

describe("fairness", () => {
  it("an empty JavaScript shell is not scored", () => {
    expect(() => assertReadable(readPage('<html><body><div id="root"></div><script src="/app.js"></script></body></html>', "https://a.it/"))).toThrow(/JavaScript/);
    expect(() => assertReadable(readPage(fixture("old-studio.html"), "https://a.it/"))).not.toThrow();
  });
});

describe("speed cache", () => {
  it("keeps only the numbers, and they give the same speed data", () => {
    const full = { ...goodPsi, lighthouseResult: { ...goodPsi.lighthouseResult, finalUrl: "x", audits: { ...goodPsi.lighthouseResult.audits, "screenshot-thumbnails": { details: { items: ["big"] } } } } };
    const small = perfCacheable(full as never);
    expect(JSON.stringify(small)).not.toContain("screenshot");
    expect(perfFrom(small)).toEqual(perfFrom(full as never));
  });
});

describe("sectors", () => {
  it("guesses the sector from the page's own words and schema, Altro when nothing matches", () => {
    const g = (h: string) => guessSector(rubric, readPage(h, "https://a.it/"));
    expect(g("<title>Trattoria da Mario, Milano</title><h1>Cucina milanese</h1>")).toBe("ristorazione");
    expect(g("<title>Agriturismo Il Poggio</title><h1>Camere e cucina in Oltrepò</h1>")).toBe("ospitalita");
    expect(g('<script type="application/ld+json">{"@type":"Dentist"}</script><h1>Studio Rossi</h1>')).toBe("salute");
    expect(g("<title>Ristrutturazioni Milano | Edil Bianchi</title>")).toBe("edilizia");
    expect(g("<title>Mario Rossi</title><h1>Riparo biciclette</h1>")).toBe("altro");
    expect(g("<title>Casa Lia</title><h1>Camera matrimoniale con bagni privati e giardino</h1><p>Bed and breakfast</p>")).toBe("ospitalita");
    expect(g("<title>Hotel Riva con spa sul lago</title><h1>Hotel con spa</h1>")).toBe("ospitalita");
    expect(g("<title>Trilocale in vendita, Milano</title><h1>Agenzia immobiliare: soggiorno, cucina, due bagni</h1>")).toBe("immobiliare");
  });
  it("scores every sector at once and keeps the visitor's choice", () => {
    const all = fromPartsAll("https://n.example.it/", fixture("new-studio.html"), goodPsi, { sector: "altro" });
    expect(all.chosen).toBe("altro");
    expect(all.guessed).toBe("fitness");
    expect(Object.keys(all.results)).toHaveLength(rubric.sectors.length);
    expect(all.results.fitness.report.total).toBeGreaterThanOrEqual(90);
  });
});

describe("recommendation", () => {
  it("names a package from the brief and gives a reason", () => {
    const bad = fromParts("http://o.example.it/", fixture("old-studio.html"), goodPsi);
    expect(bad.recommendation.packageId).toBe("completo");
    expect(bad.recommendation.reason).toMatch(/Mancano \d+ punti/);
    const good = fromParts("https://n.example.it/", fixture("new-studio.html"), goodPsi);
    expect(good.recommendation.packageId).toBe("essenziale");
  });
  it("prices are exactly the brief's: 600, 900, 1.200 and 39 a month", () => {
    expect(offer.packages.map((p) => p.price)).toEqual([600, 900, 1200]);
    expect(offer.care.pricePerMonth).toBe(39);
  });
});
