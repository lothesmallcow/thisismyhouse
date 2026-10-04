import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { Button, Field, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { cvList, getApplication } from "@/lib/server/applications";
import { requireUser } from "@/lib/server/auth";
import { updateDraftAction } from "../../../actions";

export const metadata = { title: "Modifica candidatura" };

export default async function ModificaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const db = getDb();
  const app = await getApplication(db, user.id, Number(id));
  if (!app || app.status !== "draft") notFound();
  const cvs = await cvList(db, user.id);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/da-inviare" className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
        <IconArrowLeft size={16} /> Da inviare
      </Link>
      <PageHeader title="Modifica candidatura" description={`${app.company ?? ""} · ${app.role ?? ""}`} />
      <form action={updateDraftAction} className="space-y-5">
        <input type="hidden" name="appId" value={app.id} />
        <Field label="CV allegato" htmlFor="cvId">
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
          <textarea id="body" name="body" rows={14} defaultValue={app.body ?? ""} />
        </Field>
        <Button>Salva</Button>
      </form>
    </div>
  );
}
