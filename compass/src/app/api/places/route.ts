// Place suggestions for "Dove": countries, regions and cities matching what someone types. Offline data.
import { searchPlaces } from "@/lib/core/geo";
import { suggestPlaces } from "@/lib/core/where";
import { currentUser } from "@/lib/server/auth";

export async function GET(req: Request) {
  if (!(await currentUser())) return new Response("Non autorizzato", { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json(suggestPlaces(q, searchPlaces(q, 8, ["IT", "GB", "DE", "FR"])));
}
