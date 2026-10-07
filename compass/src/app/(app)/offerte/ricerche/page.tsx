import Link from "next/link";
import { Flash } from "@/components/flash";
import { Button, Empty, LinkButton, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { listSaved, MAX_SAVED } from "@/lib/server/saved-searches";
import { deleteSearchAction, searchAlertAction } from "../../actions";

export const metadata = { title: "Le tue ricerche" };

export default async function SavedSearchesPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const saved = await listSaved(getDb(), user.id);
  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader
        title="Le tue ricerche"
        description={`Le ricerche che hai salvato da Offerte (fino a ${MAX_SAVED}). Con l'avviso acceso ti scrivo quando arrivano offerte nuove, al massimo una e-mail all'ora.`}
        actions={
          <LinkButton href="/offerte" variant="secondary" size="sm">
            Torna alle offerte
          </LinkButton>
        }
      />
      {saved.length === 0 ? (
        <Empty title="Nessuna ricerca salvata">
          Cerca qualcosa in Offerte (per esempio &ldquo;impiegata amministrativa Torino part-time&rdquo;) e premi &ldquo;Salva ricerca&rdquo;.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {saved.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="min-w-0">
                <Link href={`/offerte/ricerche/${s.id}`} className="font-semibold">
                  {s.label}
                </Link>
                <p className="text-[13px] text-muted">
                  {s.fresh ? `${s.fresh} ${s.fresh === 1 ? "nuova" : "nuove"} dall'ultima volta` : "Nessuna nuova dall'ultima volta"}
                  {" · "}
                  {s.alert ? "avviso via e-mail acceso" : "avviso spento"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={searchAlertAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="alert" value={s.alert ? "0" : "1"} />
                  <Button variant="secondary" size="sm">
                    {s.alert ? "Spegni l'avviso" : "Accendi l'avviso"}
                  </Button>
                </form>
                <form action={deleteSearchAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button variant="secondary" size="sm" aria-label={`Togli la ricerca ${s.label}`}>
                    Togli
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
