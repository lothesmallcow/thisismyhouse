// Online geocoder FALLBACK for places missing from the offline comuni dataset (e.g. "Lingotto",
// a hamlet, a misspelling). OpenStreetMap Nominatim, within its usage policy: at most 1 request
// per second, honest User-Agent with contact, results cached forever, at most 10 per run.
// Off by default (settings.geocoderEnabled).
import { eq } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { getJson, type FetchLike } from "./http";

export const GEOCODE_MAX_PER_RUN = 10;

export async function geocode(db: DB, fetchImpl: FetchLike, place: string, sleep: (ms: number) => Promise<void>): Promise<{ lat: number; lng: number } | null> {
  const key = `geocode:${place.trim().toLowerCase()}`;
  const cached = await db.query.httpCache.findFirst({ where: eq(schema.httpCache.url, key) });
  if (cached) return cached.body ? (JSON.parse(cached.body) as { lat: number; lng: number }) : null;
  await sleep(1100);
  const q = new URLSearchParams({ q: place, countrycodes: "it", format: "json", limit: "1" });
  const res = await getJson<{ lat: string; lon: string }[]>(fetchImpl, `https://nominatim.openstreetmap.org/search?${q}`);
  const hit = res[0] ? { lat: Number(res[0].lat), lng: Number(res[0].lon) } : null;
  const row = { url: key, etag: null, lastModified: null, body: hit ? JSON.stringify(hit) : "", status: 200, fetchedAt: new Date() };
  await db.insert(schema.httpCache).values(row).onConflictDoUpdate({ target: schema.httpCache.url, set: row });
  return hit;
}
