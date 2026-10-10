// Arcadi Ristrutturazioni: the same rooms before and after the works.
import * as k from "./kit.mjs";
const { W, H, rect, path, line, circle, ellipse, linear } = k;
const FLOOR = 780;
const ORANGE = "#e8611a";

function shadowFloor(defs) {
  const g = linear([[0, "#000", 0.16], [1, "#000", 0]]);
  defs.push(g.def);
  return rect(0, FLOOR, W, 60, g.url);
}

/* ---------------- Bathroom ---------------- */
function bathAfter({ tub = false, wallTop = "#e9e6e0", tile = "#d6d3cc", floor = "#8f8d88", wood = "#b98a5e" } = {}) {
  const defs = [];
  let b = rect(0, 0, W, H, wallTop);
  b += k.tiles(0, 380, W, FLOOR - 380, tile, "#c4c0b8", 120, { sizeY: 60, offset: true, jitter: 0.04 });
  b += k.tiles(0, FLOOR, W, H - FLOOR, floor, "#7b7975", 200, { sizeY: 70, jitter: 0.05, seed: 8 });
  const win = k.windowView(150, 110, 300, 240, { view: "city", seed: 4 });
  defs.push(win.defs);
  b += win.svg;
  b += k.lightShaft(150, 450, 350, FLOOR, 200, 0.12);
  if (tub) {
    b += rect(820, 600, 640, 180, "#f7f6f2", `rx="22"`);
    b += rect(820, 600, 640, 22, "#ffffff", `rx="11"`);
    b += rect(1360, 470, 10, 130, "#9a9a9a") + rect(1330, 470, 50, 10, "#9a9a9a", `rx="5"`);
    b += rect(840, 780, 600, 10, "#000", `opacity="0.12"`);
  } else {
    // walk-in shower: glass, rain head, niche
    b += rect(1040, 380, 520, 400, "#bcc6c4");
    b += k.tiles(1040, 380, 520, 400, "#c3cbc9", "#aeb8b5", 60, { sizeY: 120, seed: 4 });
    const glass = linear([[0, "#e6f1f3", 0.5], [0.5, "#ffffff", 0.15], [1, "#e6f1f3", 0.45]], { x2: 1, y2: 0.3 });
    defs.push(glass.def);
    b += rect(1040, 170, 14, 610, "#7a7a7a") + rect(1054, 170, 230, 610, glass.url) + line(1080, 220, 1180, 700, "#fff", 6, `opacity="0.5"`);
    b += rect(1420, 160, 8, 140, "#6a6a6a") + rect(1350, 290, 150, 10, "#6a6a6a", `rx="5"`) + rect(1380, 300, 90, 14, "#5a5a5a", `rx="6"`);
    b += rect(1440, 470, 100, 80, "#a9b3b0") + rect(1452, 500, 22, 50, ORANGE, `rx="4"`) + rect(1482, 492, 20, 58, "#f2f0ea", `rx="4"`);
  }
  // vanity + mirror
  const mir = linear([[0, "#dfe6e8"], [1, "#b9c4c7"]], { x2: 1, y2: 1 });
  defs.push(mir.def);
  b += rect(560, 150, 300, 330, "#3b3b3b", `rx="150"`) + rect(570, 160, 280, 310, mir.url, `rx="140"`);
  b += line(600, 230, 700, 180, "#fff", 8, `opacity="0.5" stroke-linecap="round"`);
  b += rect(520, 560, 380, 120, wood, `rx="6"`) + line(710, 572, 710, 668, "#8b6440", 3);
  b += rect(560, 535, 300, 30, "#fbfbf8", `rx="12"`) + rect(700, 495, 8, 45, "#6a6a6a") + rect(700, 495, 40, 8, "#6a6a6a");
  b += rect(540, 680, 340, 10, "#000", `opacity="0.08"`);
  // towel rail with orange towel
  b += rect(930, 430, 70, 6, "#6a6a6a") + rect(940, 436, 50, 150, ORANGE, `rx="6"`) + rect(940, 560, 50, 8, "#c94f12");
  b += k.plant(470, 720, 0.75, "#efece6");
  b += shadowFloor(defs);
  return { defs, b };
}

