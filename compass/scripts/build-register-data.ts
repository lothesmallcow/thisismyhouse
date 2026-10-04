// Turns the official register files into compact data shipped with Compass (ADR 0020), so every
// database (demo, Turso) gets them without downloading gigabytes. Kept: live companies that are
// real employers. UK: Companies House, small/medium/large accounts (roughly 10+ employees), with
// a real activity. IT/DE/FR/GB: GLEIF, every active company with an LEI (no funds, no branches).
// Usage: npx tsx scripts/build-register-data.ts --ch BasicCompanyDataAsOneFile.zip --gleif lei2.zip
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import zlib from "node:zlib";
import { gleifXmlRecords, readerFor, type RegisterRecord } from "../src/lib/catalog/registers";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const OUT = path.join(process.cwd(), "data/world/registers");
fs.mkdirSync(OUT, { recursive: true });
const unzip = (file: string) => spawn("unzip", ["-p", file], { stdio: ["ignore", "pipe", "inherit"] }).stdout;
type Row = [string, string, string, string, number];
const rows: Record<string, Map<string, Row>> = { IT: new Map(), GB: new Map(), DE: new Map(), FR: new Map() };
const key = (r: RegisterRecord) => r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
const add = (r: RegisterRecord) => {
  const m = rows[r.country];
  const k = key(r);
  const prev = m.get(k);
  // Same name twice (UK register and GLEIF): keep the one with an activity code and a size.
  if (!prev || (!prev[3] && r.nace) || (prev[4] < (r.employees ?? -1))) m.set(k, [r.name, r.id, r.city ?? "", r.nace ?? prev?.[3] ?? "", r.employees ?? prev?.[4] ?? -1]);
};

const ch = arg("ch");
if (ch) {
  const reader = readerFor("companies-house");
  let first = true;
  let n = 0;
  for await (const line of readline.createInterface({ input: unzip(ch), crlfDelay: Infinity })) {
    if (first) {
      reader.header(line);
      first = false;
      continue;
    }
    const r = reader.row(line);
    if (r && (r.employees ?? 0) >= 10) add(r);
    if (++n % 1_000_000 === 0) console.log(`UK register: ${n} lines read, ${rows.GB.size} kept`);
  }
}
const gleif = arg("gleif");
if (gleif) {
  let n = 0;
  for await (const r of gleifXmlRecords(unzip(gleif).setEncoding("utf8"))) {
    add(r);
    if (++n % 100_000 === 0) console.log(`GLEIF: ${n} companies of the four countries read`);
  }
}
for (const [cc, m] of Object.entries(rows)) {
  if (!m.size) continue;
  const list = [...m.values()].sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0]));
  fs.writeFileSync(path.join(OUT, `${cc.toLowerCase()}.json.gz`), zlib.gzipSync(JSON.stringify(list), { level: 9 }));
  console.log(`${cc}: ${list.length} companies`);
}
