// Villa Ortensia: lakeside wedding venue on Lake Como.
import * as k from "./kit.mjs";
const { W, H, rect, path, line, circle, ellipse, linear, group } = k;

function skyLake(defs, top = "#c7d8e2", mid = "#eef0ea") {
  const g = linear([[0, top], [1, mid]]);
  defs.push(g.def);
  let b = rect(0, 0, W, H, g.url);
  // mountains
  b += path("M0 380 L160 250 L300 320 L470 190 L640 300 L820 220 L1000 310 L1180 200 L1380 300 L1600 230 V520 H0 Z", "#9fb0b5");
  b += path("M0 440 Q260 330 520 420 T1040 400 T1600 410 V540 H0 Z", "#7f9790");
  const water = linear([[0, "#9dbac4"], [1, "#6f97a7"]]);
  defs.push(water.def);
  b += rect(0, 520, W, 480, water.url);
  for (let i = 0; i < 16; i++) b += rect((i * 211) % 1560, 560 + (i * 47) % 400, 60 + (i % 5) * 30, 3, "#fff", `opacity="0.4"`);
  return b;
}

function hydrangea(x, y, s = 1, col = "#b9a7d8") {
  let b = ellipse(0, 30, 90, 40, "#4f6b47");
  const r = k.rng(Math.floor(x));
  for (let i = 0; i < 9; i++) {
    const cx = (r() - 0.5) * 140, cy = (r() - 0.5) * 50;
    b += circle(cx, cy, 30, col) ;
    for (let j = 0; j < 5; j++) b += circle(cx + (r() - 0.5) * 36, cy + (r() - 0.5) * 36, 7, "#fff", `opacity="0.35"`);
  }
  return group(b, `transform="translate(${x} ${y}) scale(${s})"`);
}

function villaBuilding(x, y, s = 1) {
  let b = "";
  b += rect(0, 100, 640, 340, "#f1e3cf") + rect(0, 100, 640, 26, "#e2cfb3");
  b += path("M-20 110 L320 30 L660 110 Z", "#c97e5a");
  b += rect(220, 0, 200, 110, "#f1e3cf") + path("M210 10 L320 -40 L430 10 Z", "#c97e5a");
  for (let i = 0; i < 6; i++) {
    const wx = 40 + i * 100;
    b += path(`M${wx} 300 V230 Q${wx + 25} 200 ${wx + 50} 230 V300 Z`, "#6d8a96") + rect(wx - 4, 300, 58, 8, "#e2cfb3");
    b += rect(wx, 150, 50, 54, "#6d8a96");
  }
  b += rect(0, 330, 640, 14, "#e2cfb3");
  for (let i = 0; i < 16; i++) b += rect(10 + i * 40, 344, 10, 40, "#e8d8c0");
  b += rect(0, 384, 640, 10, "#e2cfb3") + rect(0, 394, 640, 46, "#ead9c1");
  return group(b, `transform="translate(${x} ${y}) scale(${s})"`);
}

function heroScene() {
  const defs = [];
  let b = skyLake(defs);
  b += villaBuilding(520, 220, 1);
  b += path("M0 660 Q500 600 1000 650 T1600 640 V1000 H0 Z", "#6f8a5b");
  for (let i = 0; i < 4; i++) b += ellipse(260 + i * 400, 640, 90, 40, "#5a7449");
  b += ellipse(220, 420, 80, 220, "#3f5a3a") + ellipse(1420, 430, 70, 200, "#3f5a3a");
  b += hydrangea(300, 760, 1.1) + hydrangea(1300, 780, 1, "#c9b3e2") + hydrangea(820, 860, 0.9, "#aeb9e0");
  b += path("M700 1000 Q760 850 860 690 L900 690 Q840 850 860 1000 Z", "#e7dcc7");
  return { defs, b, opts: { vignette: 0.12, grain: 0.07 } };
}

function garden() {
  const defs = [];
  let b = skyLake(defs, "#d6e1e6", "#f4f2ec");
  b += path("M0 600 Q800 560 1600 600 V1000 H0 Z", "#7d9a67");
  // ceremony chairs in rows facing the lake, aisle in the middle
  for (let row = 0; row < 5; row++) {
    const y = 940 - row * 70, sc = 1 - row * 0.12;
    for (let c = 0; c < 6; c++) {
      for (const side of [-1, 1]) {
        const x = 800 + side * (90 + c * 85 * sc);
        b += rect(x - 22 * sc, y - 60 * sc, 44 * sc, 60 * sc, "#fbfaf6", `rx="${4 * sc}"`) + rect(x - 24 * sc, y - 12 * sc, 48 * sc, 8 * sc, "#e8e2d6");
      }
    }
  }
  // arch
  b += path("M640 640 V420 Q800 300 960 420 V640", "none", `stroke="#f4efe6" stroke-width="18"`);
  for (let i = 0; i < 18; i++) {
    const t = i / 17, ang = Math.PI * t;
    const x = 800 - Math.cos(ang) * 160, y = 420 - Math.sin(ang) * 120 + (i % 2) * 6;
    b += circle(x, y, 20, i % 3 ? "#c9b3e2" : "#f2d5df");
  }
  b += hydrangea(560, 640, 0.8) + hydrangea(1040, 640, 0.8, "#c9b3e2");
  return { defs, b, opts: { grain: 0.07 } };
}

