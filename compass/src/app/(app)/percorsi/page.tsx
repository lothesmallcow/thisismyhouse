import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { IconSparkle } from "@/components/icons";
import { Button, Card, Chip, Empty, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { STAGE_LABELS } from "@/lib/core/career-stage";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { careerPaths, experienceCount, interestProfile, studentAdvice, topThemes } from "@/lib/server/career";
import { setPrefAction } from "../actions";

export const metadata = { title: "Percorsi" };

export default async function PercorsiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const ip = await interestProfile(db, user.id);
  const [paths, nExp] = await Promise.all([careerPaths(db, user.id, 6, ip), experienceCount(db, user.id)]);
  const themes = topThemes(ip, 6);
  const advice = studentAdvice(ip.profile);
  const back = "/percorsi";

  return (
    <>
      <Flash code={sp.msg} />
      <BackLink href="/aziende">Aziende</BackLink>
      <PageHeader
        title="Percorsi per te"
        description="Settori vicini a quello che hai fatto e a quello che ti piace, anche diversi dal tuo attuale: chi vende moda di lusso, per esempio, può vendere yacht o lavorare in un hotel di lusso. Ogni idea dice da dove viene."
        actions={
          <LinkButton href="/benvenuto/1?rifai=1" variant="secondary" size="sm">
            Aggiorna il questionario
          </LinkButton>
        }
      />

      {advice && (
        <Card className="mb-6 !p-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-accent">Il tuo anno: {STAGE_LABELS[advice.stage]}</p>
          <p className="mt-1 text-[15px] font-semibold">Cosa conviene adesso: {advice.best}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13.5px] text-muted">
            {advice.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {advice.stage === "primi-anni" && (
              <LinkButton href="/offerte?tipo=programma" size="sm" variant="secondary">
                Vedi i programmi per studenti
              </LinkButton>
            )}
            <LinkButton href="/offerte?tipo=stage" size="sm" variant="secondary">
              Vedi gli stage
            </LinkButton>
          </div>
          <p className="mt-2 text-[12px] text-faint">Indicazioni generali: date e requisiti cambiano da azienda ad azienda, verificali sempre sull&apos;annuncio.</p>
        </Card>
      )}

      {themes.length > 0 && (
        <div className="mb-6">
          <p className="text-[13px] font-medium">Il tuo profilo in breve</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {themes.map((t) => (
              <span key={t.theme} title={t.why}>
                <Chip tone="accent">{t.label}</Chip>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-faint">
            Da {nExp ? `${nExp} esperienze, ` : ""}settori e aziende scelte, interessi e CV. {nExp === 0 && <Link href="/profilo/esperienze">Aggiungi le tue esperienze</Link>}
            {nExp === 0 ? " per idee più precise." : ""}
          </p>
        </div>
      )}

      {paths.length === 0 ? (
        <Empty title="Ancora poche informazioni" action={<LinkButton href="/profilo/esperienze" size="sm">Aggiungi le tue esperienze</LinkButton>}>
          Carica il CV, aggiungi le tue esperienze o scegli qualche settore: i percorsi arrivano da lì.
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {paths.map((p) => (
            <Card key={p.sector.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{p.sector.name}</p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-[13px] text-muted">
                    <IconSparkle size={14} className="mt-0.5 shrink-0 text-accent" /> {p.reason}
                  </p>
                </div>
                {p.chosen ? (
                  <Chip tone="good">Già tra i tuoi</Chip>
                ) : (
                  <form action={setPrefAction}>
                    <input type="hidden" name="kind" value="sector" />
                    <input type="hidden" name="id" value={p.sector.id} />
                    <input type="hidden" name="stance" value="like" />
                    <input type="hidden" name="back" value={back} />
                    <Button size="sm" variant="secondary">
                      Mi interessa
                    </Button>
                  </form>
                )}
              </div>
              {p.roles.length > 0 && (
                <p className="mt-3 text-[13px]">
                  <span className="text-faint">Ruoli da cercare: </span>
                  {p.roles.join(" · ")}
                </p>
              )}
              {p.examples.length > 0 && (
                <p className="mt-1 text-[13px]">
                  <span className="text-faint">Per esempio: </span>
                  {p.examples.map((c) => c.name).join(", ")}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>Vuoi cambiare strada?</SectionTitle>
      <p className="-mt-1 text-[13.5px] text-muted">
        Puoi rifare il questionario da capo (le risposte restano compilate) oppure cambiare solo una cosa dal <Link href="/profilo">profilo</Link>. Le offerte si riordinano subito.
      </p>
    </>
  );
}
