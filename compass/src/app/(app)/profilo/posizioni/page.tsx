import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { RecommendedPositions } from "@/components/recommended-positions";
import { Card, Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { cvPositionsFor } from "@/lib/server/cv-positions";

export const metadata = { title: "Posizioni cercate" };

export default async function PosizioniPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const { roles, recommended, hasCv } = await cvPositionsFor(getDb(), user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="Posizioni cercate" description="Le posizioni che cerchiamo per te. Dal CV e dalle esperienze ti proponiamo quelle che ti si addicono: spunta quelle da cercare, togli le altre." />
      {!hasCv && (
        <Notice tone="info">
          Carica il <Link href="/profilo/cv">CV</Link> o aggiungi le <Link href="/profilo/esperienze">esperienze</Link> per avere posizioni consigliate.
        </Notice>
      )}
      <Card className="mt-4">
        <RecommendedPositions roles={roles} recommended={recommended} back="/profilo/posizioni" />
      </Card>
    </div>
  );
}
