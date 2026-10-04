// The large, generated part of the catalog (ADR 0018): listed companies of Italy, the UK, Germany
// and France, and every NACE Rev. 2.1 industry in four languages. Built by
// scripts/build-world-data.mjs into data/world/. Each entry is linked to the closest hand-made
// sector, so themes, suggestions and career paths work for it too.
import { fold } from "../core/text";
import type { CompanyKind } from "../db/schema";

/** [name, country, city, GICS sector, GICS industry, website, size 0-5 or -1] */
export type ListedRow = [string, string, string, string, string, string, number];
/** [code, level 1-4, it, en, de, fr] */
export type NaceRow = [string, number, string, string, string, string];

/** GICS industry (or sector) → closest hand-made sector and the kind of company. First match wins. */
const GICS: [RegExp, string, CompanyKind][] = [
  [/^banks|thrifts|mortgage/i, "banche-assicurazioni", "banca"],
  [/insurance/i, "banche-assicurazioni", "azienda"],
  [/capital markets|diversified financ|consumer finance|financial services|financials/i, "asset-management", "fondo"],
  [/real estate|reit/i, "immobiliare", "azienda"],
  [/textiles|apparel|luxury|consumer durables & apparel/i, "moda-lusso", "brand"],
  [/household durables|leisure products/i, "design", "brand"],
  [/personal products|household products|household & personal/i, "bellezza", "brand"],
  [/beverages|food|tobacco|food & staples/i, "food", "brand"],
  [/automobile|auto components/i, "auto", "brand"],
  [/hotels|restaurants|leisure|consumer services|airlines/i, "turismo", "azienda"],
  [/retail|distributors|internet & direct/i, "vendita", "azienda"],
  [/media|entertainment|interactive/i, "media", "azienda"],
  [/software|it services|semiconductor|technology hardware|communications equipment|electronic equipment|health care technology|telecommunication|information technology/i, "informatica", "azienda"],
  [/pharma|biotech|life sciences|health care/i, "sanita", "azienda"],
  [/construction|building products/i, "edilizia", "azienda"],
  [/professional services|commercial & professional|commercial services/i, "consulting", "consulenza"],
  [/transport|road & rail|air freight|logistics|marine|trading companies/i, "logistica", "azienda"],
  [/./, "energia-industria", "azienda"], // energy, utilities, materials, capital goods, aerospace...
];

export function gicsSector(sector: string, industry: string): { slug: string; kind: CompanyKind } {
  const text = industry || sector;
  const [, slug, kind] = GICS.find(([re]) => re.test(text)) ?? GICS[GICS.length - 1];
  return { slug, kind };
}

/** NACE division (or a more precise group/class prefix) → closest hand-made sector. */
const NACE_TO_SECTOR: Record<string, string> = {
  "01": "food", "02": "energia-industria", "03": "food",
  "05": "energia-industria", "06": "energia-industria", "07": "energia-industria", "08": "energia-industria", "09": "energia-industria",
  "10": "food", "11": "food", "12": "food",
  "13": "moda-lusso", "14": "moda-lusso", "15": "moda-lusso",
  "16": "design", "17": "energia-industria", "18": "media",
  "19": "energia-industria", "20": "energia-industria", "21": "sanita", "22": "energia-industria", "23": "energia-industria",
  "24": "energia-industria", "25": "energia-industria", "26": "informatica", "27": "energia-industria", "28": "energia-industria",
  "29": "auto", "30": "energia-industria", "30.1": "nautica", "31": "design",
  "32": "design", "32.1": "gioielli", "32.3": "sport", "32.5": "sanita", "33": "energia-industria",
  "35": "energia-industria", "36": "energia-industria", "37": "energia-industria", "38": "energia-industria", "39": "energia-industria",
  "41": "edilizia", "42": "edilizia", "43": "edilizia",
  "46": "vendita", "47": "vendita",
  "49": "logistica", "50": "logistica", "51": "turismo", "52": "logistica", "53": "logistica",
  "55": "ospitalita-lusso", "56": "ristorazione",
  "58": "media", "59": "media", "60": "media", "61": "informatica", "62": "informatica", "63": "informatica",
  "64": "banche-assicurazioni", "64.3": "asset-management", "65": "banche-assicurazioni", "66": "asset-management", "66.1": "markets",
  "68": "immobiliare",
  "69": "studi-professionali", "70": "consulting", "71": "studi-professionali", "72": "economics", "73": "media", "74": "design", "75": "sanita",
  "77": "vendita", "78": "studi-professionali", "79": "turismo", "80": "pulizie", "81": "pulizie", "82": "segreteria",
  "84": "amministrazione", "85": "scuola", "86": "sanita", "87": "sanita", "88": "sanita",
  "90": "arte-cultura", "91": "arte-cultura", "93": "sport", "96": "bellezza",
};

/** Closest hand-made sector for a NACE code ("14.13" → "moda-lusso"), most precise prefix first. */
export function naceSector(code: string): string | null {
  for (let n = code.length; n >= 2; n--) {
    const hit = NACE_TO_SECTOR[code.slice(0, n)];
    if (hit) return hit;
  }
  return null;
}

const STOP = new Set(
  "della delle degli dello dei del di da in per con su tra fra non altri altre altro altra prodotti prodotto attivita servizi servizio fabbricazione produzione commercio lavorazione articoli materiale materiali generi vari varie altrove classificate classificati nca n.c.a. other activities activity services service manufacture production products product trade sale related except n.e.c. similar and of the for with without".split(" "),
);

/** A few short words that identify the industry in a job title or text (Italian and English). */
export function naceKeywords(it: string, en: string): string[] {
  const words = fold(`${it} ${en}`)
    .replace(/[(),;:.’'"/-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP.has(w) && !/^\d/.test(w));
  return [...new Set(words)].slice(0, 6);
}

/** "LVMH Moët Hennessy - Louis Vuitton, SE" → ["LVMH"]: a leading acronym is how people call it. */
export function listedAliases(name: string): string[] {
  const first = name.split(/[\s,]+/)[0];
  return /^[A-Z0-9&]{3,6}$/.test(first) && first !== name ? [first] : [];
}

export const SIZE_LABELS = ["nano", "piccolissima", "piccola", "media", "grande", "molto grande"];
