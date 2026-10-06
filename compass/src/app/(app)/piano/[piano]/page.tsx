import Link from "next/link";
import { notFound } from "next/navigation";
import { PLANS, priceLabel } from "@/lib/core/plans";
import { requireUser } from "@/lib/server/auth";
import { Card, PageHeader } from "@/components/ui";
import { DemoCheckout } from "@/components/demo-checkout";
import { IconCheck } from "@/components/icons";
import { choosePlanAction } from "../../actions";

export const metadata = { title: "Abbonamento" };

const safe = (b: string | undefined) => (b && b.startsWith("/") && !b.startsWith("//") ? b : "/piano");

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ piano: string }>; searchParams: Promise<{ back?: string }> }) {
  const { piano } = await params;
  const sp = await searchParams;
  await requireUser();
  const plan = PLANS.find((p) => p.key === piano && p.price > 0);
  if (!plan) notFound();
  const back = safe(sp.back);
  return (
    <>
      <PageHeader eyebrow="Abbonamento" title={`Compass ${plan.name}`} description={plan.tagline} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.1fr]">
        <Card className="!p-5">
          <p className="text-[13px] font-medium uppercase tracking-[0.05em] text-faint">Riepilogo</p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-[30px] font-bold tracking-[-0.035em] tabular-nums">{priceLabel(plan)}</span>
            <span className="text-[13px] text-faint">/ mese</span>
          </p>
          <p className="mt-1 text-[14px] font-semibold text-good">Oggi: 0 € · prova gratuita</p>
          <ul className="mt-4 space-y-2 text-[14px]">
            {plan.features.map((f) => (
              <li key={f.text} className="flex gap-2">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-accent" />
                <span>
                  {f.text}
                  {f.soon && <span className="ml-1.5 inline-flex h-5 items-center rounded-full bg-subtle px-2 align-middle text-[10.5px] font-semibold text-muted">In arrivo</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13px] text-faint">
            <Link href="/piano">← Confronta i piani</Link>
          </p>
        </Card>
        <Card className="!p-5">
          <p className="mb-1 text-[16px] font-semibold">Pagamento</p>
          <p className="mb-4 text-[13.5px] text-muted">
            I pagamenti non sono ancora attivi: è una prova gratuita, non ti addebitiamo nulla e quello che scrivi qui non viene inviato né salvato.
          </p>
          <DemoCheckout plan={plan.key} back={back} action={choosePlanAction} />
        </Card>
      </div>
    </>
  );
}