function bathBefore({ tub = false } = {}) {
  const defs = [];
  let b = rect(0, 0, W, H, "#cfc8bb");
  // plaster patches and old pink tiles
  b += k.bricks(0, 300, 760, FLOOR - 300, 11);
  b += k.tiles(760, 380, W - 760, FLOOR - 380, "#e7c0b6", "#d1a79c", 60, { seed: 2, jitter: 0.06 });
  // broken tile edge
  b += path("M760 380 L820 420 L800 470 L860 520 L830 600 L900 650 L860 720 L900 780 L760 780 Z", "#b8afa2");
  b += path("M1300 380 L1380 430 L1460 400 L1560 460 L1600 420 L1600 380 Z", "#b8afa2");
  b += rect(0, 0, W, 300, "#d8d1c4") + path("M0 300 Q200 280 400 310 T760 300 V320 H0 Z", "#c4bcae");
  // patch marks, damp stain
  b += ellipse(1240, 200, 160, 90, "#b9ae98", `opacity="0.5"`) + ellipse(300, 160, 120, 60, "#c0b6a4", `opacity="0.45"`);
  // pipes
  b += line(620, 300, 620, 560, "#b87333", 12, `stroke-linecap="round"`) + line(660, 330, 660, 560, "#b87333", 12, `stroke-linecap="round"`);
  b += line(620, 560, 700, 560, "#b87333", 12, `stroke-linecap="round"`) + circle(700, 560, 12, "#8f5a28");
  b += line(1460, 140, 1460, 420, "#9aa0a3", 14) + rect(1430, 410, 60, 30, "#7d8285");
  // cables
  b += path("M300 0 C320 80 260 120 300 200 S280 300 320 340", "none", `stroke="#222" stroke-width="5"`);
  b += rect(270, 330, 70, 60, "#9aa0a3") + circle(305, 360, 10, "#555");
  const win = k.windowView(150, 110, 300, 240, { view: "city", seed: 4, frame: "#a68b63", light: false });
  defs.push(win.defs);
  b += win.svg + line(150, 110, 450, 350, "#e0d6a8", 10, `opacity="0.85"`) + line(450, 110, 150, 350, "#e0d6a8", 10, `opacity="0.85"`);
  // raw screed floor
  b += rect(0, FLOOR, W, H - FLOOR, "#a8a196");
  b += k.rubble(560, 900, 3, 26) + k.rubble(1200, 960, 5, 20);
  if (tub) b += rect(880, 640, 520, 140, "#e5dcc8", `rx="16"`) + rect(880, 640, 520, 18, "#efe8d8", `rx="9"`) + path("M1000 660 L1060 700 L1030 740", "none", `stroke="#9a8f7c" stroke-width="4"`);
  b += k.bucket(1120, 950) + k.sack(1380, 960) + k.sack(1480, 975, "#cfc3a8");
  b += k.ladder(860, 380, 420);
  b += shadowFloor(defs);
  return { defs, b };
}

/* ---------------- Kitchen ---------------- */
function kitchenAfter() {
  const defs = [];
  let b = rect(0, 0, W, H, "#ecebe6");
  b += planks(0, FLOOR, W, H - FLOOR, "#c39a6b", 3);
  const win = k.windowView(1180, 120, 300, 300, { view: "city", seed: 6 });
  defs.push(win.defs);
  b += win.svg + k.lightShaft(1180, 1480, 420, FLOOR, -260, 0.1);
  // backsplash
  b += k.tiles(120, 430, 1000, 170, "#e6e2da", "#d2cdc3", 50, { sizeY: 25, offset: true, seed: 6 });
  // upper cabinets
  b += rect(120, 140, 1000, 250, "#f5f4f0") + [0, 1, 2, 3].map((i) => line(120 + i * 250, 140, 120 + i * 250, 390, "#dcdad3", 3)).join("");
  b += rect(120, 390, 1000, 8, "#000", `opacity="0.06"`);
  // hood
  b += path("M520 140 L720 140 L700 300 L540 300 Z", "#3f4447");
  // lower cabinets
  b += rect(120, 620, 1000, 160, "#2f4a43");
  b += [0, 1, 2, 3].map((i) => line(120 + i * 250, 640, 120 + i * 250, 780, "#253b35", 4) + rect(150 + i * 250, 650, 80, 6, "#c8a46b", `rx="3"`)).join("");
  b += rect(100, 596, 1040, 26, "#dcd8cf") + rect(100, 620, 1040, 6, "#000", `opacity="0.1"`);
  b += rect(540, 588, 160, 10, "#222", `rx="4"`) + circle(580, 592, 4, "#555") + circle(660, 592, 4, "#555");
  b += rect(880, 540, 90, 56, "#e4e1d9", `rx="4"`) + rect(930, 520, 6, 26, "#777");
  b += k.plant(1000, 596, 0.45, "#f2efe8");
  b += k.pendant(1300, 0, 470, "#2b2b2b") + k.pendant(1460, 0, 430, ORANGE);
  // island stools
  b += rect(1240, 640, 300, 26, "#dcd8cf") + rect(1260, 666, 260, 114, "#2f4a43");
  b += shadowFloor(defs);
  return { defs, b };
}
function planks(...a) {
  return k.planks(...a);
}

