import Link from "next/link";
import { Flash } from "@/components/flash";
import { IconCheck, IconMail } from "@/components/icons";
import { Button, Card, Empty, PageHeader, SectionTitle } from "@/components/ui";
import { formatDate, nowMs, romeDateKey } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import type { ApplicationStatus } from "@/lib/db/schema";
import { listMine } from "@/lib/server/applications";
import { pendingReplies } from "@/lib/server/replies";
import { desc } from "drizzle-orm";
import { confirmReplyAction, dismissReplyAction } from "../actions";

export const metadata = { title: "Le mie candidature" };

const STATUS_WORDS: Partial<Record<ApplicationStatus, { text: string; tone: string }>> = {
  sending: { text: "Sta partendo adesso", tone: "bg-navy-soft text-navy" },
  sent: { text: "Inviata, in attesa di risposta", tone: "bg-navy-soft text-navy" },
  applied_site: { text: "Candidata sul sito", tone: "bg-navy-soft text-navy" },
  replied: { text: "Ti hanno risposto", tone: "bg-amber text-amber-ink" },
  interview: { text: "Colloquio", tone: "bg-sage text-sage-ink" },
  offer: { text: "Proposta di lavoro!", tone: "bg-sage text-sage-ink" },
  rejected: { text: "Non selezionata", tone: "bg-mist text-mist-ink" },
  failed: { text: "Non è partita: ci penso io", tone: "bg-rose text-rose-ink" },
};

const SUGGEST_QUESTION: Partial<Record<ApplicationStatus, string>> = {
  interview: "Sembra un invito a un colloquio. Lo segno così?",
  rejected: "Sembra che non ti abbiano scelta, mi dispiace. Lo segno così?",
  offer: "Sembra una proposta di lavoro! Lo segno così?",
  replied: "Lo segno come “Ti hanno risposto”?",
};

export default async function CandidaturePage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const replies = await pendingReplies(db);
  const mine = await listMine(db);
  const log = await db.select().from(schema.sendLog).orderBy(desc(schema.sendLog.at)).limit(30);
  const now = nowMs();
  const week = mine.filter((m) => m.app.sentAt && now - m.app.sentAt.getTime() < 7 * 86400000).length;

  return (
    <>
      <Flash code={sp.msg} />
      <PageHeader title="Le mie candidature" help="Qui vedi a chi ti sei candidata e chi ti ha risposto. Quando arriva una risposta te lo dico io." />

      {replies.map(({ reply, app }) => (
        <Card key={reply.id} className="rise mb-5 border-2 border-sage-ink/30 bg-sage/40">
          <p className="flex items-start gap-2 font-serif text-[1.45rem] font-semibold">
            <IconMail /> Hai ricevuto una risposta da {app.company ?? reply.fromName ?? reply.fromEmail}!
          </p>
          <p className="mt-1 text-ink-soft">{formatDate(reply.receivedAt)} · {reply.subject}</p>
          <blockquote className="mt-3 rounded-xl bg-card px-4 py-3 text-[1.02rem]">{reply.snippet}</blockquote>
          <p className="mt-3 text-[0.98rem]">Leggi l&apos;e-mail completa nella casella della ricerca di lavoro.</p>
          {reply.suggestedStatus && (
            <div className="mt-4">
              <p className="font-bold">{SUGGEST_QUESTION[reply.suggestedStatus] ?? "Aggiorno la candidatura?"}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <form action={confirmReplyAction}>
                  <input type="hidden" name="replyId" value={reply.id} />
                  <Button variant="success" wide>
                    <IconCheck /> Sì, va bene
                  </Button>
                </form>
                <form action={dismissReplyAction}>
                  <input type="hidden" name="replyId" value={reply.id} />
                  <Button variant="secondary" wide>
                    No, lascia stare
                  </Button>
                </form>
              </div>
            </div>
          )}
        </Card>
      ))}

      {mine.length > 0 && (
        <p className="mb-5 rounded-2xl border border-line bg-card px-4 py-3">
          Questa settimana ti sei candidata a <strong>{week}</strong> {week === 1 ? "offerta" : "offerte"}. In tutto: <strong>{mine.length}</strong>.
        </p>
      )}

      {mine.length === 0 ? (
        <Empty title="Ancora nessuna candidatura">Quando ti candidi a un&apos;offerta, la trovi qui.</Empty>
      ) : (
        <div className="space-y-4">
          {mine.map(({ app, job }) => {
            const s = STATUS_WORDS[app.status] ?? { text: app.status, tone: "bg-mist text-mist-ink" };
            return (
              <Card key={app.id} className="!p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[1.25rem] font-bold">{app.company ?? "Azienda"}</p>
                    <p>{app.role}</p>
                  </div>
                  <span className={`rounded-full px-3.5 py-1.5 text-[0.95rem] font-bold ${s.tone}`}>{s.text}</span>
                </div>
                <p className="mt-2 text-[0.98rem] text-ink-soft">
                  {app.lane === "site" ? "Sul sito dell'annuncio" : "Via e-mail"}
                  {app.sentAt ? ` · ${formatDate(app.sentAt)}` : ""}
                  {app.simulated ? " · in modalità prova" : ""}
                </p>
                {job && (
                  <Link href={`/offerte/${job.id}`} className="mt-2 inline-flex min-h-[48px] items-center font-bold">
                    Rivedi l&apos;offerta
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {log.length > 0 && (
        <>
          <SectionTitle>Registro degli invii</SectionTitle>
          <ul className="space-y-2">
            {log.map((l) => (
              <li key={l.id} className="rounded-xl border border-line bg-card px-4 py-3 text-[1rem]">
                {romeDateKey(l.at) === romeDateKey(new Date(now)) ? "Oggi" : formatDate(l.at)}:{" "}
                {l.status === "sent"
                  ? `inviata a ${l.company ?? l.toEmail}`
                  : l.status === "simulated"
                    ? `inviata (per prova) a ${l.company ?? l.toEmail}`
                    : l.status === "cancelled"
                      ? `annullata quella per ${l.company ?? l.toEmail}`
                      : `non partita quella per ${l.company ?? l.toEmail}`}
                {l.cvLabel ? `, con il ${l.cvLabel}` : ""}.
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
