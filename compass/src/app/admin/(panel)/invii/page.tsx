import { Flash } from "@/components/flash";
import { Button, Card, Field, Notice, SectionTitle } from "@/components/ui";
import { HARD_MAX_PER_DAY } from "@/lib/core/guardrails";
import { formatDate } from "@/lib/core/time";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings, getUserSettings } from "@/lib/server/settings";
import { personSendingAction, realSendingAction, saveGuardrailsAction } from "../../actions";
import { people } from "../person";

export const metadata = { title: "Invii e regole" };

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function InviiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const s = await getSettings(db);
  const g = s.guardrails;
  const ppl = await Promise.all((await people()).map(async (p) => ({ ...p, us: await getUserSettings(db, p.id) })));
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[22px] font-semibold">Invii e regole</h1>
      <p className="mt-2 max-w-3xl text-muted">Ogni candidatura passa da queste regole due volte: quando viene approvata e subito prima di partire.</p>

      <SectionTitle>Invio reale</SectionTitle>
      <Card>
        {env.demoMode ? (
          <Notice tone="info" title="DEMO_MODE=true">
            Finché DEMO_MODE è attivo nessuna e-mail esce dal server, anche con l&apos;interruttore acceso. Per l&apos;invio reale serve DEMO_MODE=false nel file .env (o nei segreti dell&apos;hosting), la casella configurata e questo interruttore.
          </Notice>
        ) : (
          env.mailboxes.length === 0 && <Notice tone="warn">Nessuna casella configurata (MAILBOX_USER / MAILBOX_APP_PASSWORD).</Notice>
        )}
        <p className="mt-4">
          Interruttore: <strong>{s.realSending ? "acceso" : "spento"}</strong>. La prima settimana di ogni persona (max {g.firstWeekCap} al giorno) parte dal suo primo invio reale.
        </p>
        <form action={realSendingAction} className="mt-4">
          <input type="hidden" name="on" value={s.realSending ? "0" : "1"} />
          <Button variant={s.realSending ? "secondary" : "danger"}>{s.realSending ? "Spegni l'invio reale" : "Accendi l'invio reale"}</Button>
        </form>
      </Card>

      <SectionTitle>Regole</SectionTitle>
      <form action={saveGuardrailsAction}>
        <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={`Invii al giorno (max assoluto ${HARD_MAX_PER_DAY})`} htmlFor="dailyCap">
            <input id="dailyCap" name="dailyCap" type="number" min={0} max={HARD_MAX_PER_DAY} defaultValue={g.dailyCap} />
          </Field>
          <Field label="Invii al giorno nella prima settimana" htmlFor="firstWeekCap">
            <input id="firstWeekCap" name="firstWeekCap" type="number" min={0} max={HARD_MAX_PER_DAY} defaultValue={g.firstWeekCap} />
          </Field>
          <Field label="Finestra di invio: dalle (lun-ven, ora italiana)" htmlFor="windowStart">
            <input id="windowStart" name="windowStart" type="text" defaultValue={hhmm(g.windowStartMin)} />
          </Field>
          <Field label="alle" htmlFor="windowEnd">
            <input id="windowEnd" name="windowEnd" type="text" defaultValue={hhmm(g.windowEndMin)} />
          </Field>
          <Field label="Distanza tra invii: minimo (minuti)" htmlFor="spacingMin">
            <input id="spacingMin" name="spacingMin" type="number" min={1} defaultValue={g.spacingMinMinutes} />
          </Field>
          <Field label="massimo (minuti)" htmlFor="spacingMax">
            <input id="spacingMax" name="spacingMax" type="number" min={2} defaultValue={g.spacingMaxMinutes} />
          </Field>
          <Field label="Finestra per annullare (minuti, minimo 15)" htmlFor="undo">
            <input id="undo" name="undo" type="number" min={15} defaultValue={g.undoMinutes} />
          </Field>
          <Field label="Stessa azienda al massimo una volta ogni (giorni)" htmlFor="companyCooldown">
            <input id="companyCooldown" name="companyCooldown" type="number" min={1} defaultValue={g.companyCooldownDays} />
          </Field>
          <Field label="Candidature spontanee: una ogni (giorni)" htmlFor="spontaneousCooldown">
            <input id="spontaneousCooldown" name="spontaneousCooldown" type="number" min={30} defaultValue={g.spontaneousCooldownDays} />
          </Field>
          <div className="sm:col-span-2">
            <Button>Salva le regole</Button>
          </div>
        </Card>
      </form>
      <SectionTitle>Per persona</SectionTitle>
      <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {ppl.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[14px] font-medium">{p.name || p.email}</p>
              <p className="text-[12.5px] text-muted">
                Pilota automatico {p.us.autopilot ? "acceso" : "spento"}
                {p.us.killSwitch ? " · ha fermato i suoi invii" : ""}
                {p.us.goLiveAt ? ` · primo invio reale ${formatDate(p.us.goLiveAt)}` : ""}
              </p>
            </div>
            <div className="flex gap-1.5">
              <form action={personSendingAction}>
                <input type="hidden" name="u" value={p.id} />
                <input type="hidden" name="autopilot" value={p.us.autopilot ? "0" : "1"} />
                <Button variant="secondary" size="sm">
                  {p.us.autopilot ? "Spegni pilota automatico" : "Accendi pilota automatico"}
                </Button>
              </form>
              {p.us.killSwitch && (
                <form action={personSendingAction}>
                  <input type="hidden" name="u" value={p.id} />
                  <input type="hidden" name="killSwitch" value="0" />
                  <Button variant="secondary" size="sm">
                    Riattiva i suoi invii
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-muted">Il pilota automatico invia da solo le offerte &ldquo;Molto adatte&rdquo; con indirizzo e-mail che passano tutte le regole (mai quelle sospette) e rispetta il focus scelto dalla persona.</p>

      <p className="mt-4 text-[13px] text-muted">Filtro truffe: le regole sono in <code>src/lib/core/scam-rules.ts</code>. Lista nera: sezione &ldquo;Blocchi&rdquo;.</p>
    </>
  );
}
