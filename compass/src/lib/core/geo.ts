// Offline location lookup on Italian municipalities (comuni) and distance from home.
// No network: the dataset ships in data/comuni.json (see docs/adr/0007-offline-geodata.md).

import comuniData from "../../../data/comuni.json";
import { fold } from "./text";

export interface Place {
  name: string;
  province: string;
  lat: number;
  lng: number;
}

type Row = [string, string, number, number];

const ALIASES: Record<string, string> = {
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

let index: Map<string, Place[]> | null = null;
let maxWords = 1;

function getIndex(): Map<string, Place[]> {
  if (index) return index;
  index = new Map();
  for (const [name, province, lat, lng] of comuniData as Row[]) {
    const place = { name, province, lat, lng };
    // "Bolzano/Bozen" is indexed under both names.
    for (const variant of name.split("/")) {
      const key = fold(variant).replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
      maxWords = Math.max(maxWords, key.split(" ").length);
      const list = index.get(key) ?? [];
      list.push(place);
      index.set(key, list);
    }
  }
  return index;
}

/**
 * Find the municipality mentioned in a free-text location such as "Torino (TO)",
 * "Moncalieri, Piemonte, Italia", "10024 Moncalieri TO" or "Milan, Lombardy".
 * Longest name wins ("San Mauro Torinese" over "Torino"); a province code breaks ties.
 */
export function findPlace(location: string | null | undefined): Place | null {
  if (!location) return null;
  const idx = getIndex();
  const clean = fold(location).replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  const provinceHint = location.match(/\(([A-Z]{2})\)|\b([A-Z]{2})\b/);
  const hint = provinceHint ? (provinceHint[1] ?? provinceHint[2]) : null;

  for (let len = Math.min(maxWords, words.length); len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const key = words.slice(i, i + len).join(" ");
      if (len === 1 && key.length < 3) continue;
      const alias = ALIASES[key];
      const hits = idx.get(alias ? fold(alias) : key);
      if (!hits) continue;
      if (hits.length === 1) return hits[0];
      return hits.find((h) => h.province === hint) ?? hits[0];
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

/** Suggestions for the onboarding city field. */
export function searchPlaces(prefix: string, limit = 8): Place[] {
  const p = fold(prefix).trim();
  if (p.length < 2) return [];
  const out: Place[] = [];
  for (const [key, places] of getIndex()) {
    if (key.startsWith(p)) out.push(...places);
    if (out.length >= limit * 3) break;
  }
  return out
    .sort((a, b) => Number(fold(b.name) === p) - Number(fold(a.name) === p) || a.name.localeCompare(b.name, "it"))
    .slice(0, limit);
}
