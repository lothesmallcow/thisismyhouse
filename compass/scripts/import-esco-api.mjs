// Every ESCO occupation (about 3,000) from the ESCO web API (European Commission, free EU open data):
// names in Italian, English, German and French, the other names people use (Italian and English),
// the ISCO group and the skills each one needs. Writes data/world/occupations.json, which the
// questionnaire (precise roles), the searches (each country's language) and the career-change
// suggestions (occupations that share skills) read. Attribution: "ESCO, European Commission".
// Runs on GitHub Actions (.github/workflows/compass-data.yml): no key, about 20 minutes (any change here re-runs it).
//   node scripts/import-esco-api.mjs [--limit 50]
import fs from "node:fs";
import path from "node:path";

const API = "https://ec.europa.eu/esco/api";
const LANGS = ["it", "en", "de", "fr"];
const li = process.argv.indexOf("--limit");
const LIMIT = li >= 0 ? Number(process.argv[li + 1]) : Infinity;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      console.log(`HTTP ${res.status} (try ${i + 1})`);
    } catch (e) {
      console.log(`network error (try ${i + 1}): ${e.message}`);
    }
    await sleep(1000 * 2 ** i);
  }
  throw new Error(`gave up: ${url}`);
}

/** All occupation URIs, by paging the search (no text: everything). */
async function listOccupations() {
  const uris = new Set();
  for (let offset = 0; ; offset += 100) {
    const d = await get(`${API}/search?type=occupation&language=en&limit=100&offset=${offset}&full=false`);
    const results = d?._embedded?.results ?? [];
    if (offset === 0) console.log(`search: total ${d?.total ?? "?"}, first page ${results.length}`);
    for (const r of results) if (r.uri) uris.add(r.uri);
    if (!results.length || uris.size >= LIMIT || (d?.total && offset + 100 >= d.total)) break;
  }
  return [...uris].slice(0, LIMIT === Infinity ? undefined : LIMIT);
}

const label = (v, lang) => (typeof v === "string" ? v : v?.[lang] ?? null);
const labels = (v, lang) => {
  const x = v?.[lang];
  return Array.isArray(x) ? x.filter((s) => typeof s === "string") : [];
};

async function main() {
  const uris = await listOccupations();
  console.log(`occupations listed: ${uris.length}`);
  const skillIndex = new Map(); // skill uri -> index
  const skills = []; // [it label, en label]
  const skillId = (uri, it, en) => {
    if (!skillIndex.has(uri)) {
      skillIndex.set(uri, skills.length);
      skills.push([it ?? en ?? "", en ?? it ?? ""]);
    } else if (it && !skills[skillIndex.get(uri)][0]) skills[skillIndex.get(uri)][0] = it;
    return skillIndex.get(uri);
  };
  const out = [];
  let shapeLogged = false;
  const queue = [...uris];
  const worker = async () => {
    while (queue.length) {
      const uri = queue.shift();
      // Italian: the skill names in _links come in the language asked; English names from a second call are not needed.
      const d = await get(`${API}/resource/occupation?uri=${encodeURIComponent(uri)}&language=it`);
      if (!d) continue;
      if (!shapeLogged) {
        shapeLogged = true;
        console.log(`resource keys: ${Object.keys(d).join(",")}; links: ${Object.keys(d._links ?? {}).join(",")}`);
      }
      const pref = d.preferredLabel ?? {};
      const names = Object.fromEntries(LANGS.map((l) => [l, label(pref, l)]));
      if (!names.en) continue;
      const alt = d.alternativeLabel ?? d.alternativeLabels ?? {};
      const links = d._links ?? {};
      const ess = (links.hasEssentialSkill ?? []).map((s) => skillId(s.uri, s.title, null));
      const opt = (links.hasOptionalSkill ?? []).map((s) => skillId(s.uri, s.title, null));
      const isco = (links.broaderIscoGroup ?? []).map((g) => g.code ?? (g.uri ?? "").split("/").pop()).find(Boolean) ?? (d.code ?? "").split(".")[0] ?? "";
      out.push({
        id: uri.split("/").pop(),
        it: names.it ?? names.en,
        en: names.en,
        de: names.de ?? names.en,
        fr: names.fr ?? names.en,
        isco: String(isco).replace(/\D/g, "").slice(0, 4),
        alt: { it: labels(alt, "it").slice(0, 12), en: labels(alt, "en").slice(0, 12) },
        ess,
        opt: opt.slice(0, 40),
      });
      if (out.length % 250 === 0) console.log(`read ${out.length}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  out.sort((a, b) => a.en.localeCompare(b.en));
  const file = path.join(process.cwd(), "data/world/occupations.json");
  fs.writeFileSync(file, JSON.stringify({ source: "ESCO, European Commission (https://esco.ec.europa.eu)", fetchedAt: new Date().toISOString().slice(0, 10), skills, occupations: out }));
  console.log(`written: ${out.length} occupations, ${skills.length} skills, ${(fs.statSync(file).size / 1e6).toFixed(1)} MB`);
  if (out.length < 100 && LIMIT === Infinity) {
    console.log("too few occupations: something changed in the API");
    process.exit(1);
  }
}

await main();
