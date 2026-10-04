import { notFound } from "next/navigation";
import { IconArrowLeft, IconClock } from "@/components/icons";
import { Card, LinkButton } from "@/components/ui";
import { PLANS, euro } from "../plans";

export const metadata = { title: "Abbonamento" };

export default async function PianoPage({ params }: { params: Promise<{ piano: string }> }) {
  const { piano } = await params;
  const plan = PLANS.find((p) => p.id === piano);
  if (!plan) notFound();
  return (
    <div className="mx-auto max-w-xl px-4 pt-6">
      <Card className="rise !p-8 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-navy-soft text-navy">
          <IconClock size={32} />
        </span>
        <h1 className="text-[2rem] font-semibold">Hai scelto {plan.name}</h1>
        <p className="mt-2 text-[1.1rem]">{plan.monthly ? `${euro(plan.monthly)} al mese dopo 30 giorni gratis.` : "Gratis, per sempre."}</p>
        <p className="mt-5 rounded-2xl bg-amber px-4 py-3 text-amber-ink">I pagamenti online non sono ancora attivi: per ora Compass si attiva su invito. Nessun addebito è stato fatto.</p>
        <LinkButton href="/entra" wide className="mt-7">
          Ho già un invito: entra
        </LinkButton>
        <LinkButton href="/abbonamento" variant="secondary" wide className="mt-3">
          <IconArrowLeft /> Torna ai piani
        </LinkButton>
      </Card>
    </div>
  );
}
