import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/db";
import { getScanStatus } from "@/lib/server/plans";
import { PageHeader, Notice } from "@/components/ui";
import { PlanCards } from "@/components/plan-cards";
import { Flash } from "@/components/flash";

export const metadata = { title: "Abbonamento" };

export default async function AbbonamentoPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const s = await getScanStatus(getDb(), user.id);
  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader
        eyebrow="Abbonamento"
        title="Scegli il tuo piano"
        description={`Sei su ${s.plan.name}${s.plan.price ? " (prova gratuita)" : ""}: ${s.left} di ${s.plan.scansPerDay} ricerche a mano rimaste nelle ultime 24 ore.`}
      />
      <PlanCards current={s.plan.key} back="/piano" />
      <div className="mt-6">
        <Notice tone="info" title="I pagamenti non sono ancora attivi">
          Plus e Premium si attivano in prova gratuita: nessun addebito, nessun dato della carta salvato. Le funzioni segnate &quot;In arrivo&quot; non ci sono ancora; quando
          arrivano te lo diciamo prima di chiederti qualcosa.
        </Notice>
      </div>
    </>
  );
}