function kitchenBefore() {
  const defs = [];
  let b = rect(0, 0, W, H, "#d6d0c3");
  // ghost outlines of removed cabinets
  b += rect(120, 140, 1000, 250, "none", `stroke="#bfb6a5" stroke-width="6" stroke-dasharray="2 0"`);
  b += rect(120, 140, 1000, 250, "#cbc3b3", `opacity="0.5"`);
  b += k.tiles(120, 430, 520, 170, "#d8c58f", "#bfae7b", 40, { seed: 9, jitter: 0.08 });
  b += path("M640 430 L700 470 L660 520 L720 600 L640 600 Z", "#c2b8a4");
  b += rect(120, 620, 1000, 160, "#b9b0a0") + path("M120 620 L1120 620", "none", `stroke="#9d9484" stroke-width="5" stroke-dasharray="20 14"`);
  // hanging cables, sockets
  b += path("M600 0 C620 60 580 100 610 160", "none", `stroke="#222" stroke-width="5"`) + circle(610, 168, 10, "#333");
  b += rect(840, 470, 60, 60, "#9aa0a3") + path("M870 530 C880 600 850 640 900 700", "none", `stroke="#222" stroke-width="5"`);
  b += line(300, 600, 300, 780, "#b87333", 10) + line(340, 620, 340, 780, "#9aa0a3", 10);
  const win = k.windowView(1180, 120, 300, 300, { view: "city", seed: 6, frame: "#a68b63", light: false });
  defs.push(win.defs);
  b += win.svg + rect(1180, 120, 300, 300, "#e9e3c9", `opacity="0.55"`);
  b += rect(0, FLOOR, W, H - FLOOR, "#a8a196") + k.rubble(500, 920, 12, 20);
  b += k.ladder(1240, 360, 420) + k.bucket(820, 960, "#e3e1dc", "#3b6aa0") + k.sack(1050, 975);
  b += rect(160, 860, 120, 90, "#d9d4c9") + rect(160, 860, 120, 16, "#6b8fb3");
  b += shadowFloor(defs);
  return { defs, b };
}

