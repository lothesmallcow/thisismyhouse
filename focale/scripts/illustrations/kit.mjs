// Small SVG drawing kit for the demo illustrations.
export const W = 1600;
export const H = 1000;

let uid = 0;
export const id = (p = "g") => `${p}${++uid}`;

export const rect = (x, y, w, h, fill, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
export const circle = (cx, cy, r, fill, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
export const ellipse = (cx, cy, rx, ry, fill, extra = "") =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
export const path = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const line = (x1, y1, x2, y2, stroke, w = 2, extra = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
export const group = (content, extra = "") => `<g ${extra}>${content}</g>`;

export function linear(stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  const gid = id("lg");
  const s = stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");
  return { id: gid, def: `<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`, url: `url(#${gid})` };
}
export function radial(stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
  const gid = id("rg");
  const s = stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");
  return { id: gid, def: `<radialGradient id="${gid}" cx="${cx}" cy="${cy}" r="${r}">${s}</radialGradient>`, url: `url(#${gid})` };
}

/** Deterministic pseudo random generator so every build draws the same picture. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function svg(defs, body, { grain = 0.09, vignette = 0.18 } = {}) {
  const gr = id("grain");
  const vg = radial([[0.55, "#000", 0], [1, "#000", vignette]], { r: 0.75 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${defs.join("")}${vg.def}
<filter id="${gr}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 ${grain}"/></feComponentTransfer></filter>
</defs>
${body}
<rect width="${W}" height="${H}" fill="${vg.url}"/>
<rect width="${W}" height="${H}" filter="url(#${gr})" opacity="1"/>
</svg>`;
}

/** Grid of tiles drawn as grout lines over a base colour. */
export function tiles(x, y, w, h, base, grout, size, { offset = false, sizeY = size, jitter = 0, seed = 3 } = {}) {
  const r = rng(seed);
  let out = rect(x, y, w, h, base);
  if (jitter) {
    for (let ty = y; ty < y + h; ty += sizeY) {
      for (let tx = x; tx < x + w; tx += size) {
        const a = (r() - 0.5) * jitter;
        out += rect(tx, ty, Math.min(size, x + w - tx), Math.min(sizeY, y + h - ty), a > 0 ? "#fff" : "#000", `opacity="${Math.abs(a)}"`);
      }
    }
  }
  let row = 0;
  for (let ty = y + sizeY; ty < y + h; ty += sizeY) out += line(x, ty, x + w, ty, grout, 2);
  for (let ty = y; ty < y + h; ty += sizeY, row++) {
    const off = offset && row % 2 ? size / 2 : 0;
    for (let tx = x + size - off; tx < x + w; tx += size) out += line(tx, ty, tx, Math.min(ty + sizeY, y + h), grout, 2);
  }
  return out;
}

/** Exposed brick wall. */
export function bricks(x, y, w, h, seed = 7, palette = ["#a5533b", "#b4613f", "#94492f", "#bb6d4c", "#9d5a40"]) {
  const r = rng(seed);
  let out = rect(x, y, w, h, "#7a5446");
  const bw = 64, bh = 24, gap = 4;
  let row = 0;
  for (let by = y; by < y + h; by += bh + gap, row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let bx = x - off; bx < x + w; bx += bw + gap) {
      const cx = Math.max(bx, x), cw = Math.min(bx + bw, x + w) - cx;
      if (cw <= 0) continue;
      out += rect(cx, by, cw, Math.min(bh, y + h - by), palette[Math.floor(r() * palette.length)]);
    }
  }
  return out;
}

/** Wooden floor planks. */
export function planks(x, y, w, h, base = "#b88a5c", seed = 5, plankH = 26, dark = "#8a6440") {
  const r = rng(seed);
  let out = rect(x, y, w, h, base);
  let row = 0;
  for (let py = y; py < y + h; py += plankH, row++) {
    let px = x - r() * 200;
    while (px < x + w) {
      const len = 180 + r() * 260;
      const shade = (r() - 0.5) * 0.18;
      out += rect(Math.max(px, x), py, Math.min(len, x + w - Math.max(px, x)), plankH, shade > 0 ? "#fff" : "#000", `opacity="${Math.abs(shade)}"`);
      out += line(px + len, py, px + len, py + plankH, dark, 2, `opacity="0.6"`);
      px += len;
    }
    out += line(x, py, x + w, py, dark, 1.5, `opacity="0.55"`);
  }
  return out;
}

export function plant(x, y, s = 1, pot = "#d9d3c7", leaf = "#4f7a4a", leaf2 = "#3e6a3c") {
  let out = "";
  const leaves = [
    [-60, -150, -10], [50, -170, 15], [-20, -210, -2], [80, -110, 30], [-90, -90, -35], [10, -140, 5], [-45, -190, -18],
  ];
  for (const [dx, dy, rot] of leaves) {
    out += `<ellipse cx="${dx * 0.6}" cy="${dy * 0.6}" rx="18" ry="58" fill="${rot % 2 ? leaf : leaf2}" transform="rotate(${rot} ${dx * 0.6} ${dy * 0.6})"/>`;
    out += line(0, -20, dx * 0.6, dy * 0.6, leaf2, 3);
  }
  out += path("M-42 -24 L42 -24 L32 60 L-32 60 Z", pot);
  out += rect(-46, -32, 92, 12, pot, `opacity="0.85"`);
  return group(out, `transform="translate(${x} ${y}) scale(${s})"`);
}

/** Window with sky and optional view; returns svg string. */
export function windowView(x, y, w, h, { frame = "#f4f4f2", frameW = 14, view = "city", seed = 2, mullion = true, light = true } = {}) {
  const sky = linear([[0, "#a9c6dd"], [1, "#e8eef0"]]);
  let defs = sky.def;
  let inner = rect(x, y, w, h, sky.url);
  const r = rng(seed);
  if (view === "city") {
    let bx = x - 20;
    while (bx < x + w) {
      const bw = 70 + r() * 120;
      const bh = h * (0.25 + r() * 0.45);
      const col = ["#c9b8a3", "#b9a58e", "#d6c7b2", "#a99886"][Math.floor(r() * 4)];
      inner += rect(bx, y + h - bh, bw, bh, col);
      for (let wy = y + h - bh + 14; wy < y + h - 12; wy += 26)
        for (let wx = bx + 10; wx < bx + bw - 16; wx += 22) inner += rect(wx, wy, 9, 13, "#8d7c6a", `opacity="0.55"`);
      inner += rect(bx - 4, y + h - bh - 8, bw + 8, 8, "#9d6e52");
      bx += bw + 6;
    }
    inner += ellipse(x + w * 0.2, y + h - 10, 90, 60, "#6f8f5e");
    inner += ellipse(x + w * 0.85, y + h, 120, 70, "#5d7e50");
  } else if (view === "hills") {
    inner += path(`M${x} ${y + h * 0.6} Q${x + w * 0.3} ${y + h * 0.42} ${x + w * 0.6} ${y + h * 0.58} T${x + w} ${y + h * 0.5} V${y + h} H${x} Z`, "#93a777");
    inner += path(`M${x} ${y + h * 0.78} Q${x + w * 0.4} ${y + h * 0.62} ${x + w} ${y + h * 0.75} V${y + h} H${x} Z`, "#728a57");
  } else if (view === "lake") {
    inner += path(`M${x} ${y + h * 0.48} Q${x + w * 0.25} ${y + h * 0.3} ${x + w * 0.55} ${y + h * 0.45} T${x + w} ${y + h * 0.4} V${y + h * 0.6} H${x} Z`, "#7d8f8a");
    inner += rect(x, y + h * 0.58, w, h * 0.42, "#8fb0bd");
    for (let i = 0; i < 8; i++) inner += rect(x + r() * w, y + h * (0.62 + r() * 0.3), 40 + r() * 80, 3, "#ffffff", `opacity="0.5"`);
  }
  let out = `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden">${inner}</svg>`;
  if (light) {
    const gl = linear([[0, "#fff", 0.35], [0.5, "#fff", 0], [1, "#fff", 0.15]], { x2: 1, y2: 1 });
    defs += gl.def;
    out += rect(x, y, w, h, gl.url);
  }
  out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${frame}" stroke-width="${frameW}"/>`;
  if (mullion) {
    out += rect(x + w / 2 - frameW / 2, y, frameW, h, frame);
    out += rect(x, y + h * 0.62, w, frameW * 0.8, frame);
  }
  return { defs, svg: out };
}

/** Soft light shaft from a window onto floor. */
export function lightShaft(x1, x2, top, floorY, spread = 220, opacity = 0.18) {
  return path(`M${x1} ${top} L${x2} ${top} L${x2 + spread} ${floorY} L${x1 + spread * 0.4} ${floorY} Z`, "#fffbe8", `opacity="${opacity}"`);
}

export function ladder(x, y, h, color = "#c9a36a") {
  let out = line(x, y + h, x + 40, y, color, 9) + line(x + 90, y + h, x + 130, y, color, 9);
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    out += line(x + 40 * (1 - t) + 4, y + h * (1 - t) + h * 0 , x + 90 + 40 * (1 - t) - 4, y + h * (1 - t), color, 7);
  }
  return out;
}

export function bucket(x, y, color = "#e3e1dc", band = "#f06a1d") {
  return path(`M${x - 40} ${y - 80} L${x + 40} ${y - 80} L${x + 32} ${y} L${x - 32} ${y} Z`, color) + rect(x - 38, y - 64, 76, 12, band) + path(`M${x - 40} ${y - 80} Q${x} ${y - 130} ${x + 40} ${y - 80}`, "none", `stroke="#555" stroke-width="3"`);
}

export function sack(x, y, color = "#d8cdb5", label = "#9b8f78") {
  return path(`M${x - 60} ${y} Q${x - 70} ${y - 60} ${x - 50} ${y - 95} L${x + 50} ${y - 95} Q${x + 70} ${y - 60} ${x + 60} ${y} Z`, color) + rect(x - 30, y - 70, 60, 26, label, `opacity="0.7"`);
}

export function rubble(x, y, seed = 9, n = 18) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const rx = x + (r() - 0.5) * 260, ry = y - r() * 30, s = 8 + r() * 26;
    const col = ["#a19a8f", "#8f877c", "#b6aea2", "#a5533b", "#c9c1b5"][Math.floor(r() * 5)];
    out += path(`M${rx} ${ry} l${s} ${-s * 0.4} l${s * 0.6} ${s * 0.7} l${-s * 1.2} ${s * 0.3} Z`, col);
  }
  return out;
}

export function pendant(x, y, len, shade = "#2e2e2e", glow = true) {
  let out = line(x, 0, x, y + len - 30, "#3a3a3a", 2);
  if (glow) out += circle(x, y + len + 10, 90, "#fff4cf", `opacity="0.25"`);
  out += path(`M${x - 34} ${y + len} L${x - 14} ${y + len - 34} L${x + 14} ${y + len - 34} L${x + 34} ${y + len} Z`, shade);
  out += ellipse(x, y + len + 2, 22, 6, "#fff2c2");
  return out;
}

export function render(defs, body, opts) {
  return svg(defs, body, opts);
}
