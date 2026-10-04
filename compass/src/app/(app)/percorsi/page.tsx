import { sheetFor } from "@/lib/catalog/role-sheets";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { IconSparkle } from "@/components/icons";
import { Button, Card, Chip, Empty, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { STAGE_LABELS } from "@/lib/core/career-stage";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { careerPaths, experienceCount, interestProfile, outreachTargets, studentAdvice, topThemes } from "@/lib/server/career";
import { background } from "@/lib/server/person";
import { setPrefAction } from "../actions";

export const metadata = { title: "Percorsi" };

export default async function PercorsiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const ip = await interestProfile(db, user.id);
  const [paths, nExp, targets, bg] = await Promise.all([careerPaths(db, user.id, 6, ip), experienceCount(db, user.id), outreachTargets(db, user.id, 10), background(db, user.id, ip.profile)]);
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
                  {p.roles.map((r, i) => {
                    const sheet = sheetFor(r);
                    return (
                      <span key={r}>
                        {i > 0 && " · "}
                        {sheet ? <Link href={`/ruoli/${sheet.id}`}>{r}</Link> : r}
                      </span>
                    );
                  })}
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

      <section id="aziende" className="scroll-mt-20">
        <SectionTitle>Dove proporti, anche senza un annuncio</SectionTitle>
        <p className="-mt-1 mb-3 text-[13.5px] text-muted">
          Aziende a cui scrivere una candidatura spontanea: prima la tua zona e i paesi che hai scelto{bg.currentEmployers.length ? `, mai la tua azienda attuale (${bg.currentEmployers.join(", ")})` : ""}. Il ruolo da proporre lo scegli tu: guarda le <Link href="/ruoli">schede dei ruoli</Link>.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[
            { title: "Nel tuo campo: stesso lavoro, nuova azienda", list: targets.inField },
            { title: "Cambio di settore: settori vicini", list: targets.shift },
          ].map((block) => (
            <Card key={block.title} className="!p-4">
              <p className="text-[14px] font-semibold">{block.title}</p>
              {block.list.length === 0 ? (
                <p className="mt-2 text-[13px] text-muted">Aggiungi le tue esperienze o scegli dei settori per avere suggerimenti.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {block.list.map((t) => (
                    <li key={t.company.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium">{t.company.name}</p>
                        <p className="text-[12px] text-faint">{[t.sector, t.company.city, t.why].filter(Boolean).join(" · ")}</p>
                      </div>
                      <LinkButton href={`/percorsi/scrivi?azienda=${t.company.id}`} size="sm" variant="secondary" aria-label={`Scrivi a ${t.company.name}`}>
                        Scrivi
                      </LinkButton>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>

      <SectionTitle>Vuoi cambiare strada?</SectionTitle>
      <p className="-mt-1 text-[13.5px] text-muted">
        Puoi rifare il questionario da capo (le risposte restano compilate) oppure cambiare solo una cosa dal <Link href="/profilo">profilo</Link>. Le offerte si riordinano subito.
      </p>
    </>
  );
}
