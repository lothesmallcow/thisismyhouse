// Load companies from an official register file into the catalog (ADR 0020).
// Download the file yourself (links in docs/setup.md, all free/open data), unzip if needed, then:
//   npx tsx scripts/import-register.ts --format companies-house --file BasicCompanyDataAsOneFile.csv
//   npx tsx scripts/import-register.ts --format sirene --file StockEtablissement_utf8.csv --min-employees 10
//   npx tsx scripts/import-register.ts --format offeneregister --file de_companies_ocdata.jsonl
//   npx tsx scripts/import-register.ts --format gleif --file 20261001-gleif-concatenated-file-lei2.csv
//   npx tsx scripts/import-register.ts --format csv --file aziende-lombardia.csv   (name,country,city,industry,nace,website,employees)
// Filters (optional): --regions IT:Lombardia,GB:England  --cities Milano,London  --nace 47,14,32.1
//                     --min-employees 10  --limit 100000  --dry-run (count only)
// Files can be .gz. Rows are read one at a time: millions of lines are fine.
import "./load-env";
import fs from "node:fs";
import readline from "node:readline";
import zlib from "node:zlib";
import { readerFor, type RegisterFormat, type RegisterRecord } from "../src/lib/catalog/registers";
import { getDb } from "../src/lib/db";
import { ensureCatalog, ensureDirectory, importRegister } from "../src/lib/server/catalog";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const list = (name: string) => opt(name)?.split(",").map((x) => x.trim()).filter(Boolean);
const format = opt("format") as RegisterFormat | undefined;
const file = opt("file");
const formats: RegisterFormat[] = ["companies-house", "sirene", "offeneregister", "gleif", "csv"];
if (!format || !formats.includes(format) || !file || !fs.existsSync(file)) {
  console.error(`Usage: --format ${formats.join("|")} --file <path> [--regions ..] [--cities ..] [--nace ..] [--min-employees N] [--limit N] [--dry-run]`);
  process.exit(1);
}

async function* records(): AsyncIterable<RegisterRecord> {
  const raw = fs.createReadStream(file!);
  const input = file!.endsWith(".gz") ? raw.pipe(zlib.createGunzip()) : raw;
  const reader = readerFor(format!);
  let first = true;
  for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
    if (first) {
      reader.header(line);
      first = false;
      if (format !== "offeneregister") continue;
    }
    const r = reader.row(line);
    if (r) yield r;
  }
}

const filters = { regions: list("regions"), cities: list("cities"), nace: list("nace"), minEmployees: Number(opt("min-employees")) || undefined, limit: Number(opt("limit")) || undefined };
if (args.includes("--dry-run")) {
  let n = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _r of records()) n++;
  console.log(`${n} active companies readable in the file (before filters). Nothing written.`);
} else {
  const db = getDb();
  await ensureCatalog(db);
  await ensureDirectory(db);
  const t = Date.now();
  const r = await importRegister(db, records(), filters);
  console.log(`Added ${r.added} companies (${r.skipped} skipped by filters, duplicates or already in the catalog) in ${Math.round((Date.now() - t) / 1000)} s.`);
}
