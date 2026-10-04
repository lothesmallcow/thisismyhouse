import { cookies } from "next/headers";
import { desc, eq, isNull } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { Button, Card, Chip, Field, SectionTitle } from "@/components/ui";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { listPeople, MIN_PASSWORD } from "@/lib/server/accounts";
import { getSettings } from "@/lib/server/settings";
import { changePasswordAction, createInviteAction, createPersonAction, deletePersonAction, revokeInviteAction, setActiveAction, setPersonAction, viewAsAction } from "../../actions";
import { AdminTitle } from "../person";

export const metadata = { title: "Persone" };

export default async function UtentiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const ppl = await listPeople(db);
  const admins = await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users).where(eq(schema.users.role, "admin"));
  const invites = await db.select().from(schema.invites).where(isNull(schema.invites.usedAt)).orderBy(desc(schema.invites.createdAt));
  const settings = await getSettings(db);
  const code = (await cookies()).get("compass_invite")?.value;
  const keys = env.demoMode ? ["default", "studente"] : env.mailboxes.map((m) => m.key);
  const now = new Date();

  return (
    <>
      <Flash code={sp.msg} />
      <AdminTitle title="Persone" description="Ogni persona ha il suo profilo, le sue aziende, le sue candidature. Le offerte arrivate dagli avvisi e-mail di una persona restano visibili solo a lei." />
      {code && (
        <Card className="mb-6 border-accent !p-4">
          <p className="text-[13px] text-muted">Codice di invito (valido 14 giorni, una sola volta). Copialo ora: non verrà mostrato di nuovo.</p>
          <p className="mt-1 font-mono text-[22px] font-semibold tracking-[0.15em]">{code}</p>
          <p className="mt-1 text-[12.5px] text-faint">Link: {env.appUrl}/registrati?invito={code}</p>
        </Card>
      )}

      <div className="space-y-3">
        {ppl.map(({ user, track, onboardedAt }) => (
          <Card key={user.id} className="!p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold">
                  {user.name || user.email} {!user.active && <Chip tone="bad">disattivato</Chip>}
                </p>
                <p className="text-[13px] text-muted">
                  {user.email} · {track === "stage" ? "stage" : "lavoro"} · {onboardedAt ? "questionario completato" : "questionario da completare"}
                  {user.lastLoginAt ? ` · ultimo accesso ${formatWhen(user.lastLoginAt, now)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <form action={viewAsAction}>
                  <input type="hidden" name="u" value={user.id} />
                  <Button size="sm">Apri la sua app</Button>
                </form>
                <form action={setActiveAction}>
                  <input type="hidden" name="u" value={user.id} />
                  <input type="hidden" name="active" value={user.active ? "0" : "1"} />
                  <Button variant="secondary" size="sm">
                    {user.active ? "Disattiva" : "Riattiva"}
                  </Button>
                </form>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] text-muted">Casella, e-mail del mattino, password, eliminazione</summary>
              <form action={setPersonAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                <input type="hidden" name="u" value={user.id} />
                <Field label="Nome" htmlFor={`name-${user.id}`}>
                  <input id={`name-${user.id}`} name="name" type="text" defaultValue={user.name} />
                </Field>
                <Field label="Casella e-mail (chiave)" htmlFor={`mb-${user.id}`} hint="MAILBOX_<CHIAVE>_USER nel .env; default = MAILBOX_USER.">
                  <select id={`mb-${user.id}`} name="mailboxKey" defaultValue={user.mailboxKey ?? ""}>
                    <option value="">Nessuna</option>
                    {[...new Set([...keys, ...(user.mailboxKey ? [user.mailboxKey] : [])])].map((k) => (
                      <option key={k} value={k}>
                        {k}
                        {!env.demoMode && !env.mailboxes.some((m) => m.key === k) ? " (non configurata)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="E-mail del mattino a" htmlFor={`dg-${user.id}`} hint="Vuoto: l'e-mail di accesso.">
                  <input id={`dg-${user.id}`} name="digestEmail" type="email" defaultValue={user.digestEmail ?? ""} />
                </Field>
                <div className="sm:col-span-3">
                  <Button variant="secondary" size="sm">
                    Salva
                  </Button>
                </div>
              </form>
              <form action={changePasswordAction} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <Field label={`Nuova password (almeno ${MIN_PASSWORD} caratteri)`} htmlFor={`pw-${user.id}`}>
                  <input id={`pw-${user.id}`} name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
                </Field>
                <Button variant="secondary" size="sm">
                  Cambia password
                </Button>
              </form>
              <form action={deletePersonAction} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="u" value={user.id} />
                <Field label="Per eliminare l'account con tutti i dati, scrivi ELIMINA" htmlFor={`del-${user.id}`}>
                  <input id={`del-${user.id}`} name="confirm" type="text" autoComplete="off" />
                </Field>
                <Button variant="danger" size="sm">
                  Elimina account
                </Button>
              </form>
            </details>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle className="!mt-0">Crea un account</SectionTitle>
          <Card className="!p-4">
            <form action={createPersonAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome" htmlFor="new-name">
                <input id="new-name" name="name" type="text" required />
              </Field>
              <Field label="E-mail di accesso" htmlFor="new-email">
                <input id="new-email" name="email" type="email" required />
              </Field>
              <Field label={`Password provvisoria (${MIN_PASSWORD}+)`} htmlFor="new-pw">
                <input id="new-pw" name="password" type="text" autoComplete="off" minLength={MIN_PASSWORD} required />
              </Field>
              <Field label="Cerca" htmlFor="new-track">
                <select id="new-track" name="track" defaultValue="lavoro">
                  <option value="lavoro">Lavoro</option>
                  <option value="stage">Stage</option>
                </select>
              </Field>
              <Field label="Casella e-mail" htmlFor="new-mb">
                <select id="new-mb" name="mailboxKey" defaultValue="">
                  <option value="">Nessuna per ora</option>
                  {keys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="self-end">
                <Button size="sm">Crea</Button>
              </div>
            </form>
          </Card>
        </section>

        <section>
          <SectionTitle className="!mt-0">Inviti</SectionTitle>
          <Card className="!p-4">
            <p className="text-[13px] text-muted">
              Registrazione: <strong className="text-ink">{settings.registration === "open" ? "aperta a tutti" : settings.registration === "invite" ? "solo con invito" : "chiusa"}</strong> (si cambia in Fonti e impostazioni).
            </p>
            <form action={createInviteAction} className="mt-3 flex flex-wrap items-end gap-2">
              <Field label="Nota (per chi è)" htmlFor="inv-note">
                <input id="inv-note" name="note" type="text" />
              </Field>
              <Button size="sm">Crea invito</Button>
            </form>
            {invites.length > 0 && (
              <ul className="mt-4 divide-y divide-line rounded-lg border border-line text-[13px]">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>
                      {i.note || "Invito"} · {i.revoked ? "revocato" : i.expiresAt < now ? "scaduto" : `scade ${formatWhen(i.expiresAt, now)}`}
                    </span>
                    {!i.revoked && i.expiresAt > now && (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="id" value={i.id} />
                        <Button variant="ghost" size="sm">
                          Revoca
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <SectionTitle>Amministratori</SectionTitle>
      {admins.map((a) => (
        <Card key={a.id} className="!p-4">
          <p className="text-[14px] font-medium">{a.email}</p>
          <form action={changePasswordAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="userId" value={a.id} />
            <Field label={`Nuova password (almeno ${MIN_PASSWORD} caratteri)`} htmlFor={`apw-${a.id}`}>
              <input id={`apw-${a.id}`} name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
            </Field>
            <Button variant="secondary" size="sm">
              Cambia password
            </Button>
          </form>
        </Card>
      ))}
    </>
  );
}
