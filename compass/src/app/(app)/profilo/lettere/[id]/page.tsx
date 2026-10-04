import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Button, Field, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { saveTemplateAction } from "../../../actions";

export const metadata = { title: "Modifica lettera" };

export default async function LetteraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const t = await getDb().query.templates.findFirst({ where: and(eq(schema.templates.id, Number(id)), eq(schema.templates.userId, user.id)) });
  if (!t) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/profilo/lettere">Lettere</BackLink>
      <PageHeader title="Modifica lettera" description="Scrivi solo cose vere. Campi disponibili: {azienda}, {ruolo}, {citta}, {fonte}, {nome}." />
      <form action={saveTemplateAction} className="space-y-4">
        <input type="hidden" name="templateId" value={t.id} />
        <Field label="Nome" htmlFor="name">
          <input id="name" name="name" type="text" defaultValue={t.name} />
        </Field>
        <Field label="Oggetto" htmlFor="subject">
          <input id="subject" name="subject" type="text" defaultValue={t.subject} />
        </Field>
        <Field label="Testo" htmlFor="body">
          <textarea id="body" name="body" rows={14} defaultValue={t.body} />
        </Field>
        <Button>Salva</Button>
      </form>
    </div>
  );
}
