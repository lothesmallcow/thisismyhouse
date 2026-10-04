import { desc, eq, inArray } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { Button, Card, Notice, SectionTitle } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { flushQueueDemoAction, simulateReplyAction } from "../../actions";

export const metadata = { title: "Posta demo" };

export default async function PostaPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const out = await db.select().from(schema.outbox).orderBy(desc(schema.outbox.at)).limit(50);
  const sent = await db.select().from(schema.applications).where(inArray(schema.applications.status, ["sent"]));
  const queued = await db.select().from(schema.applications).where(eq(schema.applications.status, "queued"));
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Posta (modalità prova)</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">In modalità prova ogni e-mail che Compass &ldquo;invia&rdquo; finisce qui, non su internet. Da qui puoi anche simulare cose che altrimenti richiederebbero tempo.</p>
      {!env.demoMode && (
        <div className="mt-4">
          <Notice tone="warn">Sei in modalità reale: gli strumenti di prova sono disattivati.</Notice>
        </div>
      )}
      {env.demoMode && (
        <>
          <SectionTitle>Strumenti di prova</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="font-bold">Invia subito la coda ({queued.length})</p>
              <p className="mt-1 text-ink-soft">Salta l&apos;attesa: un orologio simulato avanza fino all&apos;orario di ogni invio, quindi le e-mail restano distanziate e dentro la finestra lun-ven 8:30-18 (le date nel registro sono quelle simulate).</p>
              <form action={flushQueueDemoAction} className="mt-4">
                <Button variant="secondary" disabled={queued.length === 0}>
                  Invia la coda adesso
                </Button>
              </form>
            </Card>
            <Card>
              <p className="font-bold">Simula la risposta di un&apos;azienda</p>
              <p className="mt-1 text-ink-soft">Mette nella casella di prova una risposta collegata alla candidatura scelta, poi controlla le risposte.</p>
              <div className="mt-4 space-y-2">
                {sent.length === 0 && <p className="text-ink-soft">Prima invia almeno una candidatura.</p>}
                {sent.slice(0, 6).map((a) => (
                  <form key={a.id} action={simulateReplyAction}>
                    <input type="hidden" name="appId" value={a.id} />
                    <Button variant="secondary" wide>
                      Risposta da {a.company}
                    </Button>
                  </form>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
      <SectionTitle>Outbox</SectionTitle>
      {out.length === 0 && <p className="text-ink-soft">Ancora nessuna e-mail.</p>}
      <div className="space-y-4">
        {out.map((o) => (
          <Card key={o.id}>
            <p className="text-[0.92rem] font-bold uppercase tracking-wide text-ink-soft">
              {o.kind} · {o.at.toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
            </p>
            <p className="mt-1">
              A: <strong>{o.toEmail}</strong>
            </p>
            <p className="font-bold">{o.subject}</p>
            {o.attachmentName && <p className="text-ink-soft">Allegato: {o.attachmentName}</p>}
            <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-4 font-sans text-[0.95rem]">{o.text}</pre>
            <p className="mt-2 font-mono text-[0.75rem] text-ink-soft">{o.messageId}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
