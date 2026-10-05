// "Dove" as a list of places, each a city, a region or a whole country (no distances: we would not
// have that precision anyway). To and from the profile fields: city (the first city), other cities,
// regions ("IT:Lombardia") and countries.
import { COUNTRIES, findPlace, regionsOf, type CountryCode } from "./geo";

export type WhereKind = "città" | "regione" | "paese";
export interface WherePlace {
  kind: WhereKind;
  country: CountryCode;
  name: string;
}

export const placeValue = (p: WherePlace) => `${p.kind}|${p.country}|${p.name}`;

export function parsePlaceValue(v: string): WherePlace | null {
  const [kind, cc, ...rest] = v.split("|");
  const name = rest.join("|").trim().slice(0, 80);
  const country = COUNTRIES.find((c) => c.code === cc)?.code;
  if (!country || !name || !["città", "regione", "paese"].includes(kind)) return null;
  if (kind === "regione" && !regionsOf(country).includes(name)) return null;
  return { kind: kind as WhereKind, country, name };
}

/** The profile's places as a list (a country appears on its own only when nothing narrower is chosen in it). */
export function placesFromProfile(p: { city: string; extraPlaces: string[]; regions: string[]; countries: string[] }): WherePlace[] {
  const out: WherePlace[] = [];
  for (const name of [p.city, ...p.extraPlaces].filter(Boolean)) {
    const t = findPlace(name);
    if (t && !out.some((x) => x.kind === "città" && x.name === t.name)) out.push({ kind: "città", country: t.country, name: t.name });
  }
  for (const r of p.regions) {
    const country = COUNTRIES.find((c) => r.startsWith(`${c.code}:`))?.code;
    if (country) out.push({ kind: "regione", country, name: r.slice(3) });
  }
  for (const cc of p.countries) {
    const country = COUNTRIES.find((c) => c.code === cc)?.code;
    if (country && !out.some((x) => x.country === country)) out.push({ kind: "paese", country, name: COUNTRIES.find((c) => c.code === country)!.name });
  }
  return out;
}

/** The list back into profile fields. The first city is "your city"; the others are extra places. */
export function profileFromPlaces(places: WherePlace[]): { city: string; lat: number | null; lng: number | null; extraPlaces: string[]; regions: string[]; countries: string[] } {
  const cities = places.filter((x) => x.kind === "città");
  const home = cities[0] ? findPlace(cities[0].name) : null;
  return {
    city: home?.name ?? "",
    lat: home?.lat ?? null,
    lng: home?.lng ?? null,
    extraPlaces: cities.slice(1).map((x) => x.name).slice(0, 8),
    regions: [...new Set(places.filter((x) => x.kind === "regione").map((x) => `${x.country}:${x.name}`))].slice(0, 40),
    countries: [...new Set(places.map((x) => x.country))],
  };
}

/** Suggestions for what someone types: countries, then regions, then cities. */
export function suggestPlaces(q: string, cities: { name: string; country: CountryCode }[], limit = 10): WherePlace[] {
  const f = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const t = f(q.trim());
  if (t.length < 2) return [];
  const countries: WherePlace[] = COUNTRIES.filter((c) => f(c.name).startsWith(t) || f(c.code) === t).map((c) => ({ kind: "paese", country: c.code, name: c.name }));
  const regions: WherePlace[] = COUNTRIES.flatMap((c) => regionsOf(c.code).filter((r) => f(r).startsWith(t)).map((r) => ({ kind: "regione" as const, country: c.code, name: r })));
  const towns: WherePlace[] = cities.map((c) => ({ kind: "città", country: c.country, name: c.name }));
  return [...countries, ...regions, ...towns].slice(0, limit);
}
