// Import every ESCO occupation (about 3,000) in Italian, English, German and French as positions
// (ADR 0020). Download "ESCO dataset - CSV" for each of the four languages from
// https://esco.ec.europa.eu/en/use-esco/download (free, EU open data), put the four
// occupations_<lang>.csv files in one folder, then:
//   npx tsx scripts/import-esco.ts --dir ./esco
// Writes data/world/positions-esco.json, which the questionnaire and the searches use next to the
// hand-made list (src/lib/catalog/positions.ts). Attribution: "ESCO, European Commission".
import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "../src/lib/core/timeline";

const i = process.argv.indexOf("--dir");
const dir = i >= 0 ? process.argv[i + 1] : "";
const LANGS = ["it", "en", "de", "fr"] as const;
const files = LANGS.map((l) => path.join(dir, `occupations_${l}.csv`));
if (!dir || files.some((f) => !fs.existsSync(f))) {
  console.error("Usage: --dir <folder with occupations_it.csv, occupations_en.csv, occupations_de.csv, occupations_fr.csv>");
  process.exit(1);
}
const byUri = new Map<string, { labels: Record<string, string>; alt: string[]; isco: string }>();
for (const [k, lang] of LANGS.entries()) {
  for (const r of parseCsv(fs.readFileSync(files[k], "utf8"))) {
    const uri = r.conceptUri;
    if (!uri || !r.preferredLabel || (r.status && r.status !== "released")) continue;
    const e = byUri.get(uri) ?? { labels: {}, alt: [], isco: r.iscoGroup ?? "" };
    e.labels[lang] = r.preferredLabel.trim();
    if (lang === "it") e.alt = (r.altLabels ?? "").split(/\n/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
    byUri.set(uri, e);
  }
}
const rows = [...byUri.values()].filter((e) => LANGS.every((l) => e.labels[l])).map((e) => [e.labels.it, e.labels.en, e.labels.de, e.labels.fr, e.isco, e.alt]);
const out = path.join(process.cwd(), "data/world/positions-esco.json");
fs.writeFileSync(out, JSON.stringify(rows));
console.log(`${rows.length} occupations in four languages written to ${path.relative(process.cwd(), out)}.`);
