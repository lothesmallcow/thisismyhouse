import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { Button, Card, ChoiceRow, PageHeader } from "@/components/ui";
import { SITUATIONS } from "@/lib/core/situation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { saveSituationAction } from "../../actions";

export const metadata = { title: "Cosa fai ora" };

/** "Cosa fai ora?" changed later (e.g. after graduating): the questions and the ranking follow. */
export default async function SituazionePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const p = await getProfile(getDb(), user.id);
  return (
    <div className="mx-auto max-w-2xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="Cosa fai ora?" description="Quando cambia (ti laurei, inizi a lavorare, vuoi cambiare strada) cambiano anche le domande e le offerte che salgono in cima." />
      <form action={saveSituationAction}>
        <Card className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SITUATIONS.map((x) => (
            <ChoiceRow key={x.key} type="radio" name="situation" value={x.key} defaultChecked={p.situation === x.key} hint={x.hint}>
              {x.label}
            </ChoiceRow>
          ))}
        </Card>
        <div className="mt-4">
          <Button>Salva</Button>
        </div>
      </form>
    </div>
  );
}
