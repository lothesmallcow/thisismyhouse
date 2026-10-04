import { Flash } from "@/components/flash";
import { Button, Card, Field, Notice, SectionTitle } from "@/components/ui";
import { HARD_MAX_PER_DAY } from "@/lib/core/guardrails";
import { formatDate } from "@/lib/core/time";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/server/settings";
import { realSendingAction, saveGuardrailsAction } from "../../actions";

export const metadata = { title: "Invii e regole" };

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function InviiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings(getDb());
  const g = s.guardrails;
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Invii e regole</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">Ogni candidatura passa da queste regole due volte: quando viene approvata e subito prima di partire.</p>

      <SectionTitle>Invio reale</SectionTitle>
      <Card>
        {env.demoMode ? (
          <Notice tone="info" title="DEMO_MODE=true">
            Finché DEMO_MODE è attivo nessuna e-mail esce dal server, anche con l&apos;interruttore acceso. Per l&apos;invio reale serve DEMO_MODE=false nel file .env (o nei segreti dell&apos;hosting), la casella configurata e questo interruttore.
          </Notice>
        ) : (
          !env.mailbox.configured && <Notice tone="warn">La casella non è configurata (MAILBOX_USER / MAILBOX_APP_PASSWORD).</Notice>
        )}
        <p className="mt-4">
          Interruttore: <strong>{s.realSending ? "acceso" : "spento"}</strong>
          {g.goLiveAt && ` · primo avvio ${formatDate(g.goLiveAt)} (prima settimana: max ${g.firstWeekCap} al giorno)`}
        </p>
        <form action={realSendingAction} className="mt-4">
          <input type="hidden" name="on" value={s.realSending ? "0" : "1"} />
          <Button variant={s.realSending ? "secondary" : "danger"}>{s.realSending ? "Spegni l'invio reale" : "Accendi l'invio reale"}</Button>
        </form>
      </Card>

      <SectionTitle>Regole</SectionTitle>
      <form action={saveGuardrailsAction}>
        <Card className="grid gap-5 sm:grid-cols-2">
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
          <label className="flex min-h-[60px] items-center gap-4 rounded-2xl border-2 border-line bg-white px-4 sm:col-span-2">
            <input type="checkbox" name="autopilot" value="1" defaultChecked={g.autopilot} />
            <span>
              <strong>Pilota automatico</strong>: invia da solo le offerte &ldquo;Molto adatte&rdquo; con indirizzo e-mail che passano tutte le regole (mai quelle sospette).
            </span>
          </label>
          <div className="sm:col-span-2">
            <Button>Salva le regole</Button>
          </div>
        </Card>
      </form>
      <p className="mt-4 text-[0.95rem] text-ink-soft">Filtro truffe: le regole sono in <code>src/lib/core/scam-rules.ts</code>. Lista nera: sezione &ldquo;Blocchi&rdquo;.</p>
    </>
  );
}
