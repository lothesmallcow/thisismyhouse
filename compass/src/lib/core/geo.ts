// Offline location lookup and distance from home: Italian municipalities (comuni, data/comuni.json,
// ADR 0007) and towns of the UK, Germany and France (GeoNames, data/world/places.json, ADR 0018).
// No network.

import comuniData from "../../../data/comuni.json";
import worldData from "../../../data/world/places.json";
import { fold } from "./text";

export type CountryCode = "IT" | "GB" | "DE" | "FR";
export const COUNTRIES: { code: CountryCode; name: string; adzuna: string; lang: "it" | "en" | "de" | "fr" }[] = [
  { code: "IT", name: "Italia", adzuna: "it", lang: "it" },
  { code: "GB", name: "Regno Unito", adzuna: "gb", lang: "en" },
  { code: "DE", name: "Germania", adzuna: "de", lang: "de" },
  { code: "FR", name: "Francia", adzuna: "fr", lang: "fr" },
];
export const countryName = (c: string) => COUNTRIES.find((x) => x.code === c)?.name ?? c;

export interface Place {
  name: string;
  /** Italian province code ("TO"); empty abroad. */
  province: string;
  lat: number;
  lng: number;
  country: CountryCode;
  region: string;
  /** Thousands of inhabitants (abroad only; 0 = unknown). */
  pop?: number;
}

/** Italian regions by province code. */
const REGION_PROVINCES: Record<string, string> = {
  Piemonte: "TO VC NO CN AT AL BI VB",
  "Valle d'Aosta": "AO",
  Lombardia: "VA CO SO MI BG BS PV CR MN LC LO MB",
  "Trentino-Alto Adige": "BZ TN",
  Veneto: "VR VI BL TV VE PD RO",
  "Friuli-Venezia Giulia": "UD GO TS PN",
  Liguria: "IM SV GE SP",
  "Emilia-Romagna": "PC PR RE MO BO FE RA FC RN",
  Toscana: "MS LU PT FI LI PI AR SI GR PO",
  Umbria: "PG TR",
  Marche: "PU AN MC AP FM",
  Lazio: "VT RI RM LT FR",
  Abruzzo: "AQ TE PE CH",
  Molise: "CB IS",
  Campania: "CE BN NA AV SA",
  Puglia: "FG BA TA BR LE BT",
  Basilicata: "PZ MT",
  Calabria: "CS CZ RC KR VV",
  Sicilia: "TP PA ME AG CL EN CT RG SR",
  Sardegna: "SS NU CA OR SU",
};
const PROVINCE_REGION = new Map(Object.entries(REGION_PROVINCES).flatMap(([r, ps]) => ps.split(" ").map((p) => [p, r] as const)));
export const regionOfProvince = (p: string) => PROVINCE_REGION.get(p) ?? "";

type World = Record<"GB" | "DE" | "FR", { regions: string[]; towns: [string, number, number, number, number][] }>;
const WORLD = worldData as unknown as World;

/** Regions per country, for the questionnaire. */
export function regionsOf(country: CountryCode): string[] {
  return country === "IT" ? Object.keys(REGION_PROVINCES) : WORLD[country].regions;
}

type Row = [string, string, number, number];

/** Other names → the dataset's name. Foreign cities by their Italian (and English) names. */
const ALIASES: Record<string, string> = {
  londra: "London",
  edimburgo: "Edinburgh",
  "monaco di baviera": "Munich",
  muenchen: "Munich",
  munchen: "Munich",
  "münchen": "Munich",
  francoforte: "Frankfurt am Main",
  frankfurt: "Frankfurt am Main",
  berlino: "Berlin",
  amburgo: "Hamburg",
  colonia: "Köln",
  cologne: "Köln",
  koln: "Köln",
  norimberga: "Nürnberg",
  nuremberg: "Nürnberg",
  stoccarda: "Stuttgart",
  dusseldorf: "Düsseldorf",
  duesseldorf: "Düsseldorf",
  dresda: "Dresden",
  lipsia: "Leipzig",
  hanover: "Hannover",
  annover: "Hannover",
  brema: "Bremen",
  parigi: "Paris",
  lione: "Lyon",
  marsiglia: "Marseille",
  nizza: "Nice",
  tolosa: "Toulouse",
  strasburgo: "Strasbourg",
  lilla: "Lille",
  "la defense": "Puteaux",
  "la défense": "Puteaux",
  milan: "Milano",
  turin: "Torino",
  rome: "Roma",
  florence: "Firenze",
  naples: "Napoli",
  venice: "Venezia",
  genoa: "Genova",
  padua: "Padova",
  mantua: "Mantova",
  leghorn: "Livorno",
  syracuse: "Siracusa",
};

const keyOf = (s: string) => fold(s).replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();

let index: Map<string, Place[]> | null = null;
let foreign: Map<string, Place[]> | null = null;
let maxWords = 1;

function getIndex(): Map<string, Place[]> {
  if (index) return index;
  index = new Map();
  for (const [name, province, lat, lng] of comuniData as Row[]) {
    const place: Place = { name, province, lat, lng, country: "IT", region: regionOfProvince(province) };
    // "Bolzano/Bozen" is indexed under both names.
    for (const variant of name.split("/")) {
      const key = keyOf(variant);
      maxWords = Math.max(maxWords, key.split(" ").length);
      const list = index.get(key) ?? [];
      list.push(place);
      index.set(key, list);
    }
  }
  return index;
}

