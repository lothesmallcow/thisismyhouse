import { Flash } from "@/components/flash";
import { Button, Card, Field, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { addSpontaneousAction, importSpontaneousCsvAction, setSpontaneousStatusAction } from "../../actions";

export const metadata = { title: "Candidature spontanee" };

export default async function SpontaneePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.spontaneousCompanies);
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Candidature spontanee</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">Solo aziende che pubblicano un indirizzo apposta per le candidature (per esempio una pagina &ldquo;Lavora con noi&rdquo;). Salva sempre la pagina dove l&apos;indirizzo è pubblicato. Una candidatura per azienda ogni 6 mesi.</p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
            <div className="min-w-0">
              <p className="font-bold">
                {r.name} <span className="font-normal text-ink-soft">· {r.city}</span>
              </p>
              <p className="text-ink-soft">{r.email}</p>
              <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[0.95rem]">
                {r.sourceUrl}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 font-bold ${r.status === "approved" ? "bg-sage text-sage-ink" : r.status === "rejected" ? "bg-mist text-mist-ink" : "bg-amber text-amber-ink"}`}>
                {r.status === "approved" ? "Approvata" : r.status === "rejected" ? "Scartata" : "Suggerita"}
              </span>
              {r.status !== "approved" && (
                <form action={setSpontaneousStatusAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="approved" />
                  <Button variant="secondary">Approva</Button>
                </form>
              )}
              {r.status !== "rejected" && (
                <form action={setSpontaneousStatusAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <Button variant="quiet">Scarta</Button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
      <SectionTitle>Aggiungi un&apos;azienda</SectionTitle>
      <form action={addSpontaneousAction}>
        <Card className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome" htmlFor="name">
            <input id="name" name="name" type="text" required />
          </Field>
          <Field label="Città" htmlFor="city">
            <input id="city" name="city" type="text" />
          </Field>
          <Field label="Indirizzo per le candidature" htmlFor="email">
            <input id="email" name="email" type="email" required />
          </Field>
          <Field label="Pagina dove è pubblicato" htmlFor="sourceUrl">
            <input id="sourceUrl" name="sourceUrl" type="url" required />
          </Field>
          <div className="sm:col-span-2">
            <Button>Aggiungi</Button>
          </div>
        </Card>
      </form>
      <SectionTitle>Importa da CSV</SectionTitle>
      <form action={importSpontaneousCsvAction}>
        <Card className="space-y-4">
          <p className="text-ink-soft">Colonne: nome, e-mail, pagina dove è pubblicato, città. Una azienda per riga.</p>
          <input name="file" type="file" accept=".csv,text/csv" />
          <Field label="Oppure incolla qui" htmlFor="csv">
            <textarea id="csv" name="csv" rows={4} placeholder="Panificio Gallo,lavoro@panificiogallo.example,https://www.panificiogallo.example/lavora-con-noi,Torino" />
          </Field>
          <Button>Importa</Button>
        </Card>
      </form>
    </>
  );
}
