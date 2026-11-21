/**
 * End-to-end run of the real pipeline (safeFetch over HTTP, redirects, size cap, page reading,
 * Lighthouse, scoring for every sector) on a site served locally under its public address.
 * The SSRF guard refuses localhost on purpose, so the resolver answers with a public IP and the
 * fetch is routed to the local server: everything after DNS is the real code path.
 *   npx tsx scripts/scorer/e2e-local.ts http://localhost:4400 https://studio-starter.lorenzovacchino.workers.dev/ [settore]
 */
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { existsSync } from "node:fs";
import { analyze } from "../../src/scorer/analyze";
import type { SectorId } from "../../src/scorer/types";

const [local, publicUrl, sector] = process.argv.slice(2);
const pub = new URL(publicUrl);
const toLocal = (u: string) => {
  const x = new URL(u);
  return x.hostname === pub.hostname ? local.replace(/\/$/, "") + x.pathname + x.search : u;
};
const fetchImpl = ((u: string | URL | Request, init?: RequestInit) => fetch(toLocal(String(u)), init)) as typeof fetch;
const chromePath = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium"].find((p) => p && existsSync(p));
const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox"] });
try {
  const full = await analyze(publicUrl, {
    resolve: async () => ["93.184.216.34"],
    fetchImpl,
    sector: sector as SectorId | undefined,
    psi: async (finalUrl) => ({ lighthouseResult: (await lighthouse(toLocal(finalUrl), { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"] }))!.lhr as never }),
  });
  const { report: r, recommendation } = full.results[full.chosen];
  console.log(`${r.url}\nriconosciuto: ${full.guessed}  usato: ${full.chosen}  totale: ${r.total}${r.partial ? " (parziale)" : ""}  velocità: ${r.perfSource}`);
  for (const c of r.categories) console.log(`  ${c.label.padEnd(28)} ${c.earned}/${c.max}`);
  for (const c of r.checks.filter((x) => x.earned < x.max)) console.log(`  -${Math.round((c.max - c.earned) * 10) / 10}  ${c.id}: ${c.found}`);
  for (const f of r.flags) console.log(`  [${f.status}] ${f.title}: ${f.found}`);
  console.log(`  pacchetto: ${recommendation.packageId}. ${recommendation.reason}`);
  console.log(`  altri settori: ${Object.entries(full.results).map(([k, v]) => `${k} ${v.report.total}`).join(", ")}`);
} finally {
  await chrome.kill();
}
