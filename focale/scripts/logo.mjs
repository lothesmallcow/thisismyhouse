// Generates the Focus Design wordmark and favicons from the self-hosted Archivo (wdth 125).
// "focus" in 500 and "design" in 300, Archivo at width 125%, no symbol. Run: npm run logo
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

import { execFileSync } from "node:child_process";
const SIZE = 100, BASE = 80;
const ttf = (n) => new URL(`./fonts-build/${n}.ttf`, import.meta.url).pathname;
const py = new URL("./fonts-build/glyphs.py", import.meta.url).pathname;
// Glyph outlines come from fontTools (opentype.js mangles some instanced glyphs).
const word = (font, text, x0, tracking = -1.5) =>
  JSON.parse(execFileSync("python3", [py, ttf(font), text, String(SIZE), String(x0), String(BASE), String(tracking)], { encoding: "utf8" }));
const bold = "archivo-500-125";
const light = "archivo-300-125";

const a = word(bold, "focus", 0);
const b = word(light, "design", a.x + 22);
const y1 = Math.min(a.box.y1, b.box.y1);
const y2 = Math.max(a.box.y2, b.box.y2);
const out = new URL("../src/assets/logo/", import.meta.url);
mkdirSync(out, { recursive: true });
const data = {
  viewBox: `${Math.floor(a.box.x1 - 2)} ${Math.floor(y1 - 2)} ${Math.ceil(b.box.x2 - a.box.x1 + 4)} ${Math.ceil(y2 - y1 + 4)}`,
  focus: a.d,
  design: b.d,
};
writeFileSync(new URL("logo.json", out), JSON.stringify(data, null, 2));

// Favicon: four autofocus corners around the red point.
const mark = (bg, fg, pad = 0) => {
  const s = 64, m = 12 + pad, a2 = Math.round((s - 2 * m) * 0.32), w = 5;
  const c = (cx, cy, dx, dy) => `M${cx} ${cy + dy * a2}V${cy}H${cx + dx * a2}`;
  const p = [c(m, m, 1, 1), c(s - m, m, -1, 1), c(m, s - m, 1, -1), c(s - m, s - m, -1, -1)].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" rx="${pad ? 0 : 14}" fill="${bg}"/><path d="${p}" fill="none" stroke="${fg}" stroke-width="${w}"/><circle cx="32" cy="32" r="${pad ? 5 : 6}" fill="${fg}"/></svg>`;
};
const pub = new URL("../public/", import.meta.url);
writeFileSync(new URL("favicon.svg", pub), mark("#FBFBF9", "#161513"));
await sharp(Buffer.from(mark("#FBFBF9", "#161513"))).resize(32, 32).png().toFile(new URL("favicon-32.png", pub).pathname);
await sharp(Buffer.from(mark("#FBFBF9", "#161513"))).resize(180, 180).png().toFile(new URL("apple-touch-icon.png", pub).pathname);
await sharp(Buffer.from(mark("#161513", "#FBFBF9", 8))).resize(512, 512).png().toFile(new URL("icon-512.png", pub).pathname);
console.log("logo", data.viewBox);
