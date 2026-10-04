import { Flash } from "@/components/flash";
import { Button, Card, Field, Notice, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { addSiteAction, approveSiteAction, deleteSiteAction } from "../../actions";

export const metadata = { title: "Siti (W2)" };

export default async function SitiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.approvedSites);
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Siti di annunci (W2)</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">Pagine &ldquo;Lavora con noi&rdquo;, piccoli siti di annunci, agenzie, portali pubblici. Ogni sito va approvato a mano dopo aver letto termini d&apos;uso e robots.txt. Compass rispetta robots.txt, fa al massimo una richiesta ogni 5 secondi e si ferma al primo blocco.</p>
      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">{r.name}</p>
              <span className={`rounded-full px-3 py-1 font-bold ${r.approved ? "bg-sage text-sage-ink" : "bg-amber text-amber-ink"}`}>{r.approved ? "Approvato" : "Da approvare"}</span>
            </div>
            <p className="break-all text-ink-soft">{r.startUrl}</p>
            <form action={approveSiteAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="approved" value={r.approved ? "0" : "1"} />
              <Field label="Riassunto di termini d'uso e robots.txt" htmlFor={`terms-${r.id}`}>
                <textarea id={`terms-${r.id}`} name="terms" rows={3} defaultValue={r.termsSummary} />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Button variant={r.approved ? "secondary" : "primary"}>{r.approved ? "Revoca l'approvazione" : "Ho controllato: approva"}</Button>
              </div>
            </form>
            <form action={deleteSiteAction} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <Button variant="quiet">Togli</Button>
            </form>
          </Card>
        ))}
      </div>
      <SectionTitle>Proponi un sito</SectionTitle>
      <Notice tone="info">Aggiunto qui, il sito resta spento finché non lo approvi.</Notice>
      <form action={addSiteAction} className="mt-4">
        <Card className="grid gap-5">
          <Field label="Nome" htmlFor="name">
            <input id="name" name="name" type="text" />
          </Field>
          <Field label="Indirizzo della pagina con le offerte (https)" htmlFor="startUrl">
            <input id="startUrl" name="startUrl" type="url" required />
          </Field>
          <Field label="Note" htmlFor="terms">
            <textarea id="terms" name="terms" rows={2} />
          </Field>
          <Button>Aggiungi (da approvare)</Button>
        </Card>
      </form>
    </>
  );
}
