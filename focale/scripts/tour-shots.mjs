// Full-page screenshots of a real client site for its scrolling tour (components/RealTour.astro),
// with the box of every tour point measured on the same page, so the numbers sit exactly on it.
// Usage: node scripts/tour-shots.mjs <slug> <url>   (url: a local preview of the client's build)
// Writes src/assets/lavori/<slug>-tour-{desktop,phone}.jpg and src/assets/lavori/<slug>-tour.json.
import { readFile, writeFile } from "node:fs/promises";
import { parse } from "yaml";
import { launch } from "./browser.mjs";

const [slug, url] = process.argv.slice(2);
if (!slug || !url) throw new Error("Usage: node scripts/tour-shots.mjs <slug> <url>");
const data = parse(await readFile(new URL(`../src/content/lavori/${slug}.yaml`, import.meta.url), "utf8"));
const sels = (data.tour ?? []).map((p) => p.sel);
// The button the makeover film clicks at the end (optional).
const endSel = data.tourEnd;
if (!sels.length) throw new Error(`${slug}.yaml has no tour`);

const out = {};
const b = await launch();
for (const [name, w, h, dpr] of [["desktop", 1280, 800, 1], ["phone", 390, 844, 2]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: "reduce" });
  await p.goto(url, { waitUntil: "networkidle" });
  // Every picture loaded, the page as it is at the top (no sticky bar half-way down).
  await p.evaluate(async () => {
    document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
  await p.addStyleTag({ content: "[data-sticky-bar]{display:none!important}" });
  await p.waitForTimeout(1500);
  const boxes = await p.evaluate((sels) => sels.map((s) => {
    const e = document.querySelector(s);
    if (!e) throw new Error(`No element for ${s}`);
    const r = e.getBoundingClientRect();
    return [r.left, r.top + scrollY, r.width, r.height].map(Math.round);
  }), sels);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const end = endSel
    ? await p.evaluate((s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return [r.left, r.top + scrollY, r.width, r.height].map(Math.round);
      }, endSel)
    : undefined;
  await p.screenshot({ path: `src/assets/lavori/${slug}-tour-${name}.jpg`, fullPage: true, type: "jpeg", quality: 88 });
  out[name] = { w, h: H, boxes, ...(end && { end }) };
  await p.close();
}
await b.close();
await writeFile(new URL(`../src/assets/lavori/${slug}-tour.json`, import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`Tour shots for ${slug}:`, Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.w}x${v.h}`])));
