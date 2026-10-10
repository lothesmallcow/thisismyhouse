// Cascina Rovere: farmhouse in the Brianza hills, six rooms, surroundings.
import * as k from "./kit.mjs";
const { W, H, rect, path, line, circle, ellipse, linear, radial, group } = k;

function sky(defs, top = "#f1d9a8", bottom = "#f7ecd6") {
  const g = linear([[0, top], [1, bottom]]);
  defs.push(g.def);
  return rect(0, 0, W, H, g.url);
}

function hills(seed = 1) {
  const r = k.rng(seed);
  let b = "";
  b += path(`M0 430 Q300 330 620 410 T1200 380 T1600 400 V1000 H0 Z`, "#b9b98a");
  b += path(`M0 520 Q400 420 800 500 T1600 470 V1000 H0 Z`, "#9fa671");
  // vineyard rows
  for (let i = 0; i < 16; i++) b += path(`M${-100 + i * 110} 1000 Q${200 + i * 70} 640 ${520 + i * 60} 560`, "none", `stroke="#7d8a52" stroke-width="5" opacity="0.6"`);
  b += path(`M0 640 Q500 560 1000 640 T1600 610 V1000 H0 Z`, "#8a9660");
  // cypresses / trees
  for (let i = 0; i < 9; i++) {
    const x = 60 + r() * 1500, y = 470 + r() * 80, h = 80 + r() * 60;
    b += ellipse(x, y - h / 2, 18, h / 2, "#56663d");
  }
  return b;
}

function farmhouse(x, y, s = 1) {
  let b = "";
  // main block
  b += rect(0, 120, 520, 260, "#e3c79a") + rect(0, 120, 520, 260, "#c99e66", `opacity="0.18"`);
  b += path("M-30 130 L260 20 L550 130 Z", "#a4522f") + path("M-30 130 L550 130 L540 145 L-20 145 Z", "#7f3d22");
  // barn with arches (fienile)
  b += rect(520, 170, 360, 210, "#d8b98a") + path("M505 180 L700 90 L895 180 Z", "#9b4a2a");
  for (let i = 0; i < 3; i++) b += path(`M${550 + i * 110} 380 V270 Q${590 + i * 110} 220 ${630 + i * 110} 270 V380 Z`, "#6d4b2f");
  // windows with green shutters
  for (let i = 0; i < 4; i++) {
    const wx = 50 + i * 120;
    for (const wy of [170, 270]) {
      b += rect(wx, wy, 44, 64, "#5b4630") + rect(wx - 20, wy, 18, 64, "#4f6b47") + rect(wx + 46, wy, 18, 64, "#4f6b47");
    }
  }
  b += rect(230, 300, 60, 80, "#5b3e26", `rx="2"`);
  // pergola with wisteria
  b += rect(-120, 250, 120, 10, "#6b5136") + rect(-118, 260, 8, 120, "#6b5136") + rect(-20, 260, 8, 120, "#6b5136");
  for (let i = 0; i < 8; i++) b += ellipse(-110 + i * 15, 270 + (i % 3) * 8, 10, 22, "#9b84c4");
  return group(b, `transform="translate(${x} ${y}) scale(${s})"`);
}

function heroScene() {
  const defs = [];
  let b = sky(defs, "#efc98f", "#f8ecd2");
  const sun = radial([[0, "#fff5d6", 1], [1, "#fff5d6", 0]]);
  defs.push(sun.def);
  b += circle(1260, 230, 260, sun.url) + circle(1260, 230, 70, "#fff3cf");
  b += hills(3);
  b += farmhouse(420, 330, 1.05);
  // lawn and path
  b += path("M0 760 Q800 700 1600 760 V1000 H0 Z", "#7f8f52");
  b += path("M700 1000 Q760 860 690 740 L730 740 Q820 860 800 1000 Z", "#d9c49a");
  for (const [x, y, rx] of [[300, 770, 90], [390, 790, 60], [1150, 780, 80], [1240, 800, 55]]) b += ellipse(x, y, rx, rx * 0.55, "#5d7444") + ellipse(x - rx * 0.3, y - rx * 0.2, rx * 0.5, rx * 0.3, "#6f8a52");
  // laundry line / bench
  b += rect(1250, 860, 200, 16, "#6b5136") + rect(1260, 876, 10, 40, "#6b5136") + rect(1430, 876, 10, 40, "#6b5136");
  return { defs, b, opts: { vignette: 0.14 } };
}

