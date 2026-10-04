import { IconCheck } from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { PLANS, euro } from "./plans";

export const metadata = { title: "Prezzi", description: "I piani di Compass: Essenziale, Compass e Famiglia." };

const COMPARE: [string, (string | boolean)[]][] = [
  ["Offerte dagli avvisi e-mail", [true, true, true]],
  ["Lavoro e stage", [true, true, true]],
  ["Aziende e brand scelti", ["10", "Illimitati", "Illimitati"]],
  ["Suggerimenti dal CV", [false, true, true]],
  ["Solo le aziende scelte", [false, true, true]],
  ["Offerte dal web e dai siti aziendali", [false, true, true]],
  ["Candidature via e-mail al giorno", ["3", "10", "20"]],
  ["CV per tipo di posizione", ["1", "3", "3"]],
  ["E-mail del mattino", [false, true, true]],
  ["Risposte delle aziende riconosciute", [false, true, true]],
  ["Prepara con Claude", [false, true, true]],
  ["Pilota automatico", [false, false, true]],
  ["Account", ["1", "1", "4"]],
];

const FAQ = [
  ["Posso disdire quando voglio?", "Sì, in qualsiasi momento, senza penali. Resti nel piano fino alla fine del periodo pagato."],
  ["C'è un periodo di prova?", "30 giorni gratis per Compass e Famiglia. Se non ti convince torni a Essenziale senza pagare."],
  ["Compass entra nel mio account LinkedIn o Indeed?", "No, mai. Legge solo gli avvisi che ricevi per e-mail e le offerte pubbliche, e non si candida al posto tuo sui loro siti."],
  ["Cosa succede ai miei dati?", "Restano tuoi: servono solo a trovarti offerte e li cancelli in ogni momento dal profilo."],
  ["Funziona per gli stage?", "Sì: la modalità stage legge anno di corso, periodi e requisiti degli annunci (primo anno, penultimo anno, laurea richiesta) e mette in cima boutique, fondi e aziende che scegli."],
];

export default function AbbonamentoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <section className="mx-auto max-w-2xl pt-16 text-center">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-accent">Prezzi</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-tight sm:text-[40px]">Semplici, senza sorprese</h1>
        <p className="mt-3 text-[15px] text-muted">Inizi gratis e cambi piano quando vuoi.</p>
        <p className="mx-auto mt-4 inline-flex rounded-full bg-warn-soft px-3 py-1 text-[12.5px] text-warn">Pagamenti non ancora attivi: i prezzi sono indicativi.</p>
      </section>

      <section className="mt-12 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3" aria-label="Piani">
        {PLANS.map((p) => (
          <article key={p.id} className={`relative flex flex-col rounded-[var(--radius-card)] border bg-surface p-6 ${p.highlight ? "border-accent ring-1 ring-accent" : "border-line"}`}>
            {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[12px] font-medium text-surface">Consigliato</span>}
            <h2 className="text-[17px] font-semibold">{p.name}</h2>
            <p className="text-[13.5px] text-muted">{p.tagline}</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[34px] font-semibold tracking-tight tabular-nums">{euro(p.monthly)}</span>
              <span className="text-[13.5px] text-muted">{p.monthly ? "/ mese" : "per sempre"}</span>
            </p>
            <p className="mt-1 min-h-[1.5em] text-[12.5px] text-faint">{p.yearly ? `${euro(p.yearly)} all'anno, due mesi gratis` : "Nessuna carta richiesta"}</p>
            <p className="mt-4 rounded-lg bg-subtle px-3 py-2 text-[13px] font-medium">{p.limits}</p>
            <ul className="mt-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-[13.5px]">
                  <IconCheck className="mt-0.5 shrink-0 text-accent" size={15} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <LinkButton href={`/abbonamento/${p.id}`} variant={p.highlight ? "primary" : "secondary"} wide className="mt-6">
              {p.monthly ? `Prova ${p.name}` : "Inizia gratis"}
            </LinkButton>
          </article>
        ))}
      </section>

      <section className="mt-16" aria-labelledby="confronto">
        <h2 id="confronto" className="text-[18px] font-semibold">
          Confronto
        </h2>
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface" tabIndex={0} role="region" aria-label="Tabella di confronto">
          <table className="w-full min-w-[560px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-3 font-medium text-muted">Funzione</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COMPARE.map(([label, vals]) => (
                <tr key={label}>
                  <td className="px-4 py-2.5">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-4 py-2.5 text-center">
                      {v === true ? <IconCheck size={16} className="mx-auto text-accent" aria-label="Sì" /> : v === false ? <span className="text-faint" aria-label="No">–</span> : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="faq">
        <h2 id="faq" className="text-[18px] font-semibold">
          Domande frequenti
        </h2>
        <div className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-4 py-3">
              <summary className="flex min-h-[32px] cursor-pointer list-none items-center text-[14px] font-medium">{q}</summary>
              <p className="mt-2 text-[13.5px] text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
