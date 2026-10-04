import { Countdown } from "@/components/countdown";
import { Flash } from "@/components/flash";
import { IconAlert, IconDoc, IconSend, IconStop, IconUndo } from "@/components/icons";
import { Button, Card, Empty, LevelBadge, LinkButton, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { formatWhen, nowMs } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { listDrafts, listQueued } from "@/lib/server/applications";
import { shellData } from "@/lib/server/shell";
import { eq } from "drizzle-orm";
import { cancelAction, killSwitchAction, prepareSpontaneousAction, skipAction } from "../actions";

export const metadata = { title: "Da inviare" };

export default async function DaInviarePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const drafts = await listDrafts(db);
  const queued = await listQueued(db);
  const shell = await shellData(db);
  const cvs = await db.select({ id: schema.cvs.id, label: schema.cvs.label }).from(schema.cvs);
  const cvName = (id: number | null) => cvs.find((c) => c.id === id)?.label ?? "Nessun CV";
  const spontaneous = await db.select().from(schema.spontaneousCompanies).where(eq(schema.spontaneousCompanies.status, "approved"));
  const sentSpont = await db.select({ c: schema.applications.spontaneousCompanyId, at: schema.applications.sentAt }).from(schema.applications);
  const recent = new Set(sentSpont.filter((s) => s.c && s.at && nowMs() - s.at.getTime() < 182 * 86400000).map((s) => s.c));
  const openSpont = new Set(drafts.filter((d) => d.app.spontaneousCompanyId).map((d) => d.app.spontaneousCompanyId));
  const sendable = drafts.filter((d) => d.app.warnings.length === 0);

  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader title="Da inviare" help="Qui ci sono le candidature pronte da mandare via e-mail. Leggile, poi premi Invia oppure Salta." />

      {shell.sendingPaused && (
        <div className="mb-6">
          <Notice tone="info" title="Gli invii non sono ancora attivi">
            Puoi preparare e approvare le candidature: partiranno quando chi ti aiuta con Compass avrà attivato l&apos;invio.
          </Notice>
        </div>
      )}
      {shell.adminStop && (
        <div className="mb-6">
          <Notice tone="warn" title="Gli invii sono in pausa">
            Li ha fermati chi ti aiuta con Compass. Nessuna candidatura partirà finché non li riattiva.
          </Notice>
        </div>
      )}
      {shell.killSwitch && (
        <div className="mb-6">
          <Notice tone="warn" title="Gli invii sono fermi">
            Nessuna candidatura partirà finché non li riattivi.
            <form action={killSwitchAction} className="mt-3">
              <input type="hidden" name="on" value="0" />
              <Button variant="primary">Riattiva gli invii</Button>
            </form>
          </Notice>
        </div>
      )}

      {queued.length > 0 && (
        <>
          <SectionTitle className="!mt-2">In partenza</SectionTitle>
          <div className="space-y-4">
            {queued.map((q) => (
              <Card key={q.id} className="border-navy/30 bg-navy-soft/50">
                <p className="text-[1.15rem] font-bold">{q.company ?? "Azienda"}</p>
                <p>{q.role}</p>
                <p className="mt-2 flex items-center gap-2 text-ink-soft">
                  <IconSend size={20} className="shrink-0" />
                  <span>
                    {q.sendAt && formatWhen(q.sendAt)} · <Countdown at={q.sendAt!.toISOString()} />
                  </span>
                </p>
                <form action={cancelAction} className="mt-4">
                  <input type="hidden" name="appId" value={q.id} />
                  <Button variant="secondary" wide>
                    <IconUndo /> Annulla l&apos;invio
                  </Button>
                </form>
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionTitle className={queued.length ? "" : "!mt-2"}>Pronte ({drafts.length})</SectionTitle>
      {drafts.length === 0 ? (
        <Empty title="Nessuna candidatura da inviare">Quando un&apos;offerta accetta candidature via e-mail, apri l&apos;offerta e premi &ldquo;Prepara la candidatura&rdquo;.</Empty>
      ) : (
        <>
          {sendable.length > 1 && !shell.killSwitch && !shell.adminStop && (
            <LinkButton href="/da-inviare/tutte" wide className="mb-5">
              <IconSend /> Invia tutte ({sendable.length})
            </LinkButton>
          )}
          <div className="space-y-5">
            {drafts.map(({ app, job }) => {
              const blockers = app.warnings.filter((w) => isBlocker(w.code));
              const warns = app.warnings.filter((w) => !isBlocker(w.code));
              return (
                <Card key={app.id} id={`candidatura-${app.id}`} className="scroll-mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {job ? <LevelBadge level={job.level} /> : <span className="rounded-full bg-navy-soft px-3 py-1 font-bold text-navy">Candidatura spontanea</span>}
                    {app.mode === "autopilot" && <span className="text-[0.95rem] text-ink-soft">Preparata dal pilota automatico</span>}
                  </div>
                  <h3 className="mt-3 text-[1.45rem] font-semibold">{app.company ?? "Azienda"}</h3>
                  <p className="text-[1.05rem]">{app.role}</p>
                  <p className="mt-2 flex items-center gap-2 text-[0.98rem] text-ink-soft">
                    <IconDoc size={20} className="shrink-0" />
                    <span>
                      CV allegato: <strong className="text-ink">{cvName(app.cvId)}</strong>
                    </span>
                  </p>
                  <p className="text-[0.98rem] text-ink-soft">
                    La mando a: <strong className="text-ink">{app.toEmail}</strong>
                  </p>

                  <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
                    <p className="text-[0.95rem] font-bold uppercase tracking-wide text-ink-soft">Anteprima dell&apos;e-mail</p>
                    <p className="mt-2 font-bold">{app.subject}</p>
                    <div tabIndex={0} role="region" aria-label="Contenuto scorrevole" className="mt-2 max-h-56 overflow-auto whitespace-pre-line text-[1rem] leading-relaxed">{app.body}</div>
                  </div>

                  {warns.map((w) => (
                    <div key={w.code} className="mt-4">
                      <Notice tone="warn">{w.message}</Notice>
                    </div>
                  ))}
                  {blockers.map((w) => (
                    <div key={w.code} className="mt-4">
                      <Notice tone="danger">{w.message}</Notice>
                    </div>
                  ))}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {blockers.length === 0 && !shell.killSwitch && !shell.adminStop ? (
                      <LinkButton href={`/da-inviare/${app.id}/conferma`}>
                        <IconSend /> Invia
                      </LinkButton>
                    ) : (
                      <span className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-mist px-4 text-center font-bold text-mist-ink">
                        <IconAlert /> Non si può inviare
                      </span>
                    )}
                    <form action={skipAction}>
                      <input type="hidden" name="appId" value={app.id} />
                      <Button variant="secondary" wide>
                        Salta
                      </Button>
                    </form>
                  </div>
                  <p className="mt-2 text-center text-[0.98rem] text-ink-soft">&ldquo;Salta&rdquo; la mette da parte: non parte niente.</p>
                  <LinkButton href={`/da-inviare/${app.id}/modifica`} variant="quiet" wide className="mt-2">
                    Cambia il testo o il CV
                  </LinkButton>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {spontaneous.length > 0 && (
        <>
          <SectionTitle>Candidature spontanee</SectionTitle>
          <p className="mb-4 text-ink-soft">Aziende vicine che invitano a mandare il CV anche senza un annuncio. Al massimo una volta ogni 6 mesi.</p>
          <div className="space-y-3">
            {spontaneous.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 !p-4">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-[0.98rem] text-ink-soft">{c.city}</p>
                </div>
                {recent.has(c.id) ? (
                  <span className="text-ink-soft">Già scritto di recente</span>
                ) : openSpont.has(c.id) ? (
                  <span className="text-ink-soft">Pronta qui sopra</span>
                ) : (
                  <form action={prepareSpontaneousAction}>
                    <input type="hidden" name="companyId" value={c.id} />
                    <Button variant="secondary">Prepara</Button>
                  </form>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {!shell.killSwitch && (
        <form action={killSwitchAction} className="mt-14">
          <input type="hidden" name="on" value="1" />
          <Button variant="danger" wide>
            <IconStop /> Ferma tutti gli invii
          </Button>
          <p className="mt-2 text-center text-[0.98rem] text-ink-soft">Blocca subito tutto quello che è in partenza. Puoi riattivare quando vuoi.</p>
        </form>
      )}
    </>
  );
}

function isBlocker(code: string): boolean {
  return !code.startsWith("scam-");
}
