import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { Button, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/server/auth";
import { manualAddAction } from "../../actions";
import { ManualPrefill } from "./prefill";

export const metadata = { title: "Aggiungi un'offerta" };

export default async function AggiungiPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/offerte" className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
        <IconArrowLeft size={16} /> Offerte
      </Link>
      <PageHeader title="Aggiungi un'offerta" description="Hai visto un annuncio altrove? Incolla il testo e controlla i campi. Resta visibile solo a te." />
      <form action={manualAddAction} className="space-y-5">
        <ManualPrefill />
        <Button>Aggiungi l&apos;offerta</Button>
      </form>
    </div>
  );
}
