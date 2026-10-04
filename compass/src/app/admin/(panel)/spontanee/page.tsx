import { Flash } from "@/components/flash";
import { Button, Card, Field, SectionTitle } from "@/components/ui";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { addSpontaneousAction, importSpontaneousCsvAction, setSpontaneousStatusAction } from "../../actions";
import { PersonTabs, pickPerson } from "../person";

export const metadata = { title: "Candidature spontanee" };

export default async function SpontaneePage({ searchParams }: { searchParams: Promise<{ msg?: string; u?: string }> }) {
  const sp = await searchParams;
  const { list, current } = await pickPerson(sp.u);
  const rows = current ? await getDb().select().from(schema.spontaneousCompanies).where(eq(schema.spontaneousCompanies.userId, current.id)) : [];
  const U = <input type="hidden" name="u" value={current?.id ?? 0} />;
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[22px] font-semibold">Candidature spontanee</h1>
      <div className="mt-4"><PersonTabs list={list} current={current} path="/admin/spontanee" /></div>
      <p className="max-w-3xl text-[13.5px] text-muted">Elenco per persona. Solo aziende che pubblicano un indirizzo apposta per le candidature (per esempio una pagina &ldquo;Lavora con noi&rdquo;). Salva sempre la pagina dove l&apos;indirizzo è pubblicato. Una candidatura per azienda ogni 6 mesi.</p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {r.name} <span className="font-normal text-muted">· {r.city}</span>
              </p>
              <p className="text-muted">{r.email}</p>
              <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[13px]">
                {r.sourceUrl}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 font-semibold ${r.status === "approved" ? "bg-good-soft text-good" : r.status === "rejected" ? "bg-subtle text-muted" : "bg-warn-soft text-warn"}`}>
                {r.status === "approved" ? "Approvata" : r.status === "rejected" ? "Scartata" : "Suggerita"}
              </span>
              {r.status !== "approved" && (
                <form action={setSpontaneousStatusAction}>
                  <input type="hidden" name="id" value={r.id} />
                  {U}
                  <input type="hidden" name="status" value="approved" />
                  <Button variant="secondary">Approva</Button>
                </form>
              )}
              {r.status !== "rejected" && (
                <form action={setSpontaneousStatusAction}>
                  <input type="hidden" name="id" value={r.id} />
                  {U}
                  <input type="hidden" name="status" value="rejected" />
                  <Button variant="ghost">Scarta</Button>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
      <SectionTitle>Aggiungi un&apos;azienda</SectionTitle>
      <form action={addSpontaneousAction}>
        {U}
        <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
        {U}
        <Card className="space-y-4">
          <p className="text-muted">Colonne: nome, e-mail, pagina dove è pubblicato, città. Una azienda per riga.</p>
          <input name="file" type="file" accept=".csv,text/csv" aria-label="File CSV" />
          <Field label="Oppure incolla qui" htmlFor="csv">
            <textarea id="csv" name="csv" rows={4} placeholder="Panificio Gallo,lavoro@panificiogallo.example,https://www.panificiogallo.example/lavora-con-noi,Torino" />
          </Field>
          <Button>Importa</Button>
        </Card>
      </form>
    </>
  );
}
