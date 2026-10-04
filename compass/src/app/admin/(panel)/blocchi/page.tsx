import { Flash } from "@/components/flash";
import { Button, Card, Field, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { addBlockAction, deleteBlockAction } from "../../actions";

export const metadata = { title: "Blocchi" };
const KIND = { company: "Azienda", domain: "Dominio e-mail", keyword: "Parola" } as const;

export default async function BlocchiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.blocklist);
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Lista nera</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">A questi nomi, domini o parole non parte mai nessuna candidatura, né approvata né col pilota automatico.</p>
      <div className="mt-6 space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between gap-3 !p-4">
            <p>
              <span className="mr-2 rounded-full bg-paper px-3 py-1 text-[0.9rem] font-bold">{KIND[r.kind]}</span>
              {r.value}
            </p>
            <form action={deleteBlockAction}>
              <input type="hidden" name="id" value={r.id} />
              <Button variant="quiet">Togli</Button>
            </form>
          </Card>
        ))}
      </div>
      <SectionTitle>Aggiungi</SectionTitle>
      <form action={addBlockAction}>
        <Card className="grid gap-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Field label="Tipo" htmlFor="kind">
            <select id="kind" name="kind">
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valore" htmlFor="value">
            <input id="value" name="value" type="text" required />
          </Field>
          <Button>Aggiungi</Button>
        </Card>
      </form>
    </>
  );
}
