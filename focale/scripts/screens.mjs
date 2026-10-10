// Full-page screenshots of every built page at 390, 768 and 1440 px into docs/screens/.
// Needs `npm run preview` running. Uses reduced motion so pinned animations don't distort the capture.
// Also records console errors and failed requests in docs/screens/report.txt.
import { launch } from "./browser.mjs";
import { readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const base = process.env.BASE ?? "http://localhost:4321";
const dist = new URL("../dist", import.meta.url).pathname;
const outDir = new URL("../docs/screens/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const only = process.argv[2];

function pages(dir = dist, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (n === "index.html" || n === "404.html") {
      const rel = "/" + relative(dist, p).replace(/index\.html$/, "").replace(/404\.html$/, "404");
      out.push(rel);
    }
  }
  return out.sort();
}

const browser = await launch();
const report = [];
for (const path of pages()) {
  if (only && !path.includes(only)) continue;
  for (const w of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 768 ? 844 : 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
    page.on("response", (r) => r.status() >= 400 && !r.url().includes("/404") && errors.push(`${r.status()} ${r.url()}`));
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(`horizontal overflow: ${overflow}px`);
    const name = (path === "/" ? "home" : path.replace(/^\/|\/$/g, "").replace(/\//g, "_")) + `-${w}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    if (errors.length) report.push(`${path} @${w}\n  ${errors.join("\n  ")}`);
    await page.close();
  }
  console.log("ok", path);
}
writeFileSync(join(outDir, "report.txt"), report.join("\n") || "No console errors, failed requests or horizontal overflow.\n");
console.log(report.join("\n") || "clean");
await browser.close();