function getForeign(): Map<string, Place[]> {
  if (foreign) return foreign;
  foreign = new Map();
  for (const cc of ["GB", "DE", "FR"] as const) {
    const { regions, towns } = WORLD[cc];
    for (const [name, r, lat, lng, pop] of towns) {
      const place: Place = { name, province: "", lat, lng, country: cc, region: regions[r] ?? "", pop };
      const key = keyOf(name);
      maxWords = Math.max(maxWords, key.split(" ").length);
      const list = foreign.get(key) ?? [];
      list.push(place); // towns are sorted by population: the biggest namesake comes first
      foreign.set(key, list);
    }
  }
  return foreign;
}

/** Words that name a country (or a big city) in a location string. */
const COUNTRY_HINTS: [CountryCode, RegExp][] = [
  ["GB", /\b(uk|u\.k\.|united kingdom|regno unito|england|inghilterra|scotland|scozia|wales|galles|great britain|gran bretagna|northern ireland|londra|london)\b/i],
  ["DE", /\b(germany|germania|deutschland|bayern|baviera|berlin|berlino)\b/i],
  ["FR", /\b(france|francia|ile de france|île-de-france|paris|parigi)\b/i],
  ["IT", /\b(italia|italy|italien)\b/i],
];
/** Town names that are also common words: matched abroad only when the country is named. */
const AMBIGUOUS = new Set(["reading", "bath", "street", "march", "wells", "deal", "hope", "sale", "nice", "essen", "sens", "rain", "hof", "bury", "ware", "goch", "home", "worth", "mold", "ely", "par", "orange", "lens", "tours", "vertou", "sale", "hythe", "barking", "cheddar", "battle", "looe"]);

export interface FindOptions {
  /** Also look abroad (UK, Germany, France). Off when guessing from free text. Default true. */
  abroad?: boolean;
}

/**
 * Find the municipality mentioned in a free-text location such as "Torino (TO)",
 * "Moncalieri, Piemonte, Italia", "10024 Moncalieri TO" or "Milan, Lombardy".
 * Longest name wins ("San Mauro Torinese" over "Torino"); a province code breaks ties.
 */
export function findPlace(location: string | null | undefined, opts: FindOptions = {}): Place | null {
  if (!location) return null;
  const idx = getIndex();
  const clean = keyOf(location);
  const words = clean.split(" ");
  const provinceHint = location.match(/\(([A-Z]{2})\)|\b([A-Z]{2})\b/);
  const hint = provinceHint ? (provinceHint[1] ?? provinceHint[2]) : null;
  const abroad = opts.abroad !== false;
  const named = COUNTRY_HINTS.find(([, re]) => re.test(location))?.[0];
  const world = abroad ? getForeign() : null;

  const lookup = (key: string): Place | null => {
    const alias = ALIASES[key];
    const k = alias ? keyOf(alias) : key;
    const it = named && named !== "IT" ? undefined : idx.get(k);
    if (it) return it.length === 1 ? it[0] : (it.find((h) => h.province === hint) ?? it[0]);
    if (!world) return null;
    const out = world.get(k);
    if (!out) return null;
    const inNamed = named ? out.find((p) => p.country === named) : undefined;
    if (inNamed) return inNamed;
    // Without the country named: only real towns (5,000+ people), never words like "Reading".
    if (named || AMBIGUOUS.has(k)) return alias ? out[0] : null;
    return (out[0].pop ?? 0) >= 5 || alias ? out[0] : null;
  };
  for (let len = Math.min(maxWords, words.length); len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const key = words.slice(i, i + len).join(" ");
      if (len === 1 && key.length < 3) continue;
      const hit = lookup(key);
      if (hit) return hit;
    }
  }
  return null;
}

export function placeByName(name: string): Place | null {
  return findPlace(name);
}

/** Great-circle distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** Suggestions for a city field (Italy first, then abroad when `countries` include it). */
export function searchPlaces(prefix: string, limit = 8, countries: CountryCode[] = ["IT"]): Place[] {
  const p = fold(prefix).trim();
  if (p.length < 2) return [];
  const out: Place[] = [];
  if (countries.includes("IT")) {
    for (const [key, places] of getIndex()) {
      if (key.startsWith(p)) out.push(...places);
      if (out.length >= limit * 3) break;
    }
  }
  if (countries.some((c) => c !== "IT")) {
    for (const [key, places] of getForeign()) {
      if (key.startsWith(p)) out.push(...places.filter((x) => countries.includes(x.country)));
      if (out.length >= limit * 6) break;
    }
  }
  return out
    .sort((a, b) => Number(fold(b.name) === p) - Number(fold(a.name) === p) || a.name.localeCompare(b.name, "it"))
    .slice(0, limit);
}

/** The countries a person looks at: those chosen, else the country of their city (Italy by default). */
export function homeCountries(countries: string[], city?: string | null): CountryCode[] {
  const valid = countries.filter((c): c is CountryCode => COUNTRIES.some((x) => x.code === c));
  if (valid.length) return valid;
  return [(city ? findPlace(city)?.country : null) ?? "IT"];
}

/** The known town closest to a point (a click on the map), in these countries. */
export function nearestPlace(lat: number, lng: number, countries: CountryCode[] = ["IT", "GB", "DE", "FR"]): Place | null {
  let best: Place | null = null;
  let bestKm = Infinity;
  const consider = (p: Place) => {
    const d = distanceKm({ lat, lng }, p);
    if (d < bestKm) {
      best = p;
      bestKm = d;
    }
  };
  if (countries.includes("IT")) for (const list of getIndex().values()) for (const p of list) consider(p);
  if (countries.some((c) => c !== "IT")) for (const list of getForeign().values()) for (const p of list) if (countries.includes(p.country)) consider(p);
  return bestKm <= 60 ? best : null;
}
