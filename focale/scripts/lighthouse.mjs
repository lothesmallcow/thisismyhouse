// Lighthouse (mobile, simulated throttling) on every built page. Writes docs/lighthouse.md.
// Needs `npm run preview` running. Set CHROME_PATH if Chrome is not found automatically.
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const base = process.env.BASE ?? "http://localhost:4321";
const dist = new URL("../dist", import.meta.url).pathname;
const only = process.argv[2];
const candidates = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium"].filter(Boolean);
const chromePath = candidates.find((p) => existsSync(p));

function pages(dir = dist, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (n === "index.html") out.push("/" + relative(dist, p).replace(/index\.html$/, ""));
  }
  return out.sort();
}

const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox"] });
const rows = [];
for (const path of pages()) {
  if (only && !path.includes(only)) continue;
  const res = await lighthouse(base + path, { port: chrome.port, output: "json", logLevel: "error" });
  const c = res.lhr.categories;
  const a = res.lhr.audits;
  const score = (k) => Math.round((c[k]?.score ?? 0) * 100);
  const row = {
    path,
    perf: score("performance"),
    a11y: score("accessibility"),
    bp: score("best-practices"),
    seo: score("seo"),
    lcp: (a["largest-contentful-paint"].numericValue / 1000).toFixed(2),
    cls: a["cumulative-layout-shift"].numericValue.toFixed(3),
    tbt: Math.round(a["total-blocking-time"].numericValue),
    failed: Object.values(a)
      .filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === "binary")
      .map((x) => x.id),
  };
  rows.push(row);
  console.log(`${path}  perf ${row.perf}  a11y ${row.a11y}  bp ${row.bp}  seo ${row.seo}  LCP ${row.lcp}s  CLS ${row.cls}  ${row.failed.join(", ")}`);
}
await chrome.kill();
const md = [
  "# Lighthouse (mobile, simulated throttling)",
  "",
  `Run on the local preview build. SEO scores on noindex pages are expected to be lower (they are hidden on purpose).`,
  "",
  "| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | Failed binary audits |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.path} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} | ${r.lcp} s | ${r.cls} | ${r.failed.join(", ") || "none"} |`),
  "",
].join("\n");
if (!only) writeFileSync(new URL("../docs/lighthouse.md", import.meta.url), md);
