import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { Button, Card, PageHeader } from "@/components/ui";
import { COUNTRIES, findPlace, homeCountries, regionsOf } from "@/lib/core/geo";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { saveWhereAction } from "../../actions";
import { WhereEditor, type Town } from "./editor";

export const metadata = { title: "Dove" };
export const maxDuration = 60;

const town = (name: string | null | undefined): Town | null => {
  const p = name ? findPlace(name) : null;
  return p ? { name: p.name, lat: p.lat, lng: p.lng, country: p.country } : null;
};

/** Where to look: main city and radius, other countries (each with a city), regions; on a map. */
export default async function DovePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const p = await getProfile(getDb(), user.id);
  const home = town(p.city);
  const countries = homeCountries(p.countries, p.city);
  const others = Object.fromEntries(p.extraPlaces.map(town).filter((t): t is Town => t != null).map((t) => [t.country, t]));
  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="Dove" description="Dove vuoi lavorare: la tua città con quanto lontano puoi andare, e altri paesi se ti interessano (ognuno con una città, se vuoi)." />
      <form action={saveWhereAction}>
        <Card>
          <WhereEditor home={home} km={p.maxKm} countries={countries} others={others}>
            <details className="rounded-lg border border-line px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-medium">Solo alcune regioni? (facoltativo)</summary>
              <p className="mt-1 text-[12.5px] text-faint">Se non scegli niente, va bene tutto il paese.</p>
              {COUNTRIES.map((c) => (
                <div key={c.code} className="mt-3">
                  <p className="text-[13px] font-medium">{c.name}</p>
                  <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {regionsOf(c.code).map((r) => (
                      <label key={r} className="flex min-h-8 items-center gap-2 text-[13px]">
                        <input type="checkbox" name="region" value={`${c.code}:${r}`} defaultChecked={p.regions.includes(`${c.code}:${r}`)} /> {r}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </details>
          </WhereEditor>
        </Card>
        <div className="mt-4">
          <Button>Salva e cerca</Button>
        </div>
      </form>
    </div>
  );
}
