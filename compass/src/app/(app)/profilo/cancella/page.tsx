import { BackLink } from "@/components/back-link";
import { Button, Card, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/server/auth";
import { deleteAllDataAction } from "../../actions";

export const metadata = { title: "Cancella i miei dati" };

export default async function CancellaPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-md">
      <BackLink href="/profilo">Profilo</BackLink>
      <Card className="!p-6">
        <h1 className="text-[20px] font-semibold">Cancellare tutti i tuoi dati?</h1>
        <p className="mt-3 text-[14px] text-muted">
          Vengono cancellati profilo, CV, scelte di aziende e settori, offerte private, candidature, risposte e registro degli invii. L&apos;account resta, per poter ricominciare. Non si può annullare.
        </p>
        <p className="mt-2 text-[13px] text-faint">Le e-mail già partite restano nella casella usata per le candidature.</p>
        <form action={deleteAllDataAction} className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="danger" className="sm:flex-1 !border-bad !bg-bad !text-surface">
            Sì, cancella tutto
          </Button>
          <LinkButton href="/profilo" variant="secondary" className="sm:flex-1">
            Annulla
          </LinkButton>
        </form>
      </Card>
    </div>
  );
}