/* ---------------- Living room ---------------- */
function livingAfter() {
  const defs = [];
  let b = rect(0, 0, W, H, "#e8e5df");
  b += k.planks(0, FLOOR, W, H - FLOOR, "#b8875a", 7);
  const win = k.windowView(220, 100, 520, 560, { view: "city", seed: 9 });
  defs.push(win.defs);
  b += win.svg + k.lightShaft(220, 740, 660, H, 340, 0.16);
  b += rect(180, 80, 20, 640, "#d9d2c5") + rect(760, 80, 20, 640, "#d9d2c5");
  // sofa
  b += rect(860, 560, 560, 150, "#5d6f62", `rx="18"`) + rect(860, 520, 560, 90, "#6b7e70", `rx="22"`);
  b += rect(840, 580, 60, 150, "#52645a", `rx="16"`) + rect(1380, 580, 60, 150, "#52645a", `rx="16"`);
  b += rect(930, 545, 120, 70, ORANGE, `rx="14"`) + rect(1240, 545, 120, 70, "#e6dcc7", `rx="14"`);
  b += rect(880, 730, 20, 50, "#3b3b3b") + rect(1380, 730, 20, 50, "#3b3b3b");
  // rug + table
  b += ellipse(1130, 880, 420, 70, "#d9cbb2");
  b += rect(1010, 780, 240, 18, "#3d3a36", `rx="8"`) + rect(1030, 798, 10, 60, "#3d3a36") + rect(1220, 798, 10, 60, "#3d3a36");
  // art and shelf
  b += rect(980, 200, 300, 220, "#f7f5f0") + rect(1000, 220, 260, 180, "#c7cfc3") + path("M1000 400 L1090 300 L1160 360 L1210 320 L1260 400 Z", "#7f927a") + circle(1200, 270, 22, "#e9c46a");
  b += rect(1470, 160, 110, 560, "#d1c6b3") + [260, 400, 540].map((y) => rect(1470, y, 110, 10, "#b8aa92")).join("");
  b += rect(1490, 210, 20, 50, "#2f4a43") + rect(1515, 220, 18, 40, ORANGE) + circle(1540, 370, 24, "#e6dcc7");
  b += k.plant(820, 770, 0.9, "#e9e4da");
  b += shadowFloor(defs);
  return { defs, b };
}
function livingBefore() {
  const defs = [];
  let b = rect(0, 0, W, H, "#d3ccbf");
  b += ellipse(1150, 300, 260, 140, "#c4bba9", `opacity="0.6"`) + rect(980, 200, 300, 220, "none", `stroke="#bdb3a1" stroke-width="5"`);
  // chased walls for cables
  b += line(900, 0, 900, 500, "#a99f8c", 18) + line(900, 500, 1400, 500, "#a99f8c", 18);
  b += path("M900 0 L900 500 L1400 500", "none", `stroke="#222" stroke-width="4"`);
  const win = k.windowView(220, 100, 520, 560, { view: "city", seed: 9, frame: "#a68b63", light: false });
  defs.push(win.defs);
  b += win.svg + rect(220, 100, 520, 560, "#efe9cf", `opacity="0.5"`) + line(220, 100, 740, 660, "#d4c58d", 8) + line(740, 100, 220, 660, "#d4c58d", 8);
  b += rect(0, FLOOR, W, H - FLOOR, "#aaa398") + k.rubble(1100, 900, 21, 24);
  b += k.sack(1300, 960) + k.sack(1420, 960, "#cfc3a8") + k.sack(1360, 880, "#ddd3bd");
  b += k.ladder(860, 360, 420);
  // wheelbarrow
  b += path("M420 860 L640 860 L600 940 L460 940 Z", "#4c6e8a") + circle(530, 960, 26, "#2e2e2e") + line(640, 870, 760, 900, "#555", 8);
  b += shadowFloor(defs);
  return { defs, b };
}

/* ---------------- Window fitting ---------------- */
function windowAfter() {
  const defs = [];
  let b = rect(0, 0, W, H, "#eae7e1");
  b += k.planks(0, FLOOR, W, H - FLOOR, "#c29d74", 11);
  const win = k.windowView(450, 90, 700, 640, { view: "city", seed: 12, frame: "#3f4447", frameW: 18 });
  defs.push(win.defs);
  b += win.svg + k.lightShaft(450, 1150, 730, H, 260, 0.16);
  b += rect(430, 730, 740, 24, "#d5d0c6") + rect(430, 754, 740, 8, "#000", `opacity="0.08"`);
  // curtains
  b += path("M360 60 Q390 400 350 780 L420 780 Q440 400 420 60 Z", "#efe8dc") + path("M1180 60 Q1160 400 1190 780 L1250 780 Q1270 400 1240 60 Z", "#efe8dc");
  b += rect(330, 52, 940, 10, "#3f4447", `rx="5"`);
  b += k.plant(1350, 770, 1, "#e7e1d6") + rect(100, 520, 160, 260, "#2f4a43", `rx="6"`) + rect(120, 470, 40, 50, ORANGE, `rx="4"`);
  b += shadowFloor(defs);
  return { defs, b };
}
function windowBefore() {
  const defs = [];
  let b = rect(0, 0, W, H, "#d2cbbe");
  b += k.planks(0, FLOOR, W, H - FLOOR, "#9d8466", 11);
  b += rect(0, FLOOR, W, H - FLOOR, "#8a7b66", `opacity="0.35"`);
  const win = k.windowView(450, 90, 700, 640, { view: "city", seed: 12, frame: "#8b6b47", frameW: 26, light: false });
  defs.push(win.defs);
  b += win.svg + rect(450, 90, 700, 640, "#d9d3bd", `opacity="0.55"`);
  // peeling paint, cracked glass, tape
  for (let i = 0; i < 14; i++) b += rect(450 + ((i * 97) % 690), 90 + ((i * 53) % 620), 26, 10, "#d8c9a8", `opacity="0.9"`);
  b += path("M600 200 L680 300 L650 380 L720 460", "none", `stroke="#fff" stroke-width="3"`);
  b += line(820, 160, 1060, 360, "#c9b26a", 14, `opacity="0.85"`) + line(1060, 160, 820, 360, "#c9b26a", 14, `opacity="0.85"`);
  // broken shutter
  b += path("M1160 90 L1300 120 L1290 740 L1160 730 Z", "#5f7a59") + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => line(1165, 120 + i * 52, 1292, 140 + i * 52, "#4b6346", 5)).join("");
  b += k.rubble(800, 940, 41, 12) + k.bucket(300, 960) + k.ladder(1350, 360, 420);
  b += shadowFloor(defs);
  return { defs, b };
}

