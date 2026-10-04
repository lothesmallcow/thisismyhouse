import { redirect } from "next/navigation";
import { CompassMark, IconCheck, IconFolder, IconMail, IconOffers, IconSend, IconStop } from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  { Icon: IconMail, t: "Legge gli avvisi per te", d: "Gli avvisi di LinkedIn, Indeed e InfoJobs arrivano in una casella dedicata. Compass li legge e tiene solo le offerte vere, senza doppioni." },
  { Icon: IconOffers, t: "Ti dice perché", d: "Ogni offerta ha un giudizio semplice, Molto adatta, Adatta o Poco adatta, con il motivo: “A 8 km da casa”, “Part-time come vuoi tu”." },
  { Icon: IconSend, t: "Candidature in un tocco", d: "Se l'annuncio chiede il CV per e-mail, l'e-mail è già pronta. Tu la leggi e premi Invia. Hai sempre 15 minuti per annullare." },
  { Icon: IconFolder, t: "Ti avvisa quando rispondono", d: "Riconosce le risposte delle aziende e te le mostra subito: “Hai ricevuto una risposta da Rossi Srl!”." },
];

export default async function Landing() {
  if (await currentUser()) redirect("/offerte");
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
          <div className="rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-[0.95rem] font-bold text-needle-ink">
              <span className="h-2 w-2 rounded-full bg-needle" /> Per chi cerca lavoro e non vuole perdersi
            </p>
            <h1 className="mt-6 text-[2.9rem] font-semibold leading-[1.02] sm:text-[4.2rem]">
              Il lavoro giusto,
              <br />
              <span className="italic text-navy">senza perdersi.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[1.2rem] leading-relaxed text-ink-soft">
              Compass raccoglie le offerte di lavoro, sceglie quelle adatte a te e ti aiuta a candidarti in pochi tocchi. In italiano semplice, con pulsanti grandi e niente sorprese.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LinkButton href="/entra" className="px-8">
                Entra in Compass
              </LinkButton>
              <LinkButton href="/abbonamento" variant="secondary" className="px-8">
                Vedi i piani
              </LinkButton>
            </div>
            <p className="mt-5 text-[0.98rem] text-ink-soft">30 giorni gratis, poi scegli tu. Nessun account social da collegare.</p>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[420px]" aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-line-strong/60" />
            <div className="absolute inset-[9%] rounded-full border border-dashed border-line-strong/70" />
            <div className="absolute inset-[18%] rounded-full bg-card shadow-[0_30px_80px_-30px_rgb(23_34_45/0.45)]" />
            <div className="absolute inset-[24%] flex items-center justify-center">
              <div className="animate-[spin_60s_linear_infinite] motion-reduce:animate-none">
                <CompassMark size={220} />
              </div>
            </div>
            {[
              ["top-[6%] left-[2%]", "Molto adatta", "bg-sage text-sage-ink"],
              ["bottom-[12%] left-[-2%]", "A 8 km da casa", "bg-card text-ink"],
              ["top-[18%] right-[-4%]", "Part-time", "bg-amber text-amber-ink"],
              ["bottom-[2%] right-[6%]", "Risposta ricevuta!", "bg-navy text-white"],
            ].map(([pos, label, tone]) => (
              <span key={label} className={`absolute ${pos} rounded-full border border-line px-4 py-2 text-[0.95rem] font-bold shadow-[var(--shadow-card)] ${tone}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ Icon, t, d }) => (
            <div key={t} className="rounded-[var(--radius-card)] border border-line bg-card p-7 shadow-[var(--shadow-card)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-soft text-navy">
                <Icon />
              </span>
              <h2 className="mt-4 text-[1.5rem] font-semibold">{t}</h2>
              <p className="mt-2 text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-8">
        <div className="grid gap-10 rounded-[32px] bg-navy px-6 py-12 text-white sm:px-12 lg:grid-cols-2">
          <div>
            <h2 className="text-[2.2rem] font-semibold leading-tight text-white">Fatto con rispetto, per te e per chi ti assume.</h2>
            <p className="mt-4 text-[1.1rem] text-white/85">Compass non entra mai nei tuoi account e non manda candidature a raffica. Ogni invio passa da regole precise.</p>
          </div>
          <ul className="space-y-4 text-[1.05rem]">
            {[
              "Non accede a LinkedIn, Indeed o InfoJobs al posto tuo.",
              "Al massimo 10 candidature al giorno, nei giorni e negli orari di lavoro.",
              "Ogni invio si può annullare per 15 minuti.",
              "Riconosce gli annunci sospetti, per esempio quelli che chiedono soldi.",
              "I tuoi dati restano tuoi: li cancelli con un tocco.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <IconCheck className="mt-0.5 shrink-0 text-[#9fd3ad]" />
                <span>{t}</span>
              </li>
            ))}
            <li className="flex gap-3">
              <IconStop className="mt-0.5 shrink-0 text-[#f2a493]" />
              <span>Un pulsante rosso ferma tutti gli invii, sempre.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl px-4 text-center sm:px-8">
        <h2 className="text-[2.2rem] font-semibold">Pronta a iniziare?</h2>
        <p className="mt-3 text-[1.1rem] text-ink-soft">Ci vogliono cinque minuti: ti faccio otto domande semplici, una alla volta.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LinkButton href="/entra" className="px-8">
            Entra in Compass
          </LinkButton>
          <LinkButton href="/abbonamento" variant="secondary" className="px-8">
            Confronta i piani
          </LinkButton>
        </div>
      </section>
    </>
  );
}
