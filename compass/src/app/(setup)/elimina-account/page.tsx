import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { Button, Card, Field, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/server/auth";
import { deleteMyAccountAction } from "../../(app)/actions";

export const metadata = { title: "Elimina il mio account" };

/** Delete the account itself (not only the data): password and the word ELIMINA, then signed out. */
export default async function EliminaAccountPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-md">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <Card className="!p-6">
        <h1 className="text-[20px] font-semibold">Eliminare il tuo account?</h1>
        <p className="mt-3 text-[14px] text-muted">
          Si cancellano l&apos;account ({user.email}) e tutto quello che contiene: profilo e risposte, CV ed esperienze, aziende e settori scelti, offerte salvate e scartate, cartelle, candidature, risposte delle aziende, il collegamento a Gmail (il permesso viene tolto anche su Google). Non si può annullare.
        </p>
        <p className="mt-2 text-[13px] text-faint">
          Vuoi solo ricominciare da capo con lo stesso account? Usa invece <a href="/profilo/cancella">Cancella tutti i miei dati</a> (dal Profilo). Le e-mail già partite restano nella casella usata per inviarle.
        </p>
        <form action={deleteMyAccountAction} className="mt-6 space-y-4">
          <Field label="La tua password" htmlFor="password">
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Scrivi ELIMINA per confermare" htmlFor="confirm">
            <input id="confirm" name="confirm" type="text" autoComplete="off" required />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="danger" className="sm:flex-1 !border-bad !bg-bad !text-surface">
              Elimina il mio account
            </Button>
            <LinkButton href="/profilo" variant="secondary" className="sm:flex-1">
              Annulla
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
