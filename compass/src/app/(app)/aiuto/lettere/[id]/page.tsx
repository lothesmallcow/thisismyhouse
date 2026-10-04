import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { Button, Field, LinkButton, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { saveTemplateAction } from "../../../actions";

export const metadata = { title: "Cambia la lettera" };

export default async function LetteraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getDb().query.templates.findFirst({ where: eq(schema.templates.id, Number(id)) });
  if (!t) notFound();
  return (
    <>
      <LinkButton href="/aiuto/lettere" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna alle lettere
      </LinkButton>
      <PageHeader title="Cambia la lettera" help="Scrivi solo cose vere. Puoi usare {azienda}, {ruolo}, {citta}, {fonte} e {nome}: li riempio io." />
      <form action={saveTemplateAction} className="space-y-6">
        <input type="hidden" name="templateId" value={t.id} />
        <Field label="Nome della lettera" htmlFor="name">
          <input id="name" name="name" type="text" defaultValue={t.name} />
        </Field>
        <Field label="Oggetto" htmlFor="subject">
          <input id="subject" name="subject" type="text" defaultValue={t.subject} />
        </Field>
        <Field label="Testo" htmlFor="body">
          <textarea id="body" name="body" rows={14} defaultValue={t.body} />
        </Field>
        <Button wide>Salva</Button>
      </form>
    </>
  );
}
