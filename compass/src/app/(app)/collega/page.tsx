import { eq } from "drizzle-orm";
import { AutoRefresh } from "@/components/auto-refresh";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { IconCheck, IconExternal } from "@/components/icons";
import { Button, Card, Chip, Notice, PageHeader } from "@/components/ui";
import { HOW_TO, levelFor, planAlerts } from "@/lib/core/alert-plan";
import { countryName, homeCountries } from "@/lib/core/geo";
import { gmailFilter, platformsFor } from "@/lib/core/platforms";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { searchCodeFor } from "@/lib/pipeline/search-terms";
import { requireUser } from "@/lib/server/auth";
import { getPrefs, listSectors } from "@/lib/server/catalog";
import { alertsDone, alertsReceived, baseMailbox, forwardingConfirmationFor, personalInbox } from "@/lib/server/inbox";
import { background } from "@/lib/server/person";
import { getProfile } from "@/lib/server/profile";
import { checkInboxNowAction, toggleAlertDoneAction } from "../actions";

export const metadata = { title: "Collega le fonti" };
export const maxDuration = 60;

const step = (n: number, title: string, done = false) => (
  <h2 className="flex items-center gap-2.5 text-[16px] font-semibold">
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] ${done ? "bg-good-soft text-good" : "bg-subtle text-ink"}`}>{done ? <IconCheck size={15} /> : n}</span>
    {title}
  </h2>
);

const ext = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink no-underline hover:bg-subtle";

/** Guided setup: accounts on the right job sites, the right alerts, and the alerts forwarded to Compass. */
export default async function CollegaPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const p = await getProfile(db, user.id);
  const [address, code, done, received, sectors, prefs, bg, fwd, u, checkRow] = await Promise.all([
    personalInbox(db, user.id),
    searchCodeFor(db, user.id),
    alertsDone(db, user.id),
    alertsReceived(db, user.id),
    listSectors(db, user.id),
    getPrefs(db, user.id),
    background(db, user.id, p),
    forwardingConfirmationFor(db, user.id),
    db.query.users.findFirst({ where: eq(schema.users.id, user.id) }),
    db.query.settings.findFirst({ where: eq(schema.settings.key, "inbox_check_at") }),
  ]);
  const base = baseMailbox();
  // Their sign-in address is the mailbox Compass reads: their alerts arrive there already.
  const ownMailbox = Boolean(base && u?.email.toLowerCase() === base.toLowerCase());
  const countries = homeCountries(p.countries, p.city);
  const careers = sectors.filter((s) => prefs.sectors.get(s.id) === "like").map((s) => s.slug);
  const platforms = platformsFor(countries, p.track, careers);
  const alerts = planAlerts(code.queries, levelFor(p.track, bg.person.years));
  const filter = gmailFilter(platforms);
  const now = new Date();
  const lastCheck = typeof checkRow?.value === "string" ? new Date(checkRow.value) : null;
  const checking = lastCheck != null && now.getTime() - lastCheck.getTime() < 45_000;
  const got = (key: string) => [...received.entries()].filter(([s]) => s.startsWith(`email:${key}`)).map(([, d]) => d).sort((a, b) => b.getTime() - a.getTime())[0];
  const anyReceived = received.size > 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Flash code={sp.msg} />
      {checking && <AutoRefresh everyMs={5000} times={9} />}
      <PageHeader
        title="Collega le fonti"
        description="Gli avvisi di LinkedIn, Indeed e degli altri siti sono la fonte migliore di offerte: arrivano ogni giorno, già filtrati. Qui li imposti nel modo giusto e li fai arrivare a Compass, in cinque passi. Nessuna password da dare: Compass legge solo gli avvisi che gli inoltri."
      />

      {!base && <Notice tone="warn">La casella e-mail di Compass non è ancora configurata: chiedi all&apos;amministratore (MAILBOX_USER).</Notice>}

      <div className="space-y-4">
        <Card>
          {step(1, "Il tuo indirizzo Compass", Boolean(address))}
          {ownMailbox ? (
            <p className="mt-2 text-[14px] text-muted">Il tuo indirizzo di accesso è la casella che Compass legge: gli avvisi che arrivano lì sono già tuoi. Puoi saltare il passo 4.</p>
          ) : address ? (
            <>
              <p className="mt-2 text-[14px] text-muted">È il tuo indirizzo personale per gli avvisi: quello che ci arriva lo vedi solo tu.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg bg-subtle px-3 py-2 text-[14px]">{address}</code>
                <CopyButton text={address} size="sm" />
              </div>
            </>
          ) : null}
        </Card>

        <Card>
          {step(2, "Crea gli account sui siti giusti")}
          <p className="mt-2 text-[14px] text-muted">
            Per {p.track === "stage" ? "gli stage" : "il lavoro"} in {countries.map(countryName).join(", ")}
            {careers.length ? " e per le carriere che hai scelto" : ""}. Usa la tua e-mail di sempre.
          </p>
          <ul className="mt-3 space-y-2.5">
            {platforms.map((pl) => (
              <li key={pl.key} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14px]">
                  <span className="font-medium">{pl.name}</span> <span className="text-muted">· {pl.why}</span>
                </span>
                <a href={pl.signup} target="_blank" rel="noopener noreferrer" className={ext}>
                  Crea l&apos;account <IconExternal size={13} />
                </a>
              </li>
            ))}
            {p.track === "stage" && <li className="text-[14px] text-muted">Anche il portale carriere della tua università: lì arrivano stage riservati agli studenti.</li>}
          </ul>
        </Card>

        <Card>
          {step(3, "Crea gli avvisi giusti", alerts.length > 0 && alerts.every((a) => done.has(a.key)))}
          <p className="mt-2 text-[14px] text-muted">
            Ogni link apre la ricerca già filtrata (posizione, città, livello, più recenti). Lì salvala come avviso giornaliero, poi spunta &quot;Fatto&quot;. Poche ricerche precise valgono più di tante generiche.
          </p>
          <div className="mt-4 space-y-2">
            {alerts.map((a) => (
              <div key={a.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">
                    {a.site} · {a.what} · {a.where}
                  </p>
                  <p className="text-[12.5px] text-faint">
                    {a.filters}. {HOW_TO[a.site]}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className={ext}>
                    Apri <IconExternal size={13} />
                  </a>
                  <form action={toggleAlertDoneAction}>
                    <input type="hidden" name="key" value={a.key} />
                    <Button size="sm" variant={done.has(a.key) ? "secondary" : "primary"}>
                      {done.has(a.key) ? "Fatto ✓" : "Fatto"}
                    </Button>
                  </form>
                </div>
              </div>
            ))}
            {platforms.filter((pl) => !["linkedin", "indeed", "infojobs"].includes(pl.key)).map((pl) => (
              <p key={pl.key} className="text-[13px] text-muted">
                Su {pl.name}: crea un avviso con le stesse parole ({alerts[0]?.what ?? "la tua posizione"}) e la stessa città.
              </p>
            ))}
          </div>
        </Card>

        {!ownMailbox && address && (
          <Card>
            {step(4, "Fai arrivare gli avvisi a Compass", anyReceived)}
            <p className="mt-2 text-[14px] text-muted">Un filtro nella tua e-mail inoltra a Compass solo gli avvisi di questi siti, niente altro. Scegli la tua e-mail:</p>
            <details className="mt-3 rounded-lg border border-line px-4 py-3" open>
              <summary className="cursor-pointer text-[14px] font-medium">Gmail</summary>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-[14px] text-muted">
                <li>
                  Apri{" "}
                  <a href="https://mail.google.com/mail/u/0/#settings/fwdandpop" target="_blank" rel="noopener noreferrer">
                    Impostazioni → Inoltro e POP/IMAP
                  </a>{" "}
                  → &quot;Aggiungi un indirizzo di inoltro&quot; → incolla il tuo indirizzo Compass.
                </li>
                <li>
                  Gmail chiede un codice di conferma: arriva a Compass e te lo mostro qui sotto.{" "}
                  {fwd?.code ? (
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <strong className="text-ink">Codice: {fwd.code}</strong> <CopyButton text={fwd.code} size="sm" />
                    </span>
                  ) : (
                    <form action={checkInboxNowAction} className="mt-1.5">
                      <Button size="sm" variant="secondary" disabled={checking}>
                        {checking ? "Controllo in corso…" : "Ho chiesto il codice: controlla ora"}
                      </Button>
                    </form>
                  )}
                </li>
                <li>
                  Crea il filtro: apri{" "}
                  <a href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(filter)}`} target="_blank" rel="noopener noreferrer">
                    questa ricerca in Gmail
                  </a>
                  , premi l&apos;icona dei filtri nella barra di ricerca → &quot;Crea filtro&quot; → &quot;Inoltra a&quot; il tuo indirizzo Compass.
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <code className="break-all rounded bg-subtle px-2 py-1 text-[12px]">{filter}</code>
                    <CopyButton text={filter} size="sm" label="Copia la ricerca" />
                  </span>
                </li>
              </ol>
            </details>
            <details className="mt-2 rounded-lg border border-line px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-medium">Outlook / Hotmail</summary>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-[14px] text-muted">
                <li>
                  Apri{" "}
                  <a href="https://outlook.live.com/mail/0/options/mail/rules" target="_blank" rel="noopener noreferrer">
                    Impostazioni → Posta → Regole
                  </a>{" "}
                  → &quot;Aggiungi una nuova regola&quot;.
                </li>
                <li>Condizione &quot;Da&quot;: aggiungi {platforms.flatMap((pl) => pl.senders).join(", ")}.</li>
                <li>Azione &quot;Reindirizza a&quot; (non &quot;Inoltra&quot;: così il mittente resta quello del sito) → il tuo indirizzo Compass. Salva.</li>
              </ol>
            </details>
            <details className="mt-2 rounded-lg border border-line px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-medium">Altre e-mail (Libero, iCloud, Yahoo...)</summary>
              <p className="mt-2 text-[14px] text-muted">
                Cerca &quot;filtri&quot; o &quot;regole&quot; nelle impostazioni e inoltra al tuo indirizzo Compass la posta di questi mittenti. Più semplice ancora: su Indeed e InfoJobs puoi creare l&apos;avviso direttamente con il tuo indirizzo Compass come e-mail.
              </p>
            </details>
          </Card>
        )}

        <Card>
          {step(5, "Verifica", anyReceived)}
          <ul className="mt-3 space-y-2 text-[14px]">
            {platforms.map((pl) => {
              const d = got(pl.key);
              return (
                <li key={pl.key} className="flex items-center gap-2">
                  {d ? <Chip tone="good">arrivato</Chip> : <Chip>in attesa</Chip>}
                  <span>
                    {pl.name}
                    {d ? <span className="text-muted"> · ultimo avviso {formatWhen(d, now)}</span> : <span className="text-faint"> · il primo avviso arriva di solito entro un giorno</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <form action={checkInboxNowAction} className="mt-4">
            <Button size="sm" variant="secondary" disabled={checking}>
              {checking ? "Controllo in corso…" : "Controlla ora"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
