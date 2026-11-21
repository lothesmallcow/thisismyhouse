/**
 * One site from the terminal:  npm run scorer -- studio.it [--settore fitness] [--json]
 * Same engine, same SSRF guard and same rubric as the page. Speed: PageSpeed Insights if PSI_KEY
 * is set, otherwise Lighthouse on this computer.
 * The result prints here and is not saved anywhere.
 */
import { analyze, rubric } from "../../src/scorer/analyze";
import type { SectorId } from "../../src/scorer/types";
import { closeSpeed, nodeResolver, speed } from "./node-deps";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--settore");
const sector = (args[args.indexOf("--settore") + 1] || undefined) as SectorId | undefined;
if (!url) {
  console.log(`Uso: npm run scorer -- <indirizzo> [--settore ${rubric.sectors.map((s) => s.id).join("|")}] [--json]`);
  process.exit(1);
}
const full = await analyze(url, { resolve: nodeResolver, psi: speed, sector: args.includes("--settore") ? sector : undefined }).catch(async (e: Error) => {
  console.log(`Non analizzato: ${e.message}`);
  await closeSpeed();
  process.exit(2);
});
const { report, recommendation } = full.results[full.chosen];
if (args.includes("--json")) {
  console.log(JSON.stringify(full.results[full.chosen], null, 2));
} else {
  console.log(`\n${report.url}\nSettore: ${report.sectorLabel}${full.guessed === full.chosen ? " (riconosciuto dalla pagina)" : ""}`);
  console.log(`Punteggio: ${report.total}/100${report.partial ? " (parziale: velocità non misurata)" : ""}  velocità: ${report.perfSource}`);
  for (const c of report.categories) console.log(`  ${c.label.padEnd(28)} ${String(c.earned).padStart(5)} / ${c.max}`);
  console.log("\nLe 5 cose che valgono più punti:");
  for (const f of report.fixes) console.log(`  +${f.gain}  ${f.title}: ${f.found}`);
  console.log("\nDa verificare:");
  for (const f of report.flags) console.log(`  ${f.status === "flag-warn" ? "!" : "ok"}  ${f.title}: ${f.found}`);
  console.log(`\nPacchetto: ${recommendation.packageId}. ${recommendation.reason}\n`);
}

await closeSpeed();
