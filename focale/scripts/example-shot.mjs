// Shoots the three invented example sites (public/esempi/) as a phone would see them, full page, and
// records where each point sits ([data-why] boxes) for the pinned viewer (ExampleSite.astro).
// Mobile emulation on, so a site without the phone setting shows zoomed out, as on a real phone.
// Run after `npm run build`: node scripts/example-shot.mjs
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const root = new URL("../dist/", import.meta.url).pathname;
const types = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".css": "text/css", ".js": "text/javascript" };
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined) });
mkdirSync(new URL("../src/scorer/spots/", import.meta.url), { recursive: true });
const sites = { vecchio: "centro-sport", curato: "respiro", "fatto-bene": "respiro-rifatto" };
for (const [key, dir] of Object.entries(sites)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/esempi/${dir}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ".fd{position:static!important}" });
  const out = await page.evaluate(() => {
    const W = document.documentElement.scrollWidth;
    const H = document.documentElement.scrollHeight;
    const spots = [...document.querySelectorAll("[data-why]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { ids: el.getAttribute("data-why").split(/\s+/), x: (r.left + scrollX) / W, y: (r.top + scrollY) / H, w: r.width / W, h: r.height / H };
    });
    return { width: W, height: H, spots };
  });
  await page.screenshot({ path: new URL(`../src/assets/esempi/${key}.png`, import.meta.url).pathname, fullPage: true });
  writeFileSync(new URL(`../src/scorer/spots/${key}.json`, import.meta.url), JSON.stringify(out, null, 1) + "\n");
  console.log(`${key}: ${out.width}x${out.height}, ${out.spots.length} spots`);
  await ctx.close();
}
await browser.close();
server.close();
