import { and, desc, eq } from "drizzle-orm";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { Button, Card, ChoiceRow, Field, PageHeader, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { getUserSettings } from "@/lib/server/settings";
import { saveSearchSettingsAction, toggleAdjustmentAction } from "../../actions";

export const metadata = { title: "Preferenze di ricerca" };

export default async function RicercaPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const p = await getProfile(db, user.id);
  const us = await getUserSettings(db, user.id);
  const adjustments = await db.select().from(schema.rankAdjustments).where(and(eq(schema.rankAdjustments.userId, user.id))).orderBy(desc(schema.rankAdjustments.createdAt));
  const focus = p.focus === "tutte" ? "tutte" : p.focusCompaniesOnly ? "aziende" : "preferite";
  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="Preferenze di ricerca" description="Cosa vedi in Offerte all'apertura. Puoi sempre cambiare i filtri dalla pagina delle offerte." />

      <form action={saveSearchSettingsAction} className="space-y-6">
        <Card className="space-y-2 !p-4">
          <p className="mb-1 text-[14px] font-semibold">Quali offerte vedere</p>
          <ChoiceRow type="radio" name="focus" value="tutte" defaultChecked={focus === "tutte"} hint="Le aziende e i settori scelti salgono in cima.">
            Tutte, con priorità alle mie scelte
          </ChoiceRow>
          <ChoiceRow type="radio" name="focus" value="preferite" defaultChecked={focus === "preferite"} hint="Solo offerte da aziende o settori scelti.">
            Solo le mie scelte
          </ChoiceRow>
          <ChoiceRow type="radio" name="focus" value="aziende" defaultChecked={focus === "aziende"} hint="Solo offerte dalle aziende scelte.">
            Solo le aziende scelte
          </ChoiceRow>
        </Card>
        <Card className="space-y-3 !p-4">
          <p className="text-[14px] font-semibold">{p.track === "stage" ? "Rimborso minimo" : "Stipendio minimo"}</p>
          <Field label="Euro netti al mese" htmlFor="netto" hint="Le offerte senza cifra indicata restano sempre visibili.">
            <input id="netto" name="netto" type="text" inputMode="numeric" defaultValue={p.minNetMonthly ?? ""} />
          </Field>
          <label className="flex items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="nascondi" value="1" defaultChecked={p.hideBelowMin} /> Nascondi le offerte sotto questa cifra (altrimenti finiscono solo più in basso)
          </label>
        </Card>
        <Card className="!p-4">
          <label className="flex items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="digest" value="1" defaultChecked={us.digestEnabled} /> Ricevi l&apos;e-mail del mattino con le novità
          </label>
        </Card>
        <Button>Salva</Button>
      </form>

      <SectionTitle>Correzioni dalle offerte scartate</SectionTitle>
      <p className="-mt-1 mb-3 text-[13.5px] text-muted">Quando nascondi un&apos;offerta e dici perché, Compass corregge la classifica. Puoi annullare ogni correzione.</p>
      {adjustments.length === 0 ? (
        <p className="text-[13.5px] text-faint">Nessuna correzione.</p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {adjustments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
              <span className={a.active ? "" : "text-faint line-through"}>{a.label}</span>
              <form action={toggleAdjustmentAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="active" value={a.active ? "0" : "1"} />
                <Button variant="ghost" size="sm">
                  {a.active ? "Annulla" : "Ripristina"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
