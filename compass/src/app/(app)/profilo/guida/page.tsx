import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Guida" };

const STEPS: [string, string][] = [
  ["Ogni mattina", "Arriva un'e-mail con le novità: offerte nuove, candidature pronte, risposte. Il pulsante apre Compass."],
  ["Offerte", "Le più adatte sono in alto, ognuna con il perché. Con il selettore in cima scegli se vedere tutto o solo le aziende e i settori che hai scelto; i filtri si salvano come predefiniti."],
  ["Aziende", "Scegli boutique, brand, banche, fondi, startup e settori dal catalogo. Se manca qualcosa, usa “Altro”: resta visibile solo a te. I suggerimenti si basano sul tuo CV e sui tuoi interessi."],
  ["Candidarsi", "Tre modi: via e-mail (Compass prepara il testo, tu controlli e invii), sul sito dell'azienda con le risposte pronte da copiare, oppure con Claude per una lettera su misura."],
  ["Invio", "Ogni e-mail parte almeno 15 minuti dopo la conferma, nei giorni feriali tra le 8:30 e le 18, una alla volta. Fino all'ultimo puoi annullare; “Ferma tutti gli invii” blocca tutto."],
  ["Risposte", "Quando un'azienda risponde, la trovi in Candidature con lo stato suggerito (colloquio, offerta, no). Un tocco per confermarlo."],
  ["Privacy", "Compass non entra mai nei tuoi account LinkedIn, Indeed o InfoJobs e non invia niente di nascosto: ogni invio è nel registro."],
];

export default async function GuidaPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/profilo">Profilo</BackLink>
      <PageHeader title="Come funziona Compass" />
      <ol className="space-y-5">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle text-[12.5px] font-semibold text-muted">{i + 1}</span>
            <div>
              <p className="text-[14.5px] font-semibold">{title}</p>
              <p className="mt-0.5 text-[14px] text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
