/**
 * Self-test: our own sites must score 90 or more on the same rubric we use on everyone else.
 * Needs a built site served locally (`npm run build && npm run preview`, or BASE=...).
 * For each target it runs local Lighthouse (mobile, simulated throttling: the same engine as
 * PageSpeed Insights) and reads the served HTML, then scores it with the Website Scorer.
 *
 * - Template demos are scored on the full rubric of their sector. Their result is the "projected
 *   score" the report shows for that sector, written to src/scorer/benchmark.json.
 * - The scorer page itself is not a local business: it is scored on the technical subset (speed,
 *   accessibility, legal, Google title and description), and the report says so.
 * Lab speed varies a little between machines; the bands are wide so this rarely changes points.
 * Exit code 1 if anything is below 90.
 */
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { existsSync, writeFileSync } from "node:fs";
import { fromParts } from "../../src/scorer/analyze";
import type { SectorId } from "../../src/scorer/types";

const base = process.env.BASE ?? "http://localhost:4321";
const live = process.env.SITE_URL ?? "https://www.focusdesign.it";
const write = !process.argv.includes("--no-write");
const chromePath = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium"].find((p) => p && existsSync(p));

const targets: { path: string; sector?: SectorId; label: string; kind: "template" | "technical" }[] = [
  { path: "/analisi-sito/esempio-fitness/", sector: "fitness", label: "Studio Linea (studio fitness dimostrativo)", kind: "template" },
  { path: "/lavori/arcadi-ristrutturazioni/demo/", sector: "edilizia", label: "Arcadi (impresa di ristrutturazioni dimostrativa)", kind: "template" },
  { path: "/lavori/villa-ortensia/demo/", sector: "eventi", label: "Villa Ortensia (location per matrimoni dimostrativa)", kind: "template" },
  { path: "/analisi-sito/", label: "La pagina dell'analisi", kind: "technical" },
];
const TECHNICAL = new Set(["speed", "a11y", "legal"]);
const TECH_IDS = new Set(["seo.title", "seo.description", "trust.https"]);

const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox"] });
const out: Record<string, unknown> = {};
let scorerPage: unknown = null;
let failed = false;
try {
  for (const t of targets) {
    const res = await fetch(base + t.path);
    if (!res.ok) {
      console.log(`SKIP ${t.path}: ${res.status}`);
      continue;
    }
    const html = await res.text();
    const lh = await lighthouse(base + t.path, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"] });
    const psi = { lighthouseResult: lh!.lhr as never };
    const a = fromParts(live + t.path, html, psi, { sector: t.sector ?? "altro" });
    let score = a.report.total;
    if (t.kind === "technical") {
      const sub = a.report.checks.filter((c) => (TECHNICAL.has(c.category) || TECH_IDS.has(c.id)) && c.status !== "flag-ok" && c.status !== "flag-warn");
      score = Math.round((sub.reduce((s, c) => s + c.earned, 0) / sub.reduce((s, c) => s + c.max, 0)) * 100);
    }
    const lost = a.report.checks.filter((c) => c.earned < c.max).map((c) => `${c.id} -${Math.round((c.max - c.earned) * 10) / 10} (${c.found})`);
    console.log(`${score >= 90 ? "OK  " : "FAIL"} ${score}  ${t.path}  [${t.kind}${t.sector ? " " + t.sector : ""}]`);
    for (const l of lost) console.log(`      ${l}`);
    if (score < 90) failed = true;
    if (t.kind === "template" && t.sector)
      out[t.sector] = {
        label: t.label,
        path: t.path,
        total: a.report.total,
        categories: a.report.categories.map((c) => ({ id: c.id, label: c.label, earned: c.earned, max: c.max })),
      };
    else scorerPage = { label: t.label, path: t.path, technicalScore: score, note: "Non è un'attività locale: misurata solo su velocità, accessibilità, basi legali e dati per Google." };
  }
} finally {
  await chrome.kill();
}
if (write) {
  const { rubric } = await import("../../src/scorer/analyze");
  writeFileSync(
    new URL("../../src/scorer/benchmark.json", import.meta.url),
    JSON.stringify({ rubricVersion: rubric.version, measuredAt: new Date().toISOString().slice(0, 10), method: "Lighthouse locale (telefono simulato) sul sito costruito, poi la stessa griglia dell'analisi", templates: out, scorerPage }, null, 2) + "\n",
  );
}
process.exit(failed ? 1 : 0);
