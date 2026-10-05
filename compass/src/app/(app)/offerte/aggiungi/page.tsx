import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { Button, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/server/auth";
import { manualAddAction } from "../../actions";
import { ManualPrefill } from "./prefill";

export const metadata = { title: "Aggiungi un'offerta" };

const clip = (v: string | undefined, n: number) => (v ?? "").slice(0, n);

export default async function AggiungiPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const sp = await searchParams;
  const fromButton = Boolean(sp.url || sp.title);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/offerte" className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
        <IconArrowLeft size={16} /> Offerte
      </Link>
      <PageHeader
        title="Aggiungi un'offerta"
        description={fromButton ? "Ho letto l'annuncio dalla pagina che stavi guardando: controlla i campi e aggiungilo. Resta visibile solo a te." : "Hai visto un annuncio altrove? Incolla il testo e controlla i campi. Resta visibile solo a te."}
      />
      {!fromButton && (
        <p className="-mt-3 mb-5 text-[13px] text-muted">
          Più veloce: il pulsante <Link href="/offerte/salva">Salva in Compass</Link> nel browser lo fa con un clic da LinkedIn, Indeed o qualsiasi sito.
        </p>
      )}
      <form action={manualAddAction} className="space-y-5">
        <ManualPrefill initial={{ title: clip(sp.title, 160), company: clip(sp.company, 120), city: clip(sp.city, 80), url: clip(sp.url, 600), text: clip(sp.text, 4000) }} />
        <Button>Aggiungi l&apos;offerta</Button>
      </form>
    </div>
  );
}
