// Finds text that is cut off: pages that scroll sideways, and text elements that stick out of
// the viewport or are clipped by their own box. Every built page at five widths.
// Needs `npm run preview` running.
import { launch } from "./browser.mjs";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const base = process.env.BASE ?? "http://localhost:4321";
const dist = new URL("../dist", import.meta.url).pathname;
function pages(dir = dist, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (n === "index.html") out.push("/" + relative(dist, p).replace(/index\.html$/, ""));
  }
  return out.filter((p) => !p.startsWith("/dev-") && !p.startsWith("/styleguide")).sort();
}
const widths = [360, 390, 683, 1024, 1440, 1920];
const browser = await launch();
let issues = 0;
for (const path of pages()) {
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
    await page.goto(base + path, { waitUntil: "networkidle" });
    const found = await page.evaluate(() => {
      const out = [];
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`);
      const skip = (el) => el.closest(".iph, .pf, [aria-hidden='true'], .sr-only, .dots, .sc-work__list, .ftr__mark, .mq, .d-rail, details:not([open]) .faq__body");
      for (const el of document.querySelectorAll("h1, h2, h3, h4, p, li, a, button, label, dt, dd, strong, figcaption, legend")) {
        if (skip(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const name = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""} "${el.textContent.trim().slice(0, 40)}"`;
        if (r.right > vw + 1 || r.left < -1) out.push(`off screen: ${name} (${Math.round(r.left)}..${Math.round(r.right)})`);
        const clips = /(hidden|clip)/.test(cs.overflowX) || /(hidden|clip)/.test(cs.overflow);
        if (clips && el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== "ellipsis") out.push(`clipped: ${name}`);
      }
      return [...new Set(out)].slice(0, 8);
    });
    if (found.length) {
      issues += found.length;
      console.log(`${path} @${w}\n  ${found.join("\n  ")}`);
    }
    await page.close();
  }
}
await browser.close();
console.log(issues ? `${issues} issue(s)` : "No cut-off text.");
if (issues) process.exit(1);