/* ---------------- Bedroom ---------------- */
function bedAfter() {
  const defs = [];
  let b = rect(0, 0, W, H, "#e6e1d8") + rect(0, 0, 640, H, "#7f927a");
  b += k.planks(0, FLOOR, W, H - FLOOR, "#b98d62", 13);
  const win = k.windowView(1080, 140, 380, 420, { view: "city", seed: 14 });
  defs.push(win.defs);
  b += win.svg + k.lightShaft(1080, 1460, 560, H, -300, 0.12);
  b += rect(220, 380, 760, 220, "#c9b79a", `rx="10"`);
  b += rect(200, 560, 820, 170, "#f4f1ea", `rx="16"`) + rect(200, 640, 820, 90, "#d7cdb9", `rx="12"`);
  b += rect(260, 520, 200, 70, "#fbfaf6", `rx="18"`) + rect(500, 520, 200, 70, "#fbfaf6", `rx="18"`) + rect(740, 530, 180, 60, ORANGE, `rx="16"`);
  b += rect(40, 600, 130, 130, "#d1c6b3") + circle(105, 560, 30, "#f3e7c4") + rect(100, 560, 10, 40, "#777");
  b += rect(240, 730, 20, 50, "#6a5641") + rect(960, 730, 20, 50, "#6a5641");
  b += shadowFloor(defs);
  return { defs, b };
}
function bedBefore() {
  const defs = [];
  let b = rect(0, 0, W, H, "#cfc7b9") + rect(0, 0, 640, H, "#c0b6a2");
  b += path("M0 200 L640 260 L640 300 L0 240 Z", "#b3a892");
  b += k.bricks(640, 600, 400, 180, 15);
  const win = k.windowView(1080, 140, 380, 420, { view: "city", seed: 14, frame: "#a68b63", light: false });
  defs.push(win.defs);
  b += win.svg + rect(1080, 140, 380, 420, "#e9e3c9", `opacity="0.55"`);
  b += rect(0, FLOOR, W, H - FLOOR, "#a8a196") + k.rubble(400, 900, 51, 20);
  b += k.sack(900, 960) + k.ladder(200, 360, 420) + k.bucket(1300, 950);
  b += path("M700 0 C720 80 680 140 720 220", "none", `stroke="#222" stroke-width="5"`) + circle(720, 228, 10, "#333");
  b += shadowFloor(defs);
  return { defs, b };
}

/* ---------------- Hero: finished apartment, wide ---------------- */
function hero() {
  const s = livingAfter();
  return s;
}

export const arcadi = {
  "hero": () => hero(),
  "bagno-dopo": () => bathAfter(),
  "bagno-prima": () => bathBefore(),
  "cucina-dopo": () => kitchenAfter(),
  "cucina-prima": () => kitchenBefore(),
  "soggiorno-dopo": () => livingAfter(),
  "soggiorno-prima": () => livingBefore(),
  "infissi-dopo": () => windowAfter(),
  "infissi-prima": () => windowBefore(),
  "vasca-dopo": () => bathAfter({ tub: true, wallTop: "#e3e6e4", tile: "#cdd6d4", floor: "#6f6c67" }),
  "vasca-prima": () => bathBefore({ tub: true }),
  "camera-dopo": () => bedAfter(),
  "camera-prima": () => bedBefore(),
};
