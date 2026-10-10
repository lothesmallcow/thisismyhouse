// Lists every "[DA COMPILARE: ...]" placeholder left in src/ and dist/.
// --strict: exit with an error if any placeholder remains anywhere (used by `npm run predeploy`).
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const strict = process.argv.includes("--strict");
const RE = /\[DA COMPILARE[^\]]*\]/g;
const TEXT = /\.(astro|ts|mjs|js|yaml|yml|md|json|html|css|xml|txt)$/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (TEXT.test(name)) out.push(p);
  }
  return out;
}

let total = 0;
const outsideConfig = [];
for (const base of ["src", "dist"]) {
  const hits = new Map();
  for (const file of walk(join(root, base))) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(RE)) {
        const rel = relative(root, file);
        const key = `${rel}:${i + 1}`;
        if (!hits.has(key)) hits.set(key, new Set());
        hits.get(key).add(m[0]);
        total++;
        if (base === "src" && rel !== "src/config/site.ts" && !rel.startsWith("src/scripts/")) outsideConfig.push(`${key}  ${m[0]}`);
      }
    });
  }
  console.log(`\n${base}/: ${hits.size} line(s) with placeholders`);
  if (base === "src") for (const [k, v] of hits) console.log(`  ${k}  ${[...v].join("  ")}`);
  else if (hits.size) {
    const unique = new Set([...hits.values()].flatMap((s) => [...s]));
    for (const u of unique) console.log(`  ${u}`);
    console.log(`  (across ${new Set([...hits.keys()].map((k) => k.split(":")[0])).size} built files)`);
  }
}
if (outsideConfig.length) {
  console.log("\nPlaceholders outside src/config/site.ts (should not happen):");
  outsideConfig.forEach((l) => console.log("  " + l));
}
if (strict && total > 0) {
  console.error(`\n${total} placeholder(s) left. Fill src/config/site.ts before deploying.`);
  process.exit(1);
}
console.log(total ? `\n${total} placeholder occurrence(s) in total.` : "\nNo placeholders left.");
