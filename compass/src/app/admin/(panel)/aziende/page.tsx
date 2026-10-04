import { Flash } from "@/components/flash";
import { Button, Card, Field, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { ATS_LABELS, ATS_SLUG_HINT, atsEndpoint, type AtsType } from "@/lib/sources/ats";
import { addWatchAction, deleteWatchAction, toggleWatchAction } from "../../actions";

export const metadata = { title: "Aziende (ATS)" };

export default async function AziendePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.companyWatchlist);
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Aziende da seguire</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">Molte aziende pubblicano le offerte tramite un sistema (ATS) con un elenco pubblico e documentato. Compass lo legge una volta al giorno e tiene solo le offerte in Italia.</p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
            <div>
              <p className="font-bold">
                {r.name} <span className="font-normal text-ink-soft">· {ATS_LABELS[r.ats as AtsType]} · {r.slug}</span>
              </p>
              <p className="break-all font-mono text-[0.8rem] text-ink-soft">{atsEndpoint(r.ats as AtsType, r.slug)}</p>
            </div>
            <div className="flex gap-2">
              <form action={toggleWatchAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                <Button variant="secondary">{r.active ? "Sospendi" : "Riattiva"}</Button>
              </form>
              <form action={deleteWatchAction}>
                <input type="hidden" name="id" value={r.id} />
                <Button variant="quiet">Togli</Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
      <SectionTitle>Aggiungi un&apos;azienda</SectionTitle>
      <form action={addWatchAction}>
        <Card className="grid gap-5 sm:grid-cols-3">
          <Field label="Nome" htmlFor="name">
            <input id="name" name="name" type="text" required />
          </Field>
          <Field label="Sistema (ATS)" htmlFor="ats">
            <select id="ats" name="ats">
              {Object.entries(ATS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v} ({ATS_SLUG_HINT[k as AtsType]})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Slug" htmlFor="slug" hint="La parte <slug> dell'indirizzo.">
            <input id="slug" name="slug" type="text" required />
          </Field>
          <div className="sm:col-span-3">
            <Button>Aggiungi</Button>
          </div>
        </Card>
      </form>
    </>
  );
}
