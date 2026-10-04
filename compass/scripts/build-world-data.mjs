// Builds the offline reference data in data/world/ from open datasets (run by hand, output committed):
//   - places.json     towns of the UK, Germany and France with region and population
//                     (GeoNames via the npm packages all-the-cities + cities.json, CC BY 4.0)
//   - nace.json       every NACE Rev. 2.1 code (sections to classes) in it/en/de/fr
//                     (Eurostat via @financica/nace-codes, MIT)
//   - companies.json  listed companies of Italy, the UK, Germany and France with industry, city, website
//                     (FinanceDatabase by J. Bouma, MIT)
// Italian towns come from data/comuni.json (ADR 0007). See docs/adr/0018-world-reference-data.md.
// Usage: node scripts/build-world-data.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const OUT = path.join(process.cwd(), "data/world");
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "compass-world-"));
console.log("installing source packages in", tmp);
execSync("npm init -y >/dev/null && npm install --silent --no-audit --no-fund @financica/nace-codes@3.1.0 cities.json@1.1.65 all-the-cities@3.1.0 pbf@3", { cwd: tmp, stdio: "inherit" });
const req = createRequire(path.join(tmp, "package.json"));
const COUNTRIES = ["GB", "DE", "FR"];

// --- Places ---------------------------------------------------------------------------------------
const admin1 = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(tmp, "node_modules/cities.json/admin1.json"), "utf8")).map((a) => [a.code, a.name]));
const all = req("all-the-cities");
const places = {};
for (const cc of COUNTRIES) {
  const rows = all.filter((c) => c.country === cc && c.population >= 2000 && /^PPL/.test(c.featureCode));
  const regions = [...new Set(rows.map((c) => admin1[`${cc}.${c.adminCode}`] || "").filter(Boolean))].sort();
  const seen = new Set();
  places[cc] = {
    regions,
    towns: rows
      .sort((a, b) => b.population - a.population)
      .filter((c) => {
        const k = `${c.name}|${c.adminCode}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((c) => [c.name, regions.indexOf(admin1[`${cc}.${c.adminCode}`] || ""), Math.round(c.loc.coordinates[1] * 1e4) / 1e4, Math.round(c.loc.coordinates[0] * 1e4) / 1e4, Math.round(c.population / 1000)]),
  };
  console.log(cc, places[cc].towns.length, "towns,", regions.length, "regions");
}
fs.writeFileSync(path.join(OUT, "places.json"), JSON.stringify(places));

// --- NACE -----------------------------------------------------------------------------------------
const naceDir = path.join(tmp, "node_modules/@financica/nace-codes/dist");
const { NACE } = await import(path.join(naceDir, "index.js"));
const langs = await Promise.all(["it", "de", "fr"].map(async (l) => (await import(path.join(naceDir, "lang", `${l}.js`))).default));
const nace = new NACE({ languages: langs });
const naceRows = [];
for (const level of [1, 2, 3, 4]) {
  for (const c of nace.getAllCodes(level)) {
    const d = c.description;
    naceRows.push([/^\d{3,}$/.test(c.code) ? `${c.code.slice(0, 2)}.${c.code.slice(2)}` : c.code, level, d.it || d.en, d.en, d.de || d.en, d.fr || d.en]);
  }
}
fs.writeFileSync(path.join(OUT, "nace.json"), JSON.stringify(naceRows)); // codes as "47.71"
console.log("NACE", naceRows.length, "codes");

// --- Listed companies -----------------------------------------------------------------------------
const bz = path.join(tmp, "equities.bz2");
execSync(`curl -sfL -o ${bz} https://raw.githubusercontent.com/JerBouma/FinanceDatabase/main/compression/equities.bz2`);
const csv = execSync(`bunzip2 -c ${bz}`, { maxBuffer: 1 << 30 }).toString("utf8");
const COUNTRY = { Italy: "IT", "United Kingdom": "GB", Germany: "DE", France: "FR" };
const CAP = { "Mega Cap": 5, "Large Cap": 4, "Mid Cap": 3, "Small Cap": 2, "Micro Cap": 1, "Nano Cap": 0 };
const header = parseCsvLine(csv.slice(0, csv.indexOf("\n")));
const col = (n) => header.indexOf(n);
const best = new Map();
for (const row of parseCsv(csv).slice(1)) {
  const cc = COUNTRY[row[col("country")]];
  if (!cc || row[col("delisted")] === "True") continue;
  const name = tidyName(row[col("name")]);
  if (!name || name.length < 2) continue;
  const key = `${cc}|${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const cand = { name, cc, city: row[col("city")] || "", sector: row[col("sector")] || "", industry: row[col("industry")] || row[col("industry_group")] || "", website: (row[col("website")] || "").replace(/^https?:\/\//, "").replace(/\/$/, ""), cap: CAP[row[col("market_cap")]] ?? -1 };
  const prev = best.get(key);
  // Keep the richest line (main listing usually has city, website and size).
  const score = (x) => (x.city ? 2 : 0) + (x.website ? 2 : 0) + (x.industry ? 1 : 0) + x.cap;
  if (!prev || score(cand) > score(prev)) best.set(key, cand);
}
// Secondary listings ("Lloyds Bkg", "Genel Energy Ls -,10") have no city and no website: drop them when the
// same country has a fuller entry starting with the same word. Unique entries without details stay.
const firstWord = (c) => `${c.cc}|${c.name.split(/[\s,]+/)[0].toLowerCase()}`;
const full = new Set([...best.values()].filter((c) => c.city || c.website).map(firstWord));
const junk = /-,|\d{2,}\s*$|rn( |$)|\bBkg\b|\b(Ls|Rg|Vz|Inh)\b/;
const companies = [...best.values()]
  .filter((c) => c.industry || c.sector)
  .filter((c) => !junk.test(c.name))
  .filter((c) => c.city || c.website || !full.has(firstWord(c)))
  .sort((a, b) => b.cap - a.cap || a.name.localeCompare(b.name));
fs.writeFileSync(path.join(OUT, "companies.json"), JSON.stringify(companies.map((c) => [c.name, c.cc, c.city, c.sector, c.industry, c.website, c.cap])));
console.log("companies", companies.length, Object.entries(Object.groupBy(companies, (c) => c.cc)).map(([k, v]) => `${k}:${v.length}`).join(" "));
fs.rmSync(tmp, { recursive: true, force: true });

/** "ENEL SPA" -> "Enel", "Rolls-Royce Holdings plc" stays readable; drops share-class noise. */
function tidyName(raw) {
  let n = raw.replace(/\s+(Inhaber[- ]Aktien|Namens[- ]Aktien|Vorzugsaktien|Act\.?|Az\.? (ord|risp)\.?|Ordinary Shares?|ADR|GDR|Reg\.?|Br\.?|O\.N\.?|EO.*|Class [A-Z]|Azioni.*|nom\.?)\b.*$/i, "").trim();
  if (n === n.toUpperCase() && /[A-Z]{4,}/.test(n)) n = n.toLowerCase().replace(/(^|[\s\-&./(])([a-zà-ü])/g, (m, p, c) => p + c.toUpperCase()).replace(/\b(Spa|Plc|Ag|Se|Sa|Nv|Gmbh|Kgaa)\b/g, (m) => m.toUpperCase().replace("SPA", "S.p.A."));
  return n.replace(/\s{2,}/g, " ").trim();
}

function parseCsvLine(line) {
  return parseCsv(line + "\n")[0];
}
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  return rows;
}
