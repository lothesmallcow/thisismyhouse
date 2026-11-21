/**
 * Analyses a list of real sites (full engine, speed from PSI_KEY or local Lighthouse) and writes the
 * full results to prospects/real-preview.json for the PRIVATE test page (scripts/scorer/stage-preview.py
 * injects it as #sc-real). prospects/ is git-ignored: other businesses' results are never committed.
 *   NODE_USE_ENV_PROXY=1 SCORER_VIA_PROXY=1 npx tsx scripts/scorer/real-preview.ts prospects/studi-milano.txt casaturati3.com
 */
import { readFileSync, writeFileSync } from "node:fs";
import { analyze, type FullAnalysis } from "../../src/scorer/analyze";
import type { SectorId } from "../../src/scorer/types";
import { closeSpeed, dnsAtProxy, nodeResolver, speed } from "./node-deps";

const lines = process.argv.slice(2).flatMap((a) => (a.endsWith(".txt") ? readFileSync(a, "utf8").split("\n") : [a])).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const out: FullAnalysis[] = [];
for (const line of lines) {
  const [url, sec] = line.split(",").map((x) => x.trim());
  try {
    const r = await analyze(url, { resolve: nodeResolver, psi: speed, dnsAtProxy, sector: (sec || undefined) as SectorId | undefined });
    out.push(r);
    console.log(`${r.results[r.chosen].report.total}\t${r.chosen}\t${url}`);
  } catch (e) {
    console.log(`ERR\t${url}\t${(e as Error).message}`);
  }
}
await closeSpeed();
writeFileSync("prospects/real-preview.json", JSON.stringify(out));
console.log(`prospects/real-preview.json: ${out.length} siti`);