function room({ wall = "#efe4d1", accent = "#7c5b3c", bedCover = "#f5efe4", throwColor = "#6f8a5b", beams = false, round = false, vine = false, view = "hills", seed = 1 }) {
  const defs = [];
  let b = rect(0, 0, W, H, wall);
  if (beams) {
    b += path("M0 0 L1600 0 L1600 140 L0 220 Z", "#b38b5d");
    for (let i = 0; i < 7; i++) b += path(`M${i * 240} 0 L${i * 240 + 40} 0 L${i * 240 + 40} ${210 - i * 11} L${i * 240} ${215 - i * 11} Z`, "#7a5636");
  } else {
    for (let i = 0; i < 6; i++) b += rect(i * 290, 0, 40, 90, accent);
    b += rect(0, 90, W, 18, accent, `opacity="0.8"`);
  }
  // terracotta floor
  b += k.tiles(0, 790, W, 210, "#c27b54", "#a3613f", 110, { sizeY: 55, offset: true, jitter: 0.05, seed });
  // window
  let win;
  if (round) {
    const sk = linear([[0, "#a9c6dd"], [1, "#eef0e6"]]);
    defs.push(sk.def);
    b += circle(1230, 330, 150, "#6b5136") + circle(1230, 330, 132, sk.url);
    defs.push(`<clipPath id="roundwin"><circle cx="1230" cy="330" r="132"/></clipPath>`);
    b += path("M1090 380 Q1180 320 1260 370 T1372 350 V480 H1090 Z", "#93a777", `clip-path="url(#roundwin)"`);
    b += line(1230, 198, 1230, 462, "#6b5136", 10) + line(1098, 330, 1362, 330, "#6b5136", 10);
  } else {
    win = k.windowView(1080, 170, 300, 380, { view, seed, frame: "#6b5136", frameW: 16 });
    defs.push(win.defs);
    b += win.svg + rect(1050, 160, 30, 400, "#5d7a52") + rect(1380, 160, 30, 400, "#5d7a52");
    b += k.lightShaft(1080, 1380, 550, H, -360, 0.14);
  }
  if (vine) for (let i = 0; i < 20; i++) b += ellipse(1060 + (i * 37) % 360, 150 + (i % 4) * 14, 16, 10, "#6f8a5b");
  // bed
  b += rect(160, 380, 720, 260, accent, `rx="10"`) + rect(180, 400, 680, 220, "#000", `opacity="0.08" rx="8"`);
  b += rect(130, 600, 780, 170, bedCover, `rx="18"`) + rect(130, 680, 780, 90, throwColor, `rx="14"`);
  b += rect(200, 548, 200, 74, "#fbf8f1", `rx="20"`) + rect(450, 548, 200, 74, "#fbf8f1", `rx="20"`) + rect(690, 556, 160, 64, throwColor, `rx="18" opacity="0.85"`);
  b += rect(150, 770, 22, 30, "#4d3a28") + rect(870, 770, 22, 30, "#4d3a28");
  // bedside + lamp + flowers
  b += rect(940, 620, 110, 170, "#a07a52", `rx="6"`) + rect(985, 560, 10, 60, "#4d3a28") + path("M955 560 L1025 560 L1010 515 L970 515 Z", "#efe2c4");
  b += rect(20, 640, 110, 150, "#a07a52", `rx="6"`) + rect(55, 600, 36, 40, "#d9cfc0", `rx="6"`);
  for (let i = 0; i < 6; i++) b += circle(60 + (i % 3) * 12, 585 - Math.floor(i / 3) * 14, 9, i % 2 ? "#e9a0a0" : "#f2d36b");
  b += ellipse(560, 920, 380, 50, "#000", `opacity="0.08"`);
  return { defs, b };
}

