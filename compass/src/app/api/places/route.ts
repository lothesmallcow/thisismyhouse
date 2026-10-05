// Town suggestions for the "Dove" map: by name (?q=) or nearest to a click (?lat=&lng=). Offline data.
import { COUNTRIES, nearestPlace, searchPlaces, type CountryCode } from "@/lib/core/geo";
import { currentUser } from "@/lib/server/auth";

const ALL = COUNTRIES.map((c) => c.code);

export async function GET(req: Request) {
  if (!(await currentUser())) return new Response("Non autorizzato", { status: 401 });
  const url = new URL(req.url);
  const cc = (url.searchParams.get("cc") ?? "").split(",").filter((c): c is CountryCode => ALL.includes(c as CountryCode));
  const countries = cc.length ? cc : ALL;
  const pick = (p: { name: string; lat: number; lng: number; country: string; region: string }) => ({ name: p.name, lat: p.lat, lng: p.lng, country: p.country, region: p.region });
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (url.searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng)) {
    const p = nearestPlace(lat, lng, countries);
    return Response.json(p ? [pick(p)] : []);
  }
  return Response.json(searchPlaces(url.searchParams.get("q") ?? "", 8, countries).map(pick));
}
