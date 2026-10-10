// Renders the demo illustrations to src/assets/demo/{slug}/{name}.jpg
// Usage: node scripts/illustrations/render.mjs [slug] [name]
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { render } from "./kit.mjs";
import { arcadi } from "./arcadi.mjs";

const sets = { "arcadi-ristrutturazioni": arcadi };
try { sets["cascina-rovere"] = (await import("./cascina.mjs")).cascina; } catch (e) { if (!String(e).includes("Cannot find module")) throw e; }
try { sets["villa-ortensia"] = (await import("./villa.mjs")).villa; } catch (e) { if (!String(e).includes("Cannot find module")) throw e; }

const [onlySlug, onlyName] = process.argv.slice(2);
for (const [slug, scenes] of Object.entries(sets)) {
  if (onlySlug && slug !== onlySlug) continue;
  const dir = new URL(`../../src/assets/demo/${slug}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const [name, fn] of Object.entries(scenes)) {
    if (onlyName && name !== onlyName) continue;
    const { defs, b, opts } = fn();
    const svg = render(defs, b, opts);
    await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(new URL(`${name}.jpg`, dir).pathname);
    process.stdout.write(`${slug}/${name} `);
  }
}
console.log("\ndone");
