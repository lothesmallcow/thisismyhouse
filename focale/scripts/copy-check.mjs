// Scans the visible text, alt text and ARIA labels of the built pages for copy rule violations.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const dist = new URL("../dist", import.meta.url).pathname;
const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith(".html")) files.push(p);
  }
})(dist);

const ENGLISH = /\b(the|and|with|your|click|here|submit|read more|learn more|loading|menu toggle|close menu|open menu|skip to|contact us|privacy policy)\b/i;
const rules = [
  { name: "em or en dash", re: /[–—]/ },
  { name: "lorem", re: /lorem/i },
  { name: "TODO", re: /\bTODO\b/ },
  { name: "old name Soglia", re: /soglia/i },
  // The studio speaks as "noi" since the company redesign; claims of a big team are still out.
  { name: "team inventato", re: /\b(il nostro team|la nostra agenzia|i nostri esperti)\b/i, skipDemo: true },
  { name: "English word", re: ENGLISH, skipEnDemo: true },
];

let problems = 0;
for (const f of files) {
  const rel = "/" + relative(dist, f);
  const isDemo = rel.includes("/demo/");
  const html = readFileSync(f, "utf8");
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<template[\s\S]*?<\/template>/g, " ");
  const attrs = [...visible.matchAll(/\s(?:alt|aria-label|title|placeholder|content)="([^"]*)"/g)].map((m) => m[1]);
  const text = visible.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ");
  const chunks = [...text.split(/\s{2,}/), ...attrs].map((s) => s.trim()).filter(Boolean);
  for (const c of chunks) {
    for (const r of rules) {
      if (r.skipDemo && isDemo) continue;
      if (r.skipEnDemo && rel.includes("cascina-rovere/demo")) continue;
      if (c.includes("International Economics and Finance") && r.name === "English word") continue; // official degree name
      if (/^https?:|^width=|^\/|^[\w-]+\.(png|svg|js|css)$|^summary_large_image$|^it_IT$|^website$|^noindex/.test(c)) continue;
      if (r.re.test(c)) {
        problems++;
        console.log(`${rel}  [${r.name}]  ${c.slice(0, 140)}`);
      }
    }
  }
}
console.log(problems ? `\n${problems} issue(s).` : "Copy check: no issues.");
process.exitCode = problems ? 1 : 0;