function walk() {
  const defs = [];
  let b = sky(defs, "#bcd3e0", "#eef1e6") + hills(9);
  b += path("M0 1000 Q500 760 800 640 Q1000 560 1200 520 L1240 524 Q1060 580 900 680 Q620 860 420 1000 Z", "#d8c59c");
  b += path("M0 820 Q400 760 700 820 V1000 H0 Z", "#6f8048") + path("M1000 860 Q1300 760 1600 820 V1000 H1000 Z", "#6f8048");
  for (let i = 0; i < 6; i++) b += ellipse(1100 + i * 90, 520 - i * 8, 38, 70, "#4f6038");
  return { defs, b };
}
function lake() {
  const defs = [];
  let b = sky(defs, "#bcd3e0", "#f1efe4");
  b += path("M0 420 Q300 300 700 380 T1600 350 V560 H0 Z", "#8d9f7b") + path("M0 470 Q500 400 1000 460 T1600 440 V560 H0 Z", "#78906a");
  const water = linear([[0, "#8fb0bd"], [1, "#6d93a3"]]);
  defs.push(water.def);
  b += rect(0, 540, W, 460, water.url);
  for (let i = 0; i < 14; i++) b += rect((i * 173) % 1500, 600 + (i * 61) % 360, 80 + (i % 4) * 30, 4, "#fff", `opacity="0.45"`);
  b += path("M640 760 L860 760 L830 800 L670 800 Z", "#a4522f") + line(750, 760, 750, 620, "#4d3a28", 5) + path("M752 630 L830 740 L752 740 Z", "#f4efe3");
  b += path("M0 880 Q300 820 560 900 L560 1000 H0 Z", "#6f8048");
  for (let i = 0; i < 9; i++) b += line(60 + i * 30, 900, 50 + i * 32, 800 - (i % 3) * 30, "#56663d", 5);
  return { defs, b };
}
function village() {
  const defs = [];
  let b = sky(defs, "#f2d9a8", "#f7eedd");
  // church tower and houses
  b += rect(700, 160, 140, 520, "#d9b98a") + path("M690 170 L770 60 L850 170 Z", "#9b4a2a") + rect(745, 210, 50, 80, "#5b4630", `rx="25"`) + circle(770, 340, 26, "#f4ead5") + line(770, 340, 770, 322, "#4d3a28", 4);
  const cols = ["#e7c9a0", "#e2b38c", "#d8a77a", "#ecd5aa", "#dfbf93"];
  for (let i = 0; i < 7; i++) {
    const x = i * 230 - 40, h = 260 + ((i * 53) % 120);
    if (i === 3) continue;
    b += rect(x, 680 - h, 220, h, cols[i % 5]) + path(`M${x - 10} ${690 - h} L${x + 110} ${640 - h} L${x + 230} ${690 - h} Z`, "#a4522f");
    for (let wy = 720 - h; wy < 640; wy += 80) for (let wx = x + 30; wx < x + 200; wx += 70) b += rect(wx, wy, 32, 46, "#5b4630") + rect(wx - 10, wy, 9, 46, "#4f6b47") + rect(wx + 33, wy, 9, 46, "#4f6b47");
  }
  // market stalls
  b += k.tiles(0, 680, W, 320, "#cdb994", "#b5a17b", 90, { sizeY: 45, offset: true, seed: 5 });
  const awn = ["#4f6b47", "#a4522f", "#e2b740"];
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 370;
    b += path(`M${x} 720 L${x + 280} 720 L${x + 300} 780 L${x - 20} 780 Z`, awn[i % 3]) + rect(x, 780, 280, 110, "#8b6a46");
    for (let j = 0; j < 9; j++) b += circle(x + 30 + j * 28, 790, 12, ["#e8a33c", "#c0392b", "#7aa04c"][j % 3]);
    b += line(x + 5, 780, x + 5, 940, "#5b4630", 6) + line(x + 275, 780, x + 275, 940, "#5b4630", 6);
  }
  return { defs, b };
}

export const cascina = {
  hero: heroScene,
  noce: () => room({ accent: "#6f4f33", throwColor: "#7a6145", seed: 2 }),
  glicine: () => room({ wall: "#ece4ef", accent: "#8a7aa8", throwColor: "#9b84c4", vine: true, seed: 3 }),
  fienile: () => room({ wall: "#efe2c9", accent: "#7a5636", throwColor: "#c59a54", beams: true, seed: 4 }),
  pergola: () => room({ wall: "#e9eadb", accent: "#5d7a52", throwColor: "#6f8a5b", vine: true, seed: 5 }),
  frutteto: () => room({ wall: "#f3e6d3", accent: "#a5643b", throwColor: "#d98d5b", view: "hills", seed: 6 }),
  torretta: () => room({ wall: "#eee6d6", accent: "#5b4630", throwColor: "#4f6b47", round: true, seed: 7 }),
  sentieri: walk,
  lago: lake,
  borgo: village,
};
