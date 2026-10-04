import { IconArrowLeft, IconX } from "@/components/icons";
import { Button, Card, LinkButton } from "@/components/ui";
import { deleteAllDataAction } from "../../actions";

export const metadata = { title: "Cancella i miei dati" };

export default function CancellaPage() {
  return (
    <div className="mx-auto max-w-xl pt-6">
      <Card className="rise !p-8 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose text-rose-ink">
          <IconX size={32} />
        </span>
        <p className="font-serif text-[1.6rem] font-semibold leading-snug">Sto per cancellare tutti i tuoi dati. Confermi?</p>
        <p className="mt-4 text-left">Cancello: il tuo profilo, i tuoi CV, le offerte, le candidature, le risposte e il registro degli invii. Non si può tornare indietro.</p>
        <p className="mt-2 text-left text-ink-soft">Le e-mail che sono già partite restano nella casella della ricerca di lavoro.</p>
        <form action={deleteAllDataAction} className="mt-7">
          <Button variant="danger" wide>
            Sì, cancella tutto
          </Button>
        </form>
        <LinkButton href="/aiuto" variant="secondary" wide className="mt-3">
          <IconArrowLeft /> No, torna indietro
        </LinkButton>
      </Card>
    </div>
  );
}
