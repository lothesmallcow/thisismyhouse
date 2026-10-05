import Link from "next/link";
import { findPlace, homeCountries, countryName } from "@/lib/core/geo";
import { getDb } from "@/lib/db";
import { getPrefs, listSectors } from "@/lib/server/catalog";
import { getProfile } from "@/lib/server/profile";

/** "Carriere: ... · Paesi: ..." above the offers, with the link to change them. */
export async function CareersLine({ userId }: { userId: number }) {
  const db = getDb();
  const [p, sectors, prefs] = await Promise.all([getProfile(db, userId), listSectors(db, userId), getPrefs(db, userId)]);
  const careers = sectors.filter((s) => prefs.sectors.get(s.id) === "like").map((s) => s.name);
  const places = homeCountries(p.countries, p.city).map((cc) => {
    const city = [p.city, ...p.extraPlaces].find((x) => x && findPlace(x)?.country === cc);
    return city ? `${countryName(cc)} (${city})` : countryName(cc);
  });
  return (
    <p className="mb-4 text-[13px] text-muted">
      <span className="text-ink">Carriere:</span> {careers.length ? careers.join(", ") : "nessuna scelta"} (<Link href="/profilo/posizioni">cambia</Link>) · <span className="text-ink">Dove:</span> {places.join(", ")} (
      <Link href="/profilo/dove">cambia</Link>)
    </p>
  );
}
