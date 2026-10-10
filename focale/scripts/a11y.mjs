// axe-core scan (WCAG 2.0/2.1/2.2 A and AA) of every built page at 390 and 1440 px.
// Needs `npm run preview` running. Exits with an error on serious or critical violations.
import { launch } from "./browser.mjs";
import AxeBuilder from "@axe-core/playwright";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const base = process.env.BASE ?? "http://localhost:4321";
const dist = new URL("../dist", import.meta.url).pathname;
function pages(dir = dist, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (n === "index.html") out.push("/" + relative(dist, p).replace(/index\.html$/, ""));
  }
  return out.sort();
}
const browser = await launch();
const lines = [];
let serious = 0;
for (const path of pages()) {
  for (const w of [390, 1440]) {
    for (const motion of ["no-preference", "reduce"]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: motion });
      const page = await ctx.newPage();
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      for (const v of res.violations) {
        if (v.impact === "serious" || v.impact === "critical") serious++;
        lines.push(`${path} @${w} ${motion}: [${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.slice(0, 4).map((n) => n.target.join(" ")).join("\n    ")}`);
      }
      await ctx.close();
    }
  }
  console.log("scanned", path);
}
await browser.close();
const report = lines.length ? lines.join("\n") : "No violations.";
writeFileSync(new URL("../docs/a11y.md", import.meta.url), `# Accessibility scan (axe-core)\n\nWCAG 2.x A/AA rules, every page at 390 and 1440 px, with and without reduced motion.\n\n\`\`\`\n${report}\n\`\`\`\n`);
console.log(report);
if (serious) process.exit(1);
