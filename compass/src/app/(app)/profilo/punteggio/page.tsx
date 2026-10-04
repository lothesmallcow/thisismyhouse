import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { Button, Card, PageHeader } from "@/components/ui";
import { WeightSliders } from "@/components/weight-sliders";
import { AREA_LABELS, FIT_AREAS, defaultWeights } from "@/lib/core/fit";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { saveWeightsAction } from "../../actions";

export const metadata = { title: "Punteggio" };

export default async function PunteggioPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const p = await getProfile(getDb(), user.id);
  const defaults = defaultWeights(p.track);
  const current = { ...defaults, ...(p.fitWeights ?? {}) } as Record<string, number>;
  const custom = p.fitWeights != null;
  return (
    <>
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader
        title="Punteggio"
        description="Ogni offerta ha un punteggio su 100: la media pesata di sette parti. Qui decidi quanto conta ciascuna. Non serve toccare niente: i valori di partenza vanno bene per quasi tutti."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <form action={saveWeightsAction} className="space-y-6">
            <WeightSliders areas={FIT_AREAS.map((a) => ({ key: a, name: AREA_LABELS[a].name, hint: AREA_LABELS[a].hint, value: Math.round(current[a] / 5) }))} />
            <div className="flex flex-wrap gap-2">
              <Button>Salva e ricalcola</Button>
              {custom && (
                <Button name="reset" value="1" variant="secondary">
                  Torna ai valori di partenza
                </Button>
              )}
            </div>
          </form>
        </Card>
        <aside className="space-y-3 text-[13px] text-muted">
          <Card className="!p-4">
            <p className="font-semibold text-ink">Come funziona</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              <li>Ogni parte va da 0 a 100; 50 vuol dire che l&apos;annuncio non lo dice.</li>
              <li>Alcune cose valgono sempre: un ruolo del tutto diverso, un annuncio sospetto o un&apos;azienda da evitare non arrivano mai in cima.</li>
              <li>Molto adatta da 70 in su, Adatta da 52.</li>
            </ul>
          </Card>
          <p>{custom ? "Stai usando i tuoi pesi." : "Stai usando i valori di partenza."}</p>
        </aside>
      </div>
    </>
  );
}
