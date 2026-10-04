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
  const names = new Map((await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users)).map((u) => [u.id, u.name || u.email]));
  const sent = await db.select().from(schema.applications).where(inArray(schema.applications.status, ["sent"]));
  const queued = await db.select().from(schema.applications).where(eq(schema.applications.status, "queued"));
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[22px] font-semibold">Posta (modalità prova)</h1>
      <p className="mt-2 max-w-3xl text-muted">In modalità prova ogni e-mail che Compass &ldquo;invia&rdquo; finisce qui, non su internet. Da qui puoi anche simulare cose che altrimenti richiederebbero tempo.</p>
      {!env.demoMode && (
        <div className="mt-4">
          <Notice tone="warn">Sei in modalità reale: gli strumenti di prova sono disattivati.</Notice>
        </div>
      )}
      {env.demoMode && (
        <>
          <SectionTitle>Strumenti di prova</SectionTitle>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <p className="font-semibold">Invia subito la coda ({queued.length})</p>
              <p className="mt-1 text-muted">Salta l&apos;attesa: un orologio simulato avanza fino all&apos;orario di ogni invio, quindi le e-mail restano distanziate e dentro la finestra lun-ven 8:30-18 (le date nel registro sono quelle simulate).</p>
              <form action={flushQueueDemoAction} className="mt-4">
                <Button variant="secondary" disabled={queued.length === 0}>
                  Invia la coda adesso
                </Button>
              </form>
            </Card>
            <Card>
              <p className="font-semibold">Simula la risposta di un&apos;azienda</p>
              <p className="mt-1 text-muted">Mette nella casella di prova una risposta collegata alla candidatura scelta, poi controlla le risposte.</p>
              <div className="mt-4 space-y-2">
                {sent.length === 0 && <p className="text-muted">Prima invia almeno una candidatura.</p>}
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
      {out.length === 0 && <p className="text-muted">Ancora nessuna e-mail.</p>}
      <div className="space-y-4">
        {out.map((o) => (
          <Card key={o.id}>
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">
              {o.kind}{o.userId ? ` · ${names.get(o.userId) ?? ""}` : ""} · {o.at.toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
            </p>
            <p className="mt-1">
              A: <strong>{o.toEmail}</strong>
            </p>
            <p className="font-semibold">{o.subject}</p>
            {o.attachmentName && <p className="text-muted">Allegato: {o.attachmentName}</p>}
            <pre tabIndex={0} role="region" aria-label="Contenuto scorrevole" className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-subtle p-4 font-sans text-[13px]">{o.text}</pre>
            <p className="mt-2 font-mono text-[11px] text-muted">{o.messageId}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
