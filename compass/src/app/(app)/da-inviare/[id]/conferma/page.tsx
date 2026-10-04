import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconSend } from "@/components/icons";
import { Button, Card, LinkButton } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { approveAction } from "../../../actions";

export const metadata = { title: "Confermi l'invio?" };

export default async function ConfermaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await getDb().query.applications.findFirst({ where: eq(schema.applications.id, Number(id)) });
  if (!app || app.status !== "draft") notFound();
  return (
    <div className="mx-auto max-w-xl pt-6">
      <Card className="rise text-center !p-8">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-navy-soft text-navy">
          <IconSend size={32} />
        </span>
        <p className="font-serif text-[1.6rem] font-semibold leading-snug">
          Sto per inviare la tua candidatura a <span className="text-navy">{app.company ?? app.toEmail}</span>
          {app.role && app.role !== "Candidatura spontanea" ? (
            <>
              {" "}
              per il ruolo di <span className="text-navy">{app.role}</span>
            </>
          ) : null}
          . Confermi?
        </p>
        <p className="mt-4 text-ink-soft">Partirà tra almeno 15 minuti. Fino ad allora puoi premere &ldquo;Annulla&rdquo;.</p>
        <form action={approveAction} className="mt-7 space-y-3">
          <input type="hidden" name="appId" value={app.id} />
          <Button wide>
            <IconSend /> Sì, invia
          </Button>
        </form>
        <LinkButton href="/da-inviare" variant="secondary" wide className="mt-3">
          <IconArrowLeft /> No, torna indietro
        </LinkButton>
      </Card>
    </div>
  );
}
