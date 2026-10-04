import Link from "next/link";
import { redirect } from "next/navigation";
import { IconBuilding, IconCheck, IconMail, IconSparkle, IconStar } from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { currentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  { Icon: IconBuilding, title: "Le aziende che scegli tu", text: "Un catalogo di boutique, banche, fondi, consulenza, startup e brand, più quelle che aggiungi. Le loro offerte salgono in cima, o diventano le uniche." },
  { Icon: IconSparkle, title: "Suggerimenti dal tuo CV", text: "Compass legge il tuo CV e i tuoi interessi e ti propone aziende simili a quelle che hai scelto, spiegando perché." },
  { Icon: IconStar, title: "Classifica spiegata", text: "Ogni offerta ha un giudizio e i motivi: distanza, retribuzione, requisiti, anno di corso per gli stage. Niente scatole nere." },
  { Icon: IconMail, title: "Candidature con controllo", text: "E-mail preparate per te, inviate solo dopo la tua conferma, una alla volta, con 15 minuti per annullare." },
];

const PREVIEW = [
  { t: "Stage M&A Analyst", c: "Esempio Advisory Partners · Milano", r: ["È uno stage", "Azienda scelta", "Aperto ai primi anni"], l: "Molto adatta" },
  { t: "Venture Capital Intern", c: "Fondo Venture Esempio · Milano", r: ["Settore: venture capital", "Retribuito"], l: "Molto adatta" },
  { t: "Impiegata amministrativa", c: "Ferramenta Esempio · Torino", r: ["È il ruolo che cerchi", "A 4 km da casa"], l: "Molto adatta" },
];

export default async function Home() {
  if ((await currentUser())?.role === "user") redirect("/offerte");
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8">
      <section className="grid grid-cols-1 items-center gap-12 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div>
          <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-accent">Lavoro e stage, in Italia</p>
          <h1 className="mt-3 text-[36px] font-semibold leading-[1.08] tracking-tight sm:text-[48px]">Le offerte giuste, dalle aziende che scegli.</h1>
          <p className="mt-5 max-w-xl text-[16px] text-muted">
            Compass raccoglie le offerte dagli avvisi che già ricevi e da fonti pubbliche, le ordina per te spiegando il perché, e ti aiuta a candidarti senza perdere il controllo.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <LinkButton href="/registrati">Crea un account</LinkButton>
            <LinkButton href="/entra" variant="secondary">
              Entra
            </LinkButton>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
            {["Nessun accesso ai tuoi account LinkedIn o Indeed", "Ogni invio va confermato", "Dati cancellabili in ogni momento"].map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <IconCheck size={14} className="text-accent" /> {x}
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden="true" className="rounded-[16px] border border-line bg-subtle p-3 sm:p-4">
          <div className="space-y-2.5">
            {PREVIEW.map((p) => (
              <div key={p.t} className="rounded-[10px] border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14.5px] font-semibold">{p.t}</p>
                    <p className="text-[12.5px] text-muted">{p.c}</p>
                  </div>
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-good-soft px-2.5 text-[11.5px] font-medium text-good">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {p.l}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.r.map((r) => (
                    <span key={r} className="rounded-md bg-subtle px-2 py-0.5 text-[11.5px] text-muted">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-28 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2" aria-label="Cosa fa">
        {FEATURES.map(({ Icon, title, text }) => (
          <div key={title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon size={18} />
            </span>
            <div>
              <h2 className="text-[15.5px] font-semibold">{title}</h2>
              <p className="mt-1 text-[14px] text-muted">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-28 rounded-[16px] border border-line bg-surface px-6 py-10 text-center sm:px-12">
        <h2 className="text-[22px] font-semibold">Pronto in cinque minuti</h2>
        <p className="mx-auto mt-2 max-w-xl text-[14.5px] text-muted">Un breve questionario: cosa cerchi, dove, quali aziende ti interessano. Il resto lo fa Compass, ogni mattina.</p>
        <div className="mt-6 flex justify-center gap-2">
          <LinkButton href="/registrati">Inizia</LinkButton>
          <LinkButton href="/abbonamento" variant="ghost">
            Vedi i prezzi
          </LinkButton>
        </div>
        <p className="mt-6 text-[12.5px] text-faint">
          Hai un codice di invito? <Link href="/registrati">Usalo qui</Link>.
        </p>
      </section>
    </div>
  );
}
