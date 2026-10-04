import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { Button, Field, LinkButton, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { updateDraftAction } from "../../../actions";

export const metadata = { title: "Cambia la candidatura" };

export default async function ModificaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, Number(id)) });
  if (!app || app.status !== "draft") notFound();
  const cvs = await db.select({ id: schema.cvs.id, label: schema.cvs.label }).from(schema.cvs);
  return (
    <>
      <LinkButton href="/da-inviare" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna a Da inviare
      </LinkButton>
      <PageHeader title="Cambia la candidatura" help="Puoi correggere il testo dell'e-mail o scegliere un altro CV. Poi premi Salva." />
      <form action={updateDraftAction} className="space-y-6">
        <input type="hidden" name="appId" value={app.id} />
        <Field label="Quale CV allego?" htmlFor="cvId">
          <select id="cvId" name="cvId" defaultValue={app.cvId ?? ""}>
            {cvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Oggetto" htmlFor="subject">
          <input id="subject" name="subject" type="text" defaultValue={app.subject ?? ""} />
        </Field>
        <Field label="Testo" htmlFor="body">
          <textarea id="body" name="body" rows={12} defaultValue={app.body ?? ""} />
        </Field>
        <Button wide>Salva</Button>
      </form>
    </>
  );
}
