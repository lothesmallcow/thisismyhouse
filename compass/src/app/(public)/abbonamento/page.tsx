import { IconCheck, IconX } from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { PLANS, euro } from "./plans";

export const metadata = { title: "Abbonamento", description: "I piani di Compass: Essenziale, Compass e Famiglia." };

const COMPARE: [string, (string | boolean)[]][] = [
  ["Offerte dagli avvisi e-mail", [true, true, true]],
  ["Offerte dal web e dai siti aziendali", [false, true, true]],
  ["Candidature via e-mail al giorno", ["3", "10", "20"]],
  ["CV diversi per tipo di lavoro", ["1", "3", "3"]],
  ["E-mail del mattino", [false, true, true]],
  ["Risposte delle aziende riconosciute", [false, true, true]],
  ["Prepara con Claude", [false, true, true]],
  ["Pilota automatico", [false, false, true]],
  ["Candidature spontanee", [false, false, true]],
  ["Accesso per chi ti aiuta", [false, false, true]],
];

const FAQ = [
  ["Posso disdire quando voglio?", "Sì. Disdici con un tocco e resti nel piano fino alla fine del periodo già pagato. Nessuna penale."],
  ["C'è un periodo di prova?", "I primi 30 giorni del piano Compass e del piano Famiglia sono gratis. Se non ti convince, torni a Essenziale senza pagare nulla."],
  ["Compass entra nel mio account LinkedIn o Indeed?", "No, mai. Compass legge solo gli avvisi che ricevi per e-mail e le offerte pubbliche. Non accede ai tuoi account e non si candida al posto tuo sui loro siti."],
  ["Cosa succede ai miei dati?", "Restano tuoi. Li usiamo solo per trovarti lavoro e li cancelli con un tocco dalla pagina Aiuto."],
  ["Il pagamento annuale conviene?", "Sì: con il piano annuale paghi circa due mesi in meno rispetto al mensile."],
];

export default function AbbonamentoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <section className="mx-auto max-w-3xl pt-6 text-center rise">
        <p className="font-bold text-needle-ink">Abbonamento</p>
        <h1 className="mt-2 text-[2.6rem] font-semibold leading-tight sm:text-[3.4rem]">Scegli il piano giusto per te</h1>
        <p className="mt-4 text-[1.15rem] text-ink-soft">Prezzi chiari, niente costi nascosti. Inizi gratis e cambi piano quando vuoi.</p>
      </section>

      <section className="mt-12 grid items-stretch gap-6 lg:grid-cols-3" aria-label="Piani">
        {PLANS.map((p) => (
          <article
            key={p.id}
            className={`relative flex flex-col rounded-[28px] border p-7 shadow-[var(--shadow-card)] ${p.highlight ? "border-navy bg-navy text-white lg:-mt-4 lg:mb-[-1rem]" : "border-line bg-card"}`}
          >
            {p.highlight && <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-needle px-4 py-1.5 text-[0.9rem] font-bold text-white">Il più scelto</span>}
            <h2 className={`text-[1.8rem] font-semibold ${p.highlight ? "text-white" : ""}`}>{p.name}</h2>
            <p className={p.highlight ? "text-white/85" : "text-ink-soft"}>{p.tagline}</p>
            <p className="mt-6 flex items-end gap-2">
              <span className="font-serif text-[3.2rem] font-semibold leading-none">{euro(p.monthly)}</span>
              <span className={`pb-1.5 ${p.highlight ? "text-white/85" : "text-ink-soft"}`}>{p.monthly ? "al mese" : "per sempre"}</span>
            </p>
            <p className={`mt-2 min-h-[1.6em] text-[0.98rem] ${p.highlight ? "text-white/85" : "text-ink-soft"}`}>
              {p.yearly ? `oppure ${euro(p.yearly)} l'anno (risparmi ${euro(Math.round((p.monthly * 12 - p.yearly) * 100) / 100)})` : "Nessuna carta richiesta"}
            </p>
            <p className={`mt-5 rounded-2xl px-4 py-3 font-bold ${p.highlight ? "bg-white/10" : "bg-paper"}`}>{p.limits}</p>
            <ul className="mt-5 flex-1 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <IconCheck className={`mt-0.5 shrink-0 ${p.highlight ? "text-[#9fd3ad]" : "text-sage-ink"}`} size={22} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <LinkButton href={`/abbonamento/${p.id}`} variant={p.highlight ? "secondary" : "primary"} wide className="mt-7">
              {p.monthly ? `Prova ${p.name} gratis per 30 giorni` : "Inizia gratis"}
            </LinkButton>
          </article>
        ))}
      </section>

      <section className="mt-20">
        <h2 className="text-center text-[2rem] font-semibold">Confronta i piani</h2>
        <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-4 font-bold">Cosa comprende</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-4 py-4 text-center font-serif text-[1.15rem] font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, vals]) => (
                <tr key={label} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3.5">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-4 py-3.5 text-center">
                      {v === true ? (
                        <IconCheck className="mx-auto text-sage-ink" aria-label="Sì" />
                      ) : v === false ? (
                        <IconX className="mx-auto text-ink-soft/70" size={20} aria-label="No" />
                      ) : (
                        <span className="font-bold">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-[2rem] font-semibold">Domande frequenti</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-2xl border border-line bg-card px-5 shadow-[var(--shadow-card)]">
              <summary className="flex min-h-[64px] cursor-pointer items-center text-[1.1rem] font-bold">{q}</summary>
              <p className="pb-5 text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-center text-[0.95rem] text-ink-soft">Prezzi IVA inclusa. Anteprima: i pagamenti online non sono ancora attivi.</p>
      </section>
    </div>
  );
}
