// "Scarica il filtro per Gmail": the person's own forwarding filter, ready to import.
import { homeCountries } from "@/lib/core/geo";
import { gmailFilterXml, platformsFor } from "@/lib/core/platforms";
import { getDb } from "@/lib/db";
import { currentUser } from "@/lib/server/auth";
import { getPrefs, listSectors } from "@/lib/server/catalog";
import { personalInbox } from "@/lib/server/inbox";
import { getProfile } from "@/lib/server/profile";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "user") return new Response("Non autorizzato", { status: 401 });
  const db = getDb();
  const [p, address, sectors, prefs] = await Promise.all([getProfile(db, user.id), personalInbox(db, user.id), listSectors(db, user.id), getPrefs(db, user.id)]);
  if (!address) return new Response("Casella di Compass non configurata", { status: 404 });
  const careers = sectors.filter((s) => prefs.sectors.get(s.id) === "like").map((s) => s.slug);
  const body = gmailFilterXml(platformsFor(homeCountries(p.countries, p.city), p.track, careers), address);
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": 'attachment; filename="compass-filtro-gmail.xml"', "Cache-Control": "private, no-store" },
  });
}
