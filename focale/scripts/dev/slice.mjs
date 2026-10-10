// node slice.mjs in.png prefix chunkHeight outWidth
import sharp from "sharp";
const [inp, prefix, ch = "1600", ow = "800"] = process.argv.slice(2);
const m = await sharp(inp).metadata();
const n = Math.ceil(m.height / Number(ch));
for (let i = 0; i < n; i++) {
  const top = i * Number(ch), h = Math.min(Number(ch), m.height - top);
  await sharp(inp).extract({ left: 0, top, width: m.width, height: h }).resize(Number(ow)).png().toFile(`${prefix}-${i}.png`);
}
console.log(n);
