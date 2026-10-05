import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { PlacesPicker } from "@/components/places-picker";
import { Button, Card, PageHeader } from "@/components/ui";
import { placesFromProfile } from "@/lib/core/where";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { saveWhereAction } from "../../actions";

export const metadata = { title: "Dove" };
export const maxDuration = 60;

/** Where to look: cities, regions or whole countries, as many as wanted. */
export default async function DovePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const p = await getProfile(getDb(), user.id);
  return (
    <div className="mx-auto max-w-2xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="Dove" description="Dove vuoi lavorare: una città, una regione o un paese intero. Puoi metterne quanti vuoi." />
      <form action={saveWhereAction}>
        <Card className="space-y-5">
          <PlacesPicker initial={placesFromProfile(p)} />
          <label className="flex min-h-11 items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="remote" value="1" defaultChecked={p.remoteOk} /> Va bene anche da remoto
          </label>
        </Card>
        <div className="mt-4">
          <Button>Salva e cerca</Button>
        </div>
      </form>
    </div>
  );
}
