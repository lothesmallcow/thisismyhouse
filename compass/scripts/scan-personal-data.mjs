// Personal-data scanner for committed files (runs in pre-commit and CI).
// Flags: Italian tax codes, IBANs, real-looking phone numbers, e-mail addresses on real
// domains, and common API-key shapes. Fake data must use ".example" domains.
import { execSync } from "node:child_process";
import fs from "node:fs";

const SAFE_DOMAINS = /(^|\.)example(\.(com|it|org))?$|^linkedin\.com$|^indeed\.com$|^infojobs\.(it|net)$|^users\.noreply\.github\.com$|^anthropic\.com$/i;
const SAFE_EMAILS = new Set(["lothesmallcow@users.noreply.github.com"]);
const RULES = [
  ["codice fiscale", /\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/g],
  ["IBAN", /\bIT\d{2}[A-Z]\d{10}[0-9A-Z]{12}\b/g],
  ["mobile phone", /(?<![\d./=-])(?:\+39[\s.]?)?3[1-9]\d[\s.]?\d{3}[\s.]?\d{3,4}(?![\d.])/g],
  ["API key", /\b(sk-[A-Za-z0-9_-]{20,}|tvly-[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,})\b/g],
];
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !/(^|\/)(package-lock\.json|.*\.(png|jpg|ico|pdf|woff2?))$|^data\/comuni\.json$|^drizzle\/meta\//.test(f))
  .filter((f) => fs.existsSync(f));

const findings = [];
for (const f of files) {
  const buf = fs.readFileSync(f);
  if (buf.includes(0)) continue; // binary file
  const text = buf.toString("utf8");
  for (const [name, re] of RULES) {
    for (const m of text.matchAll(re)) {
      if (name === "mobile phone" && /333[\s.]?000[\s.]?0000/.test(m[0])) continue; // documented fake number
      findings.push(`${f}: ${name} "${m[0]}"`);
    }
  }
  for (const m of text.matchAll(EMAIL)) {
    const [addr, domain] = [m[0].toLowerCase(), m[1].toLowerCase()];
    if (SAFE_EMAILS.has(addr) || SAFE_DOMAINS.test(domain)) continue;
    if (/esempio|example|demo|finto|fake|nome\.cognome/.test(addr)) continue; // clearly fake local part
    if (/\.(png|jpg|svg|webp)$/.test(domain)) continue; // e.g. logo@2x.png
    findings.push(`${f}: e-mail on a real domain "${addr}"`);
  }
}

if (findings.length) {
  console.error("Possible personal data found. Use fake .example data instead:\n" + findings.map((x) => "  - " + x).join("\n"));
  process.exit(1);
}
console.log(`Personal-data scan: ${files.length} files clean.`);
