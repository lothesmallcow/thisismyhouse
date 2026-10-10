// Generates the Focale wordmark and favicons as SVG paths from the self-hosted Archivo
// instance (wght 850, wdth 118). Re-run after changing the brand name: `npm run logo`.
// The letter "o" (first one) is framed by autofocus corner brackets: the brand idea.
import opentype from "opentype.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const BRAND = (process.argv[2] ?? "focale").toLowerCase();
const font = opentype.parse(readFileSync(new URL("./fonts-build/archivo-850-118.ttf", import.meta.url)).buffer);
const SIZE = 100;
const out = new URL("../src/assets/logo/", import.meta.url);
mkdirSync(out, { recursive: true });

// Lay out glyphs, remember the box of the focus letter.
const focusIndex = BRAND.indexOf("o") >= 0 ? BRAND.indexOf("o") : 0;
let x = 0;
const baseline = 80;
const parts = [];
let focusBox = null;
const glyphs = [...BRAND].map((ch) => font.charToGlyph(ch));
let ax1 = Infinity, ay1 = Infinity, ay2 = -Infinity;
const GAP = 13; // room for the brackets around the focus letter
glyphs.forEach((g, i) => {
  if (i === focusIndex && i > 0) x += GAP;
  const p = g.getPath(x, baseline, SIZE);
  const bb = p.getBoundingBox();
  if (i === focusIndex) focusBox = bb;
  ax1 = Math.min(ax1, bb.x1); ay1 = Math.min(ay1, bb.y1); ay2 = Math.max(ay2, bb.y2);
  parts.push(p.toPathData(2));
  const next = glyphs[i + 1];
  const kern = next ? font.getKerningValue(g, next) : 0;
  x += ((g.advanceWidth + kern) / font.unitsPerEm) * SIZE + 1.5 + (i === focusIndex ? GAP : 0);
});
const textPath = parts.join(" ");
const all = { x1: ax1, y1: ay1, y2: ay2 };

// Brackets around the focus letter
const pad = 7, arm = 11, t = 5;
const L = focusBox.x1 - pad, R = focusBox.x2 + pad, T = focusBox.y1 - pad, B = focusBox.y2 + pad;
const corner = (cx, cy, dx, dy) =>
  `M${cx} ${cy + dy * arm}V${cy}H${cx + dx * arm}`;
const brackets = [corner(L, T, 1, 1), corner(R, T, -1, 1), corner(L, B, 1, -1), corner(R, B, -1, -1)].join("");

const vbX = Math.floor(Math.min(all.x1, L) - t);
const vbY = Math.floor(Math.min(all.y1, T) - t);
const vbW = Math.ceil(Math.max(x, R) + t - vbX);
const vbH = Math.ceil(Math.max(all.y2, B) + t - vbY);

const data = {
  viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
  text: textPath,
  brackets,
  strokeWidth: t,
};
writeFileSync(new URL("logo.json", out), JSON.stringify(data, null, 2));

// Favicon: the focus mark alone (brackets around a solid square), on calce.
const mark = (fg, bg, bracket, inset = 0) => {
  const s = 64, w = 6, m = 9 + inset, a = Math.round((s - 2 * m) * 0.3);
  const c = (cx, cy, dx, dy) => `M${cx} ${cy + dy * a}V${cy}H${cx + dx * a}`;
  const b = [c(m, m, 1, 1), c(s - m, m, -1, 1), c(m, s - m, 1, -1), c(s - m, s - m, -1, -1)].join("");
  const core = Math.round((s - 2 * m) * 0.34);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" rx="${inset ? 0 : 12}" fill="${bg}"/><path d="${b}" fill="none" stroke="${bracket}" stroke-width="${w}" stroke-linecap="square"/><rect x="${s / 2 - core / 2}" y="${s / 2 - core / 2}" width="${core}" height="${core}" fill="${fg}"/></svg>`;
};
const pub = new URL("../public/", import.meta.url);
const fav = mark("#1E3A2C", "#F3F4F0", "#1E3A2C");
writeFileSync(new URL("favicon.svg", pub), fav);
await sharp(Buffer.from(fav)).resize(32, 32).png().toFile(new URL("favicon-32.png", pub).pathname);
await sharp(Buffer.from(mark("#1E3A2C", "#F3F4F0", "#1E3A2C", 0))).resize(180, 180).png().toFile(new URL("apple-touch-icon.png", pub).pathname);
await sharp(Buffer.from(mark("#F3F4F0", "#1E3A2C", "#F3F4F0", 8))).resize(512, 512).png().toFile(new URL("icon-512.png", pub).pathname);
console.log("logo:", data.viewBox);
