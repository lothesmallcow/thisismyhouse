import { notFound } from "next/navigation";
import { Card, LinkButton, Notice } from "@/components/ui";
import { PLANS, euro } from "../plans";

export const metadata = { title: "Prezzi" };

export default async function PianoPage({ params }: { params: Promise<{ piano: string }> }) {
  const { piano } = await params;
  const plan = PLANS.find((p) => p.id === piano);
  if (!plan) notFound();
  return (
    <div className="mx-auto max-w-md px-4 pt-16">
      <Card className="!p-6">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-accent">Piano {plan.name}</p>
        <h1 className="mt-1 text-[22px] font-semibold">{plan.monthly ? `${euro(plan.monthly)} al mese, dopo 30 giorni gratis` : "Gratis, per sempre"}</h1>
        <div className="mt-4">
          <Notice tone="warn">I pagamenti online non sono ancora attivi. Puoi creare un account gratuito; nessun addebito viene fatto.</Notice>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <LinkButton href={`/registrati?piano=${plan.id}`} wide>
            Crea un account
          </LinkButton>
          <LinkButton href="/abbonamento" variant="secondary" wide>
            Torna ai prezzi
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
