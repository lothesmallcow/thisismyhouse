// The public price page: the same plans as inside the app (lib/core/plans.ts). Payments are not live.
import { redirect } from "next/navigation";
import { IconCheck, IconSparkle } from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { PLANS, priceLabel } from "@/lib/core/plans";
import { currentUser } from "@/lib/server/auth";

export const metadata = { title: "Prezzi", description: "I piani di Compass: Free, Plus e Premium." };

const FAQ = [
  ["Posso disdire quando voglio?", "Sì, in qualsiasi momento, senza penali."],
  ["Si paga già?", "No. I pagamenti non sono ancora attivi: Plus e Premium si provano gratis, senza addebiti."],
  ["Cos'è l'assistente AI di Premium?", "È in arrivo: ti dirà dove candidarti e perché, scriverà le lettere e ti preparerà ai colloqui. Quando c'è, te lo diciamo prima."],
  ["Compass entra nel mio account LinkedIn o Indeed?", "No, mai. Legge solo gli avvisi che ricevi per e-mail e le offerte pubbliche, e non si candida al posto tuo sui loro siti."],
  ["Cosa succede ai miei dati?", "Restano tuoi: servono solo a trovarti offerte e li cancelli in ogni momento dal profilo."],
];

export default async function PrezziPage() {
  if (await currentUser()) redirect("/piano"); // signed in: their own plan page
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <section className="hero mx-auto mt-10 max-w-3xl rounded-[var(--radius-card)] px-6 py-10 text-center shadow-[var(--shadow-card)]">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-white/80">Prezzi</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.02em] sm:text-[40px]">Semplici, senza sorprese</h1>
        <p className="mt-3 text-[15px] text-white/85">Inizi gratis e cambi piano quando vuoi. I piani a pagamento ora sono in prova gratuita.</p>
      </section>

      <section className="mt-10 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3" aria-label="Piani">
        {PLANS.map((p) => (
          <article key={p.key} className={`lift relative flex flex-col rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)] ${p.highlight ? "hero" : "border border-line/70 bg-surface"}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-semibold">{p.name}</h2>
              {p.highlight && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-white">Il più scelto</span>}
              {p.key === "premium" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-accent">
                  <IconSparkle size={12} /> AI
                </span>
              )}
            </div>
            <p className={`text-[13.5px] ${p.highlight ? "text-white/85" : "text-muted"}`}>{p.tagline}</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[34px] font-bold tracking-[-0.035em] tabular-nums">{priceLabel(p)}</span>
              <span className={`text-[13.5px] ${p.highlight ? "text-white/80" : "text-muted"}`}>{p.price ? "/ mese" : "per sempre"}</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f.text} className="flex gap-2 text-[13.5px]">
                  <IconCheck className={`mt-0.5 shrink-0 ${p.highlight ? "text-white" : "text-accent"}`} size={15} />
                  <span>
                    {f.text}
                    {f.soon && <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${p.highlight ? "bg-white/20 text-white" : "bg-subtle text-muted"}`}>In arrivo</span>}
                  </span>
                </li>
              ))}
            </ul>
            <LinkButton href={p.price ? `/registrati?piano=${p.key}` : "/registrati"} variant={p.price ? "primary" : "secondary"} wide className="mt-6">
              {p.price ? `Prova ${p.name} gratis` : "Inizia gratis"}
            </LinkButton>
          </article>
        ))}
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
