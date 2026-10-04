import { IconArrowLeft } from "@/components/icons";
import { Button, LinkButton, PageHeader } from "@/components/ui";
import { manualAddAction } from "../../actions";
import { ManualPrefill } from "./prefill";

export const metadata = { title: "Aggiungi un'offerta" };

export default function AggiungiPage() {
  return (
    <>
      <LinkButton href="/offerte" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna alle offerte
      </LinkButton>
      <PageHeader title="Aggiungi un'offerta" help="Hai visto un annuncio altrove? Incolla qui il testo: provo a compilare io il resto, tu controlla." />
      <form action={manualAddAction} className="space-y-6">
        <ManualPrefill />
        <Button wide>Aggiungi l&apos;offerta</Button>
      </form>
    </>
  );
}

