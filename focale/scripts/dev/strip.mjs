// Make side-by-side strips from tall mobile screenshots: node strip.mjs out.png colHeight img1 img2 ...
import sharp from "sharp";
const [out, colH, ...files] = process.argv.slice(2);
const H = Number(colH);
const cols = [];
for (const f of files) {
  const m = await sharp(f).metadata();
  for (let top = 0; top < m.height; top += H) {
    const h = Math.min(H, m.height - top);
    cols.push(await sharp(f).extract({ left: 0, top, width: m.width, height: h }).toBuffer());
  }
}
const W = 390, gap = 10, per = 5;
for (let s = 0; s * per < cols.length; s++) {
  const part = cols.slice(s * per, s * per + per);
  const comp = part.map((b, i) => ({ input: b, left: i * (W + gap), top: 0 }));
  await sharp({ create: { width: part.length * (W + gap), height: H, channels: 3, background: "#888" } }).composite(comp).png().toFile(out.replace(".png", `-${s}.png`));
}
console.log(cols.length, "columns");
