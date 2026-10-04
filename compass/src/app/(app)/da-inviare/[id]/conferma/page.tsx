import { notFound } from "next/navigation";
import { IconSend } from "@/components/icons";
import { Button, Card, LinkButton } from "@/components/ui";
import { getDb } from "@/lib/db";
import { getApplication } from "@/lib/server/applications";
import { requireUser } from "@/lib/server/auth";
import { approveAction } from "../../../actions";

export const metadata = { title: "Conferma invio" };

export default async function ConfermaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const app = await getApplication(getDb(), user.id, Number(id));
  if (!app || app.status !== "draft") notFound();
  return (
    <div className="mx-auto max-w-md pt-6">
      <Card className="!p-6">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconSend size={18} />
        </span>
        <h1 className="text-[20px] font-semibold leading-snug">Inviare la candidatura a {app.company ?? app.toEmail}?</h1>
        {app.role && app.role !== "Candidatura spontanea" && <p className="mt-1 text-[14px] text-muted">{app.role}</p>}
        <p className="mt-3 text-[13.5px] text-muted">Destinatario: {app.toEmail}. Parte tra almeno 15 minuti, nella finestra di invio; fino ad allora puoi annullare.</p>
        <form action={approveAction} className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <input type="hidden" name="appId" value={app.id} />
          <Button className="sm:flex-1">Sì, invia</Button>
          <LinkButton href="/da-inviare" variant="secondary" className="sm:flex-1">
            Annulla
          </LinkButton>
        </form>
      </Card>
    </div>
  );
}
