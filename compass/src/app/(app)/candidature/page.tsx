import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { IconMail } from "@/components/icons";
import { Button, Card, Chip, Empty, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { formatDate, nowMs, romeDateKey } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import type { ApplicationStatus } from "@/lib/db/schema";
import { listMine } from "@/lib/server/applications";
import { requireUser } from "@/lib/server/auth";
import { pendingReplies } from "@/lib/server/replies";
import { confirmReplyAction, dismissReplyAction } from "../actions";

export const metadata = { title: "Candidature" };

const STATUS: Partial<Record<ApplicationStatus, { text: string; tone: "neutral" | "accent" | "good" | "warn" | "bad" }>> = {
  sending: { text: "In invio", tone: "accent" },
  sent: { text: "Inviata", tone: "neutral" },
  applied_site: { text: "Inviata sul sito", tone: "neutral" },
  replied: { text: "Risposta ricevuta", tone: "accent" },
  interview: { text: "Colloquio", tone: "good" },
  offer: { text: "Offerta", tone: "good" },
  rejected: { text: "Non selezionata", tone: "neutral" },
  failed: { text: "Invio non riuscito", tone: "bad" },
};

const SUGGEST: Partial<Record<ApplicationStatus, string>> = {
  interview: "Sembra un invito a un colloquio.",
  rejected: "Sembra una risposta negativa.",
  offer: "Sembra una proposta di lavoro.",
  replied: "Segnare come “Risposta ricevuta”?",
};

export default async function CandidaturePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const replies = await pendingReplies(db, user.id);
  const mine = await listMine(db, user.id);
  const log = await db.select().from(schema.sendLog).where(and(eq(schema.sendLog.userId, user.id))).orderBy(desc(schema.sendLog.at)).limit(30);
  const now = nowMs();
  const week = mine.filter((m) => m.app.sentAt && now - m.app.sentAt.getTime() < 7 * 86400000).length;
  const answered = mine.filter((m) => ["replied", "interview", "offer", "rejected"].includes(m.app.status)).length;
  const interviews = mine.filter((m) => ["interview", "offer"].includes(m.app.status)).length;

  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader title="Candidature" description="Le tue candidature e le risposte ricevute. Le risposte arrivano qui da sole." />

      {replies.map(({ reply, app }) => (
        <Card key={reply.id} className="mb-4 border-accent/40">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <IconMail size={17} className="text-accent" /> Risposta da {app.company ?? reply.fromName ?? reply.fromEmail}
          </p>
          <p className="mt-0.5 text-[12.5px] text-faint">
            {formatDate(reply.receivedAt)} · {reply.subject}
          </p>
          <blockquote className="mt-3 border-l-2 border-line-strong pl-3 text-[14px] text-muted">{reply.snippet}</blockquote>
          {reply.suggestedStatus && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="mr-2 text-[13.5px]">{SUGGEST[reply.suggestedStatus] ?? "Aggiorno la candidatura?"}</p>
              <form action={confirmReplyAction}>
                <input type="hidden" name="replyId" value={reply.id} />
                <Button size="sm">Segna come {STATUS[reply.suggestedStatus]?.text.toLowerCase() ?? "risposta"}</Button>
              </form>
              <form action={dismissReplyAction}>
                <input type="hidden" name="replyId" value={reply.id} />
                <Button variant="ghost" size="sm">
                  Ignora
                </Button>
              </form>
            </div>
          )}
        </Card>
      ))}

      {mine.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="In tutto" value={mine.length} />
          <Stat label="Questa settimana" value={week} />
          <Stat label="Risposte" value={answered} />
          <Stat label="Colloqui" value={interviews} />
        </div>
      )}

      {mine.length === 0 ? (
        <Empty title="Ancora nessuna candidatura">Quando ti candidi a un&apos;offerta, la trovi qui.</Empty>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {mine.map(({ app, job }) => {
            const s = STATUS[app.status] ?? { text: app.status, tone: "neutral" as const };
            return (
              <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">
                    {job ? (
                      <Link href={`/offerte/${job.id}`} className="text-ink no-underline hover:underline">
                        {app.company ?? "Azienda"}
                      </Link>
                    ) : (
                      (app.company ?? "Azienda")
                    )}
                  </p>
                  <p className="text-[13px] text-muted">
                    {app.role} · {app.lane === "site" ? "sul sito" : "via e-mail"}
                    {app.sentAt ? ` · ${formatDate(app.sentAt)}` : ""}
                    {app.simulated ? " · prova" : ""}
                  </p>
                </div>
                <Chip tone={s.tone}>{s.text}</Chip>
              </div>
            );
          })}
        </div>
      )}

      {log.length > 0 && (
        <>
          <SectionTitle>Registro invii</SectionTitle>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface text-[13px]">
            {log.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <span>
                  {l.status === "sent" ? "Inviata a" : l.status === "simulated" ? "Inviata (prova) a" : l.status === "cancelled" ? "Annullata:" : "Non partita:"} <span className="font-medium">{l.company ?? l.toEmail}</span>
                  {l.cvLabel ? <span className="text-muted"> · {l.cvLabel}</span> : null}
                </span>
                <span className="text-faint">{romeDateKey(l.at) === romeDateKey(new Date(now)) ? "Oggi" : formatDate(l.at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