function salone() {
  const defs = [];
  let b = rect(0, 0, W, H, "#f3ece0");
  // arched windows to the lake
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 370;
    const sk = linear([[0, "#c7d8e2"], [1, "#9dbac4"]]);
    defs.push(sk.def);
    b += path(`M${x} 620 V240 Q${x + 120} 110 ${x + 240} 240 V620 Z`, sk.url);
    b += path(`M${x} 460 Q${x + 120} 420 ${x + 240} 450 V620 H${x} Z`, "#7f9790", `opacity="0.7"`);
    b += path(`M${x} 620 V240 Q${x + 120} 110 ${x + 240} 240 V620`, "none", `stroke="#e3d5bf" stroke-width="16"`) + line(x + 120, 160, x + 120, 620, "#e3d5bf", 10);
  }
  b += rect(0, 0, W, 60, "#e3d5bf") + k.tiles(0, 700, W, 300, "#e9dcc6", "#d6c7ad", 120, { seed: 4, sizeY: 60, offset: true });
  // chandeliers
  for (const cx of [420, 1180]) {
    b += line(cx, 60, cx, 150, "#b08d57", 4) + circle(cx, 200, 140, "#fff4d6", `opacity="0.25"`);
    b += ellipse(cx, 190, 90, 26, "none", `stroke="#b08d57" stroke-width="5"`);
    for (let i = 0; i < 8; i++) b += circle(cx - 84 + i * 24, 196 + Math.sin(i) * 6, 7, "#fff1c4");
  }
  // round tables with white cloths
  for (const [x, y, s] of [[300, 820, 1], [800, 800, 0.95], [1300, 820, 1], [550, 930, 1.1], [1060, 930, 1.1]]) {
    b += ellipse(x, y, 150 * s, 38 * s, "#fbfaf6") + path(`M${x - 150 * s} ${y} Q${x - 150 * s} ${y + 70 * s} ${x - 120 * s} ${y + 80 * s} L${x + 120 * s} ${y + 80 * s} Q${x + 150 * s} ${y + 70 * s} ${x + 150 * s} ${y} Z`, "#f4f1ea");
    b += circle(x, y - 26 * s, 26 * s, "#c9b3e2") + rect(x - 4, y - 14 * s, 8, 14 * s, "#4f6b47");
    for (const d of [-90, -40, 40, 90]) b += rect(x + d * s - 3, y - 40 * s, 6, 26 * s, "#fff6db");
  }
  return { defs, b, opts: { grain: 0.06 } };
}

function terrace() {
  const defs = [];
  const sk = linear([[0, "#4a5a7a"], [0.55, "#d79a7a"], [1, "#f1c99a"]]);
  defs.push(sk.def);
  let b = rect(0, 0, W, H, sk.url);
  b += path("M0 470 L180 360 L360 420 L560 320 L760 410 L960 330 L1180 420 L1400 340 L1600 400 V560 H0 Z", "#5b6478");
  const water = linear([[0, "#c08f80"], [1, "#6c7a90"]]);
  defs.push(water.def);
  b += rect(0, 540, W, 300, water.url) + ellipse(1100, 560, 260, 8, "#f6d6a8", `opacity="0.6"`);
  // string lights
  for (const [y0, y1] of [[90, 160], [150, 230]]) {
    b += path(`M0 ${y0} Q800 ${y1 + 120} 1600 ${y0}`, "none", `stroke="#2f2a2a" stroke-width="3"`);
    for (let i = 1; i < 20; i++) {
      const t = i / 20, x = t * 1600, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y1 + 120) + t * t * y0;
      b += circle(x, y + 10, 18, "#ffe9b0", `opacity="0.35"`) + circle(x, y + 10, 7, "#fff3cf");
    }
  }
  // balustrade
  b += rect(0, 760, W, 26, "#ead9c1") + rect(0, 900, W, 100, "#d9c6a8");
  for (let i = 0; i < 34; i++) b += path(`M${20 + i * 48} 786 q-12 30 0 57 q12 30 0 57 h22 q-12 -27 0 -57 q12 -27 0 -57 Z`, "#ead9c1");
  b += hydrangea(140, 740, 0.9, "#c9b3e2") + hydrangea(1460, 740, 0.9);
  return { defs, b, opts: { grain: 0.06, vignette: 0.22 } };
}

export const villa = {
  hero: heroScene,
  giardino: garden,
  salone,
  terrazza: terrace,
};
