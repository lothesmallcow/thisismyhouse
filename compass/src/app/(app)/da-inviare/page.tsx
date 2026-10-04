import { and, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { Flash } from "@/components/flash";
import { IconDoc, IconSend } from "@/components/icons";
import { Button, Card, Chip, Empty, LevelBadge, LinkButton, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { formatWhen, nowMs } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { cvList, listDrafts, listQueued } from "@/lib/server/applications";
import { requireUser } from "@/lib/server/auth";
import { shellData } from "@/lib/server/shell";
import { cancelAction, killSwitchAction, prepareSpontaneousAction, skipAction } from "../actions";

export const metadata = { title: "Da inviare" };

export default async function DaInviarePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const drafts = await listDrafts(db, user.id);
  const queued = await listQueued(db, user.id);
  const shell = await shellData(db, user.id);
  const cvs = await cvList(db, user.id);
  const cvName = (id: number | null) => cvs.find((c) => c.id === id)?.label ?? "Nessun CV";
  const spontaneous = await db
    .select()
    .from(schema.spontaneousCompanies)
    .where(and(eq(schema.spontaneousCompanies.userId, user.id), eq(schema.spontaneousCompanies.status, "approved")));
  const sentSpont = await db
    .select({ c: schema.applications.spontaneousCompanyId, at: schema.applications.sentAt })
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, user.id), isNotNull(schema.applications.spontaneousCompanyId)));
  const recent = new Set(sentSpont.filter((s) => s.c && s.at && nowMs() - s.at.getTime() < 182 * 86400000).map((s) => s.c));
  const openSpont = new Set(drafts.filter((d) => d.app.spontaneousCompanyId).map((d) => d.app.spontaneousCompanyId));
  const sendable = drafts.filter((d) => d.app.warnings.length === 0);
  const stopped = shell.killSwitch || shell.adminStop;

  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader
        title="Da inviare"
        description="Candidature via e-mail pronte. Controlla il testo, poi invia o metti da parte."
        actions={
          sendable.length > 1 && !stopped ? (
            <LinkButton href="/da-inviare/tutte" size="sm">
              <IconSend size={15} /> Invia tutte ({sendable.length})
            </LinkButton>
          ) : undefined
        }
      />

      <div className="space-y-3 empty:hidden">
        {shell.sendingPaused && (
          <Notice tone="info" title="Invio reale non ancora attivo">
            {shell.hasMailbox ? "Puoi approvare le candidature: partiranno quando l'amministratore attiverà l'invio." : "Al tuo account non è ancora collegata una casella e-mail: chiedi all'amministratore. Intanto puoi candidarti sui siti."}
          </Notice>
        )}
        {shell.adminStop && <Notice tone="warn" title="Invii in pausa">L&apos;amministratore ha fermato gli invii. Nessuna candidatura partirà finché non li riattiva.</Notice>}
        {shell.killSwitch && (
          <Notice tone="warn" title="Hai fermato gli invii">
            <form action={killSwitchAction} className="mt-2">
              <input type="hidden" name="on" value="0" />
              <Button size="sm">Riattiva gli invii</Button>
            </form>
          </Notice>
        )}
      </div>

      {queued.length > 0 && (
        <>
          <SectionTitle className="!mt-6">In partenza</SectionTitle>
          <div className="space-y-2">
            {queued.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{q.company ?? "Azienda"}</p>
                  <p className="text-[13px] text-muted">
                    {q.role} · {q.sendAt && formatWhen(q.sendAt)} · <Countdown at={q.sendAt!.toISOString()} />
                  </p>
                </div>
                <form action={cancelAction}>
                  <input type="hidden" name="appId" value={q.id} />
                  <Button variant="secondary" size="sm">
                    Annulla l&apos;invio
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle className={queued.length ? "" : "!mt-6"}>Pronte · {drafts.length}</SectionTitle>
      {drafts.length === 0 ? (
        <Empty title="Nessuna candidatura da inviare">Apri un&apos;offerta che accetta candidature via e-mail e premi &ldquo;Prepara candidatura&rdquo;.</Empty>
      ) : (
        <div className="space-y-3">
          {drafts.map(({ app, level }) => {
            const blockers = app.warnings.filter((w) => !w.code.startsWith("scam-"));
            const warns = app.warnings.filter((w) => w.code.startsWith("scam-"));
            return (
              <Card key={app.id} id={`candidatura-${app.id}`} className="scroll-mt-20 !p-0">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h3 className="text-[15.5px] font-semibold">{app.company ?? "Azienda"}</h3>
                    <p className="text-[13.5px] text-muted">{app.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.mode === "autopilot" && <Chip>Pilota automatico</Chip>}
                    {level ? <LevelBadge level={level} /> : <Chip tone="accent">Spontanea</Chip>}
                  </div>
                </div>
                <div className="border-y border-line bg-subtle/60 px-4 py-3 sm:px-5">
                  <p className="text-[12.5px] text-faint">
                    A: <span className="text-muted">{app.toEmail}</span>
                  </p>
                  <p className="mt-1 text-[13.5px] font-medium">{app.subject}</p>
                  <div tabIndex={0} role="region" aria-label="Testo dell'e-mail" className="mt-1.5 max-h-44 overflow-auto whitespace-pre-line text-[13.5px] leading-relaxed text-muted">
                    {app.body}
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-faint">
                    <IconDoc size={14} /> Allegato: <span className="text-muted">{cvName(app.cvId)}</span>
                  </p>
                </div>
                {(warns.length > 0 || blockers.length > 0) && (
                  <div className="space-y-2 px-4 pt-3 sm:px-5">
                    {warns.map((w) => (
                      <Notice key={w.code} tone="warn">
                        {w.message}
                      </Notice>
                    ))}
                    {blockers.map((w) => (
                      <Notice key={w.code} tone="danger">
                        {w.message}
                      </Notice>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 p-4 sm:px-5">
                  {blockers.length === 0 && !stopped ? (
                    <LinkButton href={`/da-inviare/${app.id}/conferma`} size="sm">
                      <IconSend size={15} /> Invia
                    </LinkButton>
                  ) : (
                    <span className="text-[13px] text-faint">Non si può inviare</span>
                  )}
                  <LinkButton href={`/da-inviare/${app.id}/modifica`} variant="secondary" size="sm">
                    Modifica
                  </LinkButton>
                  <form action={skipAction} className="ml-auto">
                    <input type="hidden" name="appId" value={app.id} />
                    <Button variant="ghost" size="sm" title="Mette da parte la candidatura: non parte niente">
                      Metti da parte
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {spontaneous.length > 0 && (
        <>
          <SectionTitle>Candidature spontanee</SectionTitle>
          <p className="-mt-1 mb-3 text-[13.5px] text-muted">Aziende che invitano a mandare il CV anche senza annuncio. Al massimo una volta ogni 6 mesi.</p>
          <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {spontaneous.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[14px] font-medium">{c.name}</p>
                  <p className="text-[13px] text-muted">{c.city}</p>
                </div>
                {recent.has(c.id) ? (
                  <span className="text-[13px] text-faint">Scritto di recente</span>
                ) : openSpont.has(c.id) ? (
                  <span className="text-[13px] text-faint">Pronta qui sopra</span>
                ) : (
                  <form action={prepareSpontaneousAction}>
                    <input type="hidden" name="companyId" value={c.id} />
                    <Button variant="secondary" size="sm">
                      Prepara
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!shell.killSwitch && (
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
          <p className="text-[13px] text-muted">Blocca subito tutto quello che è in partenza. Si riattiva quando vuoi.</p>
          <form action={killSwitchAction}>
            <input type="hidden" name="on" value="1" />
            <Button variant="danger" size="sm">
              Ferma tutti gli invii
            </Button>
          </form>
        </div>
      )}
      <p className="mt-4 text-center text-[12.5px] text-faint">
        <Link href="/candidature">Vedi le candidature inviate</Link>
      </p>
    </>
  );
}
