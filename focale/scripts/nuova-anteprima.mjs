// Create a new private pitch page entry.
// npm run nuova-anteprima -- --nome "Nome Attività" --settore "Impresa edile" --zona "Milano, Lambrate" --sito "https://..."
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomInt } from "node:crypto";

const args = process.argv.slice(2);
const get = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const nome = get("nome");
if (!nome) {
  console.error('Usage: npm run nuova-anteprima -- --nome "Nome Attività" [--settore "..."] [--zona "..."] [--sito "https://..."]');
  process.exit(1);
}
const settore = get("settore") ?? "";
const zona = get("zona") ?? "";
const sito = get("sito");

const kebab = nome
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/&/g, " e ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
let slug;
do {
  const rnd = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  slug = `${kebab}-${rnd}`;
} while (existsSync(new URL(`../src/content/anteprime/${slug}.yaml`, import.meta.url)));

const q = (s) => JSON.stringify(s);
const yaml = `# Pitch page for ${nome}. Set published: true when images, changes and note are ready.
businessName: ${q(nome)}
sector: ${q(settore)}
area: ${q(zona)}
${sito ? `currentSiteUrl: ${q(sito)}\n` : ""}# TODO: screenshot of their current site (desktop), e.g. ../../assets/anteprime/${slug}-prima.png
# beforeImage: ../../assets/anteprime/${slug}-prima.png
# TODO: screenshot of the new homepage on a phone (390 x 844), e.g. ../../assets/anteprime/${slug}-dopo.png
# afterImage: ../../assets/anteprime/${slug}-dopo.png
# Optional: link to the live preview
# afterUrl: https://...
changes:
  - "TODO: prima cosa che hai cambiato"
  - "TODO: seconda cosa che hai cambiato"
  - "TODO: terza cosa che hai cambiato"
note: "TODO: una riga personale per ${nome.replace(/"/g, "'")}"
published: false
`;
mkdirSync(new URL("../src/content/anteprime/", import.meta.url), { recursive: true });
mkdirSync(new URL("../src/assets/anteprime/", import.meta.url), { recursive: true });
const file = new URL(`../src/content/anteprime/${slug}.yaml`, import.meta.url);
writeFileSync(file, yaml);

let base = "https://IL-TUO-DOMINIO";
try {
  const { readFileSync } = await import("node:fs");
  const cfg = readFileSync(new URL("../src/config/site.ts", import.meta.url), "utf8");
  const m = /url:\s*"([^"]+)"/.exec(cfg);
  if (m && !m[1].startsWith("[DA COMPILARE")) base = m[1].replace(/\/$/, "");
} catch {}
console.log(`Created src/content/anteprime/${slug}.yaml`);
console.log(`Future URL: ${base}/anteprime/${slug}/`);
console.log("Next: add the two screenshots, write the three changes and the note, set published: true, rebuild.");
