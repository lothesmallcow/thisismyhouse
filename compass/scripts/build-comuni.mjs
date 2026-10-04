// Builds data/comuni.json (compact: [name, provinceCode, lat, lng]) from two CSVs of the
// opendatasicilia/comuni-italiani project (ISTAT names + town-hall coordinates, WGS84).
// Usage: node scripts/build-comuni.mjs path/to/comuni.csv path/to/coordinate.csv
// Source: https://github.com/opendatasicilia/comuni-italiani (see docs/adr/0007-offline-geodata.md)
import fs from "node:fs";

const [comuniPath, coordPath] = process.argv.slice(2);
if (!comuniPath || !coordPath) {
  console.error("usage: node scripts/build-comuni.mjs comuni.csv coordinate.csv");
  process.exit(1);
}
const rows = (p) => fs.readFileSync(p, "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(","));
const coords = new Map(rows(coordPath).map(([code, lat, lng]) => [String(Number(code)), [Number(lat), Number(lng)]]));
const out = [];
for (const [name, code, , sigla] of rows(comuniPath)) {
  const c = coords.get(String(Number(code)));
  if (!c || !Number.isFinite(c[0])) continue;
  out.push([name, sigla, Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5]);
}
fs.writeFileSync("data/comuni.json", JSON.stringify(out));
console.log(`wrote ${out.length} comuni to data/comuni.json`);
