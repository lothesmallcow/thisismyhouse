// Dead-space finder (Lorenzo, 22 Nov 2026: "you don't fill the dead space").
// For each page and width it maps every piece of "ink" (text lines, pictures, drawings, fields, buttons),
// then looks for large empty rectangles inside the content column: empty halves next to short text,
// columns that stop early, stacked padding between sections, orphan grid cells.
// It writes a report and a screenshot with the empty areas painted red, so a person can check them.
//
//   npm run build && python3 -m http.server 4321 -d dist   (or npm run preview)
//   node scripts/dead-space.mjs [path ...]          default: the main pages and the demos
//   BASE=http://localhost:4321 OUT=screenshots/dead-space node scripts/dead-space.mjs
//
// Thresholds are starting points (see reports/Pattern AI e personalità dei siti.md); tune them, don't trust them blindly.
import { launch } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.env.BASE ?? "http://localhost:4321";
const out = process.env.OUT ?? "screenshots/dead-space";
const widths = (process.env.WIDTHS ?? "1440,390").split(",").map(Number);
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "/",
      "/analisi-sito/?esempio=curato#voto-curato",
      "/prezzi/",
      "/come-funziona/",
      "/chi-sono/",
      "/contatti/",
      "/lavori/",
      "/lavori/casa-turati-3/",
      "/per/ristrutturazioni-e-serramenti/",
      "/lavori/arcadi-ristrutturazioni/demo/",
      "/lavori/villa-ortensia/demo/",
      "/analisi-sito/esempio-fitness/",
      "/esempi/respiro-rifatto/",
    ];

mkdirSync(out, { recursive: true });
const browser = await launch();
const all = [];

