import { IconArrowLeft } from "@/components/icons";
import { Card, LinkButton, PageHeader } from "@/components/ui";

export const metadata = { title: "Come si usa" };

const STEPS = [
  {
    t: "Ogni mattina ti arriva un'e-mail",
    d: "Si chiama “Buongiorno!” e ti dice quante offerte nuove ci sono. Premi il pulsante blu “Apri Compass”.",
  },
  {
    t: "Guarda le “Offerte”",
    d: "In alto ci sono quelle più adatte a te, con un pallino verde. Sotto il titolo leggi perché te le propongo, per esempio “A 8 km da casa”.",
  },
  {
    t: "Tocca un'offerta per leggerla",
    d: "Se ti piace, premi il pulsante grande. Se non ti interessa, premi “Non mi interessa”: non te la mostro più e imparo cosa preferisci.",
  },
  {
    t: "Candidature via e-mail: “Da inviare”",
    d: "Preparo io l'e-mail con il tuo CV. Tu la leggi e premi “Invia”. Hai sempre 15 minuti per ripensarci con “Annulla”.",
  },
  {
    t: "Candidature sul sito: il “Kit candidatura”",
    d: "Alcuni annunci vogliono che ti candidi sul loro sito. Apri il sito, poi copia le risposte già pronte con i pulsanti “Copia”. Alla fine premi “Fatto, mi sono candidata”.",
  },
  {
    t: "Le risposte",
    d: "Quando un'azienda ti risponde, te lo scrivo in “Le mie candidature”. Con un tocco aggiorni la candidatura, per esempio “Colloquio”.",
  },
  {
    t: "Se qualcosa non va",
    d: "In “Da inviare” c'è il pulsante rosso “Ferma tutti gli invii”: blocca tutto subito. Non succede niente di grave, si può riattivare.",
  },
];

export default function GuidaPage() {
  return (
    <>
      <LinkButton href="/aiuto" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna ad Aiuto
      </LinkButton>
      <PageHeader title="Come si usa Compass" help="Sette cose da sapere, niente di più. Puoi tornare a leggerle quando vuoi." />
      <ol className="space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.t}>
            <Card className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-[1.3rem] font-semibold text-white">{i + 1}</span>
              <div>
                <p className="text-[1.2rem] font-bold">{s.t}</p>
                <p className="mt-1">{s.d}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-center text-ink-soft">Compass non entra mai nei tuoi account LinkedIn, Indeed o InfoJobs e non invia niente senza regole precise.</p>
    </>
  );
}
