import { IconArrowLeft, IconSend } from "@/components/icons";
import { Button, Card, LinkButton } from "@/components/ui";
import { getDb } from "@/lib/db";
import { listDrafts } from "@/lib/server/applications";
import { approveAllAction } from "../../actions";

export const metadata = { title: "Invia tutte" };

export default async function TuttePage() {
  const drafts = (await listDrafts(getDb())).filter((d) => !d.app.warnings.some((w) => !w.code.startsWith("scam-")));
  return (
    <div className="mx-auto max-w-xl pt-6">
      <Card className="rise !p-8">
        <p className="text-center font-serif text-[1.6rem] font-semibold leading-snug">
          Sto per inviare {drafts.length === 1 ? "1 candidatura" : `${drafts.length} candidature`}. Confermi?
        </p>
        <ul className="mt-5 space-y-2">
          {drafts.map((d) => (
            <li key={d.app.id} className="rounded-xl bg-paper px-4 py-2">
              <strong>{d.app.company}</strong> · {d.app.role}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-ink-soft">Partiranno una alla volta, a qualche minuto di distanza, nei giorni feriali dalle 8:30 alle 18. Ognuna si può annullare.</p>
        <form action={approveAllAction} className="mt-7">
          <Button wide>
            <IconSend /> Sì, invia tutte
          </Button>
        </form>
        <LinkButton href="/da-inviare" variant="secondary" wide className="mt-3">
          <IconArrowLeft /> No, torna indietro
        </LinkButton>
      </Card>
    </div>
  );
}