for (const path of pages) {
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
    await page.goto(base + path, { waitUntil: "networkidle" }).catch(() => {});
    // Hide the Focus demo banner and fixed bars: they float over content.
    await page.addStyleTag({ content: ".demo-banner{display:none!important}" });
    // Scroll through so lazy pictures and reveal-on-scroll content are in place.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    const res = await page.evaluate((mobile) => {
      const CELL = 16;
      const docW = document.documentElement.scrollWidth;
      const docH = document.documentElement.scrollHeight;
      const sy = window.scrollY;
      const floating = (el) => {
        for (let e = el; e && e !== document.body; e = e.parentElement) {
          const p = getComputedStyle(e).position;
          if (p === "fixed" || p === "sticky") return true;
        }
        return false;
      };
      const visible = (el) => {
        const s = getComputedStyle(el);
        return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
      };
      const boxes = [];
      const textBoxes = [];
      const push = (r, isText) => {
        if (r.width < 2 || r.height < 2) return;
        const b = { x: r.left, y: r.top + sy, w: r.width, h: r.height };
        boxes.push(b);
        if (isText) textBoxes.push(b);
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el || !visible(el) || floating(el) || el.closest(".sr-only, script, style, noscript, [hidden], [aria-hidden='true'] svg")) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) push(r, true);
      }
      for (const el of document.querySelectorAll("img, svg, video, canvas, iframe, picture, input, select, textarea, button, hr, [style*='background-image']")) {
        if (!visible(el) || floating(el) || el.closest("svg svg")) continue;
        push(el.getBoundingClientRect(), false);
      }
      for (const el of document.querySelectorAll("*")) {
        const bi = getComputedStyle(el).backgroundImage;
        if (bi && bi !== "none" && !bi.startsWith("linear-gradient(transparent") && visible(el) && !floating(el)) push(el.getBoundingClientRect(), false);
      }
      // Drawn pictures made of plain boxes (CSS illustrations, coloured panels without text) count as ink too.
      const bgOf = (el) => getComputedStyle(el).backgroundColor;
      const clear = (c) => !c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
      for (const el of document.querySelectorAll("body *")) {
        if (!visible(el) || floating(el)) continue;
        const c = bgOf(el);
        if (clear(c) || el.textContent.trim()) continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < 400 || r.width > docW * 0.95) continue;
        push(r, false);
      }
      if (!textBoxes.length) return { regions: [], col: [0, docW], docH };
      // Content column: where text actually lives (ignores full-bleed pictures).
      const lefts = textBoxes.map((b) => b.x).sort((a, b) => a - b);
      const rights = textBoxes.map((b) => b.x + b.w).sort((a, b) => a - b);
      const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)))];
      const L = Math.max(0, pct(lefts, 0.02));
      const R = Math.min(docW, pct(rights, 0.98));
      const cols = Math.max(1, Math.floor((R - L) / CELL));
      const rows = Math.ceil(docH / CELL);
      const grid = Array.from({ length: rows }, () => new Uint8Array(cols));
      for (const b of boxes) {
        const c0 = Math.max(0, Math.floor((b.x - L) / CELL));
        const c1 = Math.min(cols - 1, Math.floor((b.x + b.w - L) / CELL));
        const r0 = Math.max(0, Math.floor(b.y / CELL));
        const r1 = Math.min(rows - 1, Math.floor((b.y + b.h) / CELL));
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = 1;
      }
      // First and last ink row: ignore empty space above the first and below the last ink.
      let firstRow = grid.findIndex((row) => row.some((v) => v));
      let lastRow = rows - 1;
      while (lastRow > 0 && !grid[lastRow].some((v) => v)) lastRow--;
      const colW = R - L;
      const minW = mobile ? 0.45 * colW : 0.25 * colW;
      const minH = mobile ? 120 : 176;
      const fullBandH = mobile ? 128 : 208; // empty band across the whole column (stacked section padding)
      const regions = [];
      const largest = () => {
        const hgt = new Array(cols).fill(0);
        let best = null;
        for (let r = firstRow; r <= lastRow; r++) {
          for (let c = 0; c < cols; c++) hgt[c] = grid[r][c] ? 0 : hgt[c] + 1;
          const stack = [];
          for (let c = 0; c <= cols; c++) {
            const h = c === cols ? 0 : hgt[c];
            let start = c;
            while (stack.length && stack[stack.length - 1][1] >= h) {
              const [s, sh] = stack.pop();
              const wCells = c - s;
              const area = wCells * sh;
              if (sh > 0 && (!best || area > best.area)) best = { area, c0: s, c1: c - 1, r1: r, r0: r - sh + 1 };
              start = s;
            }
            stack.push([start, h]);
          }
        }
        return best;
      };
      for (let i = 0; i < 60; i++) {
        const b = largest();
        if (!b) break;
        const wpx = (b.c1 - b.c0 + 1) * CELL;
        const hpx = (b.r1 - b.r0 + 1) * CELL;
        const full = wpx >= colW * 0.9;
        const bad = full ? hpx >= fullBandH : wpx >= minW && hpx >= minH;
        if (wpx * hpx < (mobile ? 30000 : 60000)) break;
        for (let r = b.r0; r <= b.r1; r++) for (let c = b.c0; c <= b.c1; c++) grid[r][c] = 1;
        if (!bad) continue;
        const x = L + b.c0 * CELL, y = b.r0 * CELL;
        // Name it after the nearest heading above.
        let label = "";
        for (const h of document.querySelectorAll("h1, h2, h3")) {
          const hr = h.getBoundingClientRect();
          if (!hr.width || !hr.height) continue;
          if (hr.top + sy <= y + 4) label = h.textContent.trim().slice(0, 60);
        }
        regions.push({ x: Math.round(x), y: Math.round(y), w: wpx, h: hpx, kind: full ? "banda vuota" : "area vuota", under: label });
      }
      return { regions, col: [Math.round(L), Math.round(R)], docH };
    }, w < 600);

    // Paint the regions and take the picture.
    await page.evaluate((regions) => {
      for (const r of regions) {
        const d = document.createElement("div");
        Object.assign(d.style, { position: "absolute", left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px", background: "rgba(255,0,0,.22)", outline: "3px solid red", zIndex: 99999, pointerEvents: "none" });
        document.body.appendChild(d);
      }
    }, res.regions);
    const name = (path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home") + `-${w}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    all.push({ path, w, col: res.col, regions: res.regions });
    console.log(`${String(res.regions.length).padStart(2)}  ${w}  ${path}`);
    for (const r of res.regions) console.log(`      ${r.kind} ${r.w}x${r.h} at y=${r.y} x=${r.x}  (sotto: "${r.under}")`);
    await page.close();
  }
}
writeFileSync(`${out}/report.json`, JSON.stringify(all, null, 1));
await browser.close();
const total = all.reduce((t, p) => t + p.regions.length, 0);
console.log(`\n${total} empty areas on ${all.length} page views. Pictures in ${out}/`);
process.exitCode = process.env.STRICT && total ? 1 : 0;
