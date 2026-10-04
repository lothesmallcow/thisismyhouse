import { Button, Card, LinkButton } from "@/components/ui";
import { getDb } from "@/lib/db";
import { bulkSendable } from "@/lib/server/applications";
import { requireUser } from "@/lib/server/auth";
import { approveAllAction } from "../../actions";

export const metadata = { title: "Invia tutte" };

export default async function TuttePage() {
  const user = await requireUser();
  const drafts = await bulkSendable(getDb(), user.id);
  return (
    <div className="mx-auto max-w-md pt-6">
      <Card className="!p-6">
        <h1 className="text-[20px] font-semibold">Inviare {drafts.length === 1 ? "1 candidatura" : `${drafts.length} candidature`}?</h1>
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {drafts.map((d) => (
            <li key={d.app.id} className="px-3.5 py-2.5 text-[14px]">
              <span className="font-medium">{d.app.company}</span> <span className="text-muted">· {d.app.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13.5px] text-muted">Partono una alla volta, a qualche minuto di distanza, nei giorni feriali dalle 8:30 alle 18. Ognuna si può annullare. Quelle con un avviso vanno inviate singolarmente.</p>
        <form action={approveAllAction} className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          {drafts.map((d) => (
            <input key={d.app.id} type="hidden" name="appId" value={d.app.id} />
          ))}
          <Button className="sm:flex-1">Sì, invia tutte</Button>
          <LinkButton href="/da-inviare" variant="secondary" className="sm:flex-1">
            Annulla
          </LinkButton>
        </form>
      </Card>
    </div>
  );
}
