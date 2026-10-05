import Link from "next/link";
import { eq } from "drizzle-orm";
import { AutoRefresh } from "@/components/auto-refresh";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { IconCheck, IconExternal } from "@/components/icons";
import { Button, Card, Chip, LinkButton, Notice } from "@/components/ui";
import { HOW_TO, levelFor, planAlerts } from "@/lib/core/alert-plan";
import { countryName, homeCountries } from "@/lib/core/geo";
import { gmailFilter, platformsFor } from "@/lib/core/platforms";
import { formatWhen } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { searchCodeFor } from "@/lib/pipeline/search-terms";
import { requireUser } from "@/lib/server/auth";
import { getPrefs, listSectors } from "@/lib/server/catalog";
import { alertsDone, alertsReceived, baseMailbox, collegaState, forwardingConfirmationFor, personalInbox } from "@/lib/server/inbox";
import { background } from "@/lib/server/person";
import { getProfile } from "@/lib/server/profile";
import { checkInboxNowAction, collegaStepAction, disconnectGmailAction, linkCompassMailboxAction, toggleAlertDoneAction } from "../actions";
import { ALERT_SENDERS, getMailConnection, gmailConnectAvailable, googleRedirectUri } from "@/lib/server/mail-connections";
import { sameMailbox } from "@/lib/core/inbox-address";
import { env } from "@/lib/env";

export const metadata = { title: "Collega le fonti" };
export const maxDuration = 60;

const STEPS = ["La tua e-mail", "Gli account", "Gli avvisi", "Verifica"];
const ext = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3.5 text-[13.5px] font-medium text-ink no-underline hover:bg-subtle";
const Why = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-3 rounded-lg bg-subtle px-4 py-3 text-[14px] text-muted">
    <span className="font-semibold text-ink">Perché: </span>
    {children}
  </div>
);
const Sub = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-semibold text-accent">{n}</span>
    <div className="min-w-0 flex-1 space-y-2 text-[14px]">{children}</div>
  </li>
);

/** Why "Collega Gmail" failed, in words, with the values to compare in Google Cloud (none of them secret). */
function GmailProblem({ code }: { code: string }) {
  const c = code.toLowerCase();
  const fix =
    c === "stato"
      ? "Il collegamento è scaduto (più di 15 minuti) o è partito da un altro account Compass. Riprova da qui."
      : c === "config"
        ? "Su Vercel mancano GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET (progetto compass → Settings → Environment Variables), oppure non hai fatto Redeploy dopo averli aggiunti."
        : c.includes("invalid_client") || c.includes("unauthorized_client")
          ? "Google non riconosce l'ID client o il secret. Su Vercel ricopiali dal file JSON scaricato (client_id e client_secret, senza spazi), controlla che siano del progetto Google giusto, poi Redeploy."
          : c.includes("redirect_uri")
            ? "L'indirizzo di ritorno non coincide. In Google Cloud → Client → il tuo client → URI di reindirizzamento autorizzati deve esserci esattamente quello qui sotto."
            : c.includes("invalid_grant")
              ? "Google ha rifiutato il codice (scaduto o già usato, oppure l'orologio del server). Riprova una volta sola, senza ricaricare la pagina di ritorno."
              : c.startsWith("gmail-403") || c.includes("accessnotconfigured") || c.includes("service_disabled")
                ? "La Gmail API non è attiva nel progetto Google del client. Apri console.cloud.google.com/apis/library/gmail.googleapis.com con il progetto compass selezionato e premi Abilita; poi riprova dopo un minuto."
                : c === "no-refresh"
                  ? "Google non ha dato l'accesso permanente. Apri myaccount.google.com/permissions, togli Compass, poi riprova."
                  : c.includes("admin_policy") || c.includes("org_internal")
                    ? "L'account Google è di un'organizzazione (università o lavoro) che blocca le app esterne: usa la tua Gmail personale."
                    : "Errore di Google o di rete. Riprova tra un minuto; se si ripete, il codice qui sotto dice cosa guardare.";
  return (
    <div className="mt-4">
      <Notice tone="warn" title="Perché Collega Gmail non è andato">
        <p>{fix}</p>
        <p className="mt-2 text-[13px]">
          Codice: <code>{code.slice(0, 60)}</code>
        </p>
        <p className="mt-1 break-all text-[13px]">
          Indirizzo di ritorno usato da Compass: <code>{googleRedirectUri()}</code>
        </p>
        {env.google.clientId && (
          <p className="mt-1 break-all text-[13px]">
            ID client in uso: <code>{env.google.clientId}</code>
          </p>
        )}
      </Notice>
    </div>
  );
}

/** Guided setup, one step per screen: e-mail first (why it matters), then accounts, alerts, check. */
export default async function CollegaPage({ searchParams }: { searchParams: Promise<{ msg?: string; passo?: string; email?: string; motivo?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const p = await getProfile(db, user.id);
  const [address, code, done, received, sectors, prefs, bg, fwd, u, checkRow, state] = await Promise.all([
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
    collegaState(db, user.id),
  ]);
  const gmail = await getMailConnection(db, user.id);
  const base = baseMailbox();
  // Their e-mail is the mailbox Compass reads (or the administrator linked it): no forwarding needed.
  const ownMailbox = Boolean(base && (sameMailbox(u?.email, base) || (!env.demoMode && u?.mailboxKey === "default")));
  const canLink = sameMailbox(u?.email, base);
  const countries = homeCountries(p.countries, p.city);
  const careers = sectors.filter((s) => prefs.sectors.get(s.id) === "like").map((s) => s.slug);
  const platforms = platformsFor(countries, p.track, careers);
  const alerts = planAlerts(code.queries, levelFor(p.track, bg.person.years));
  const senders = platforms.flatMap((pl) => pl.senders);
  // The first search of each country, on LinkedIn and Indeed: the alerts worth creating first.
  const firstWhat = new Map<string, string>();
  for (const a of alerts) if (!firstWhat.has(a.country)) firstWhat.set(a.country, a.what);
  const recommended = new Set(alerts.filter((a) => firstWhat.get(a.country) === a.what && (a.site === "LinkedIn" || a.site === "Indeed")).map((a) => a.key));
  const now = new Date();
  const lastCheck = typeof checkRow?.value === "string" ? new Date(checkRow.value) : null;
  const checking = lastCheck != null && now.getTime() - lastCheck.getTime() < 45_000;
  const got = (key: string) => [...received.entries()].filter(([s]) => s.startsWith(`email:${key}`)).map(([, d]) => d).sort((a, b) => b.getTime() - a.getTime())[0];
  const gmailOk = gmailConnectAvailable();
  const gmailLinked = gmail != null && gmail.lastError !== "revoked";
  const emailDone = ownMailbox || gmailLinked || state.emailDone || received.size > 0;
  const stepDone = [emailDone, Boolean(state.accountsDone), alerts.some((a) => done.has(a.key)) /* the ones they care about, not all */, received.size > 0];
  const firstOpen = stepDone.findIndex((d) => !d);
  const n = Math.min(4, Math.max(1, Number(sp.passo) || (firstOpen === -1 ? 4 : firstOpen + 1)));
  // With "Collega Gmail" available, the forwarding steps only when asked for (?email=…).
  const provider = sp.email ?? (gmailOk ? null : state.email) ?? null;

  const next = (label = "Avanti") => (
    <form action={collegaStepAction} className="mt-6">
      <input type="hidden" name="passo" value={n} />
      {provider && <input type="hidden" name="email" value={provider} />}
      <Button>{label}</Button>
    </form>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Flash code={sp.msg} />
      {sp.motivo && <GmailProblem code={sp.motivo} />}
      {checking && <AutoRefresh everyMs={5000} times={9} />}
      <h1 className="text-[24px] font-semibold">Collega le fonti</h1>
      <p className="mt-1 text-[14px] text-muted">Quattro passi, circa dieci minuti, da fare una volta sola. Dopo, le offerte arrivano da sole ogni giorno.</p>

      <nav aria-label="Passi" className="mt-5 grid grid-cols-4 gap-1.5">
        {STEPS.map((label, i) => (
          <Link key={label} href={`/collega?passo=${i + 1}`} aria-current={n === i + 1 ? "step" : undefined} className="no-underline">
            <span className={`block h-1.5 rounded-full ${stepDone[i] ? "bg-good" : n === i + 1 ? "bg-accent" : "bg-subtle"}`} />
            <span className={`mt-1.5 flex items-center gap-1 text-[12.5px] ${n === i + 1 ? "font-semibold text-ink" : "text-muted"}`}>
              {stepDone[i] && <IconCheck size={13} className="text-good" />} {i + 1}. {label}
            </span>
          </Link>
        ))}
      </nav>

      {!base && (
        <div className="mt-5">
          <Notice tone="warn">La casella e-mail di Compass non è ancora configurata: chiedi all&apos;amministratore.</Notice>
        </div>
      )}

      <Card className="mt-5">
        {n === 1 && (
          <>
            <h2 className="text-[18px] font-semibold">1. Collega la tua e-mail</h2>
            <Why>
              LinkedIn, Indeed e gli altri siti mandano le offerte nuove per e-mail: si chiamano &quot;avvisi&quot;. Compass trova le offerte leggendo proprio quelle e-mail. Per questo prima colleghiamo la tua e-mail, poi creiamo gli avvisi. Compass legge solo gli avvisi dei siti di lavoro, mai il resto della tua posta, e non ti chiede password.
            </Why>
            {gmail ? (
              <div className="mt-5 space-y-4">
                {gmail.lastError === "revoked" ? (
                  <Notice tone="warn" title="Gmail non è più collegata">
                    Google ha tolto l&apos;accesso a Compass (dalle impostazioni del tuo account Google, o perché è passato troppo tempo). Ricollegala: è un clic.
                  </Notice>
                ) : (
                  <Notice tone="success" title={`Gmail collegata: ${gmail.email}`}>
                    {gmail.lastReadAt ? `Ultima lettura ${formatWhen(gmail.lastReadAt, now)}. ` : "Sto leggendo gli avvisi dell'ultimo mese: le offerte arrivano tra poco in Offerte. "}
                    Da qui in avanti la leggo da solo più volte al giorno: devi solo creare gli avvisi.
                  </Notice>
                )}
                <details className="text-[13.5px] text-muted">
                  <summary className="cursor-pointer">Cosa legge Compass, esattamente?</summary>
                  <p className="mt-1">Solo le e-mail che arrivano da questi mittenti (gli avvisi dei siti di lavoro). Il resto della tua posta non viene mai scaricato, e Compass non può scrivere, spostare o cancellare niente.</p>
                  <p className="mt-1 break-all text-[12.5px]">{ALERT_SENDERS.join(", ")}</p>
                </details>
                <div className="flex flex-wrap items-center gap-2">
                  {gmail.lastError === "revoked" ? (
                    <a href="/api/google/connect" className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-[14px] font-medium text-on-primary no-underline hover:bg-primary-hover">
                      Ricollega Gmail
                    </a>
                  ) : (
                    next()
                  )}
                  <form action={disconnectGmailAction} className={gmail.lastError === "revoked" ? "" : "mt-6"}>
                    <Button variant="secondary">Scollega Gmail</Button>
                  </form>
                </div>
              </div>
            ) : ownMailbox ? (
              <div className="mt-5">
                <Notice tone="success" title="Già collegata">
                  Compass legge direttamente la casella {base}: gli avvisi che arrivano lì sono già tuoi, senza inoltro né filtri. Al passo 2 e 3 usa questa e-mail per gli account e gli avvisi.
                </Notice>
                {next()}
              </div>
            ) : !provider && gmailOk ? (
              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-accent bg-accent-soft/40 p-4">
                  <p className="text-[15px] font-semibold">Usi Gmail? Collegala con un clic</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px]">
                    <li>Premi &quot;Collega Gmail&quot; e scegli il tuo account Google (quello che usi per LinkedIn).</li>
                    <li>
                      Google chiede il permesso di <strong>leggere</strong> le e-mail: lascia spuntata la casella e premi &quot;Continua&quot;.
                    </li>
                    <li>Torni qui: fatto. Leggo subito gli avvisi che hai già ricevuto nell&apos;ultimo mese.</li>
                  </ol>
                  <a href="/api/google/connect" className="mt-3 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[15px] font-medium text-on-primary no-underline hover:bg-primary-hover">
                    Collega Gmail
                  </a>
                  <details className="mt-3 text-[13.5px] text-muted">
                    <summary className="cursor-pointer">Google dice &quot;Google non ha verificato questa app&quot;?</summary>
                    <p className="mt-1">
                      È normale: Compass è su invito, e Google fa la verifica (a pagamento) solo per le app aperte a tutti. Premi <strong>&quot;Avanzate&quot;</strong>, poi <strong>&quot;Vai a Compass&quot;</strong>. Compass chiede solo la lettura, legge solo gli avvisi dei siti di lavoro e puoi scollegarla quando vuoi, da qui o dal tuo account Google.
                    </p>
                  </details>
                </div>
                <div>
                  <p className="text-[14px] font-medium">Non usi Gmail?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <LinkButton href="/collega?passo=1&email=outlook" variant="secondary" size="sm">
                      Outlook / Hotmail
                    </LinkButton>
                    <LinkButton href="/collega?passo=1&email=altro" variant="secondary" size="sm">
                      Un&apos;altra e-mail
                    </LinkButton>
                  </div>
                  <p className="mt-2 text-[13px] text-muted">
                    Preferisci non dare l&apos;accesso? <Link href="/collega?passo=1&email=gmail">Usa l&apos;inoltro di Gmail</Link> (più passaggi).
                  </p>
                </div>
              </div>
            ) : !provider ? (
              <div className="mt-5">
                <p className="text-[14px] font-medium">Che e-mail usi per LinkedIn e gli altri siti?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <LinkButton href="/collega?passo=1&email=gmail">Gmail</LinkButton>
                  <LinkButton href="/collega?passo=1&email=outlook" variant="secondary">
                    Outlook / Hotmail
                  </LinkButton>
                  <LinkButton href="/collega?passo=1&email=altro" variant="secondary">
                    Un&apos;altra
                  </LinkButton>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-5 text-[14px] text-muted">
                  {provider === "gmail" ? "Gmail" : provider === "outlook" ? "Outlook / Hotmail" : "Altra e-mail"} ·{" "}
                  <Link href="/collega?passo=1">cambia</Link>
                </p>
                <ol className="mt-4 space-y-5">
                  <Sub n={1}>
                    <p>Copia il tuo indirizzo Compass: è dove arriveranno i tuoi avvisi, solo tuoi.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="break-all rounded-lg bg-subtle px-3 py-2 text-[14px]">{address}</code>
                      {address && <CopyButton text={address} size="sm" />}
                    </div>
                  </Sub>
                  {provider === "gmail" && (
                    <>
                      <Sub n={2}>
                        <p>
                          <strong>Dal computer</strong> (dall&apos;app di Gmail sul telefono l&apos;inoltro non si può impostare), apri le impostazioni di inoltro con il pulsante qui sotto. Si apre Gmail su <em>Impostazioni → Inoltro e POP/IMAP</em>.
                        </p>
                        <a href="https://mail.google.com/mail/u/0/#settings/fwdandpop" target="_blank" rel="noopener noreferrer" className={ext}>
                          Apri Inoltro e POP/IMAP <IconExternal size={13} />
                        </a>
                        <p className="text-[13px] text-muted">Hai più account Gmail? Controlla in alto a destra che sia quello che usi per LinkedIn e Indeed; se no, cambia account e riapri il link.</p>
                      </Sub>
                      <Sub n={3}>
                        <p>
                          Nella prima sezione, <strong>Inoltro</strong>, premi <strong>&quot;Aggiungi un indirizzo di inoltro&quot;</strong>. Incolla il tuo indirizzo Compass (punto 1) e premi <strong>&quot;Avanti&quot;</strong>. Si apre una finestrella: premi <strong>&quot;Procedi&quot;</strong>, poi <strong>&quot;OK&quot;</strong>.
                        </p>
                        <div className="rounded-lg border border-line px-3.5 py-3">
                          <p className="font-medium">Gmail dice &quot;Indirizzo di inoltro non valido. Non puoi specificare il tuo indirizzo email&quot;?</p>
                          <p className="mt-1 text-muted">
                            Vuol dire che la tua Gmail è proprio la casella che Compass legge{base ? ` (${base})` : ""}: l&apos;inoltro non serve, gli avvisi sono già lì. Premi Annulla in Gmail e collega la casella qui:
                          </p>
                          {canLink ? (
                            <form action={linkCompassMailboxAction} className="mt-2">
                              <Button size="sm">È la mia Gmail: collegala</Button>
                            </form>
                          ) : (
                            <p className="mt-1 text-muted">
                              Sei entrato in Compass con un&apos;altra e-mail ({u?.email}), quindi per sicurezza la collega l&apos;amministratore: <em>Admin → Utenti → questo account → Casella e-mail: default → Salva</em>. Poi salta al passo 2.
                            </p>
                          )}
                        </div>
                      </Sub>
                      <Sub n={4}>
                        <p>
                          Gmail manda un <strong>codice di conferma</strong> (9 cifre) al tuo indirizzo Compass. Compass lo legge e te lo mostra qui: premi il pulsante e aspetta circa un minuto.
                        </p>
                        {fwd?.code ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-[18px] tracking-wider">{fwd.code}</strong>
                            <CopyButton text={fwd.code} size="sm" />
                          </div>
                        ) : (
                          <form action={checkInboxNowAction}>
                            <input type="hidden" name="back" value="/collega?passo=1&email=gmail" />
                            <Button size="sm" variant="secondary" disabled={checking}>
                              {checking ? "Sto cercando il codice…" : "Mostra il codice"}
                            </Button>
                          </form>
                        )}
                        <p>
                          Torna su Gmail, nella stessa pagina: sotto Inoltro è comparso il campo <strong>&quot;Codice di conferma&quot;</strong>. Incolla il codice e premi <strong>&quot;Verifica&quot;</strong>.
                        </p>
                        <p>
                          Dopo la verifica <strong>lascia selezionato &quot;Disattiva inoltro&quot;</strong> e non cambiare altro: così non parte tutta la tua posta, ma solo gli avvisi del filtro del punto 5. Se in fondo alla pagina c&apos;è &quot;Salva modifiche&quot;, premilo.
                        </p>
                      </Sub>
                      <Sub n={5}>
                        <p>
                          Crea il filtro che inoltra <strong>solo</strong> gli avvisi dei siti di lavoro (funziona solo dopo la verifica del punto 4):
                        </p>
                        <ol className="list-decimal space-y-1 pl-5">
                          <li>
                            Premi <strong>&quot;Scarica il filtro&quot;</strong>: scarica il file <code>compass-filtro-gmail.xml</code> (di solito nella cartella Download).
                          </li>
                          <li>
                            Premi <strong>&quot;Apri i filtri di Gmail&quot;</strong>: si apre <em>Impostazioni → Filtri e indirizzi bloccati</em>.
                          </li>
                          <li>
                            Scorri in fondo alla pagina e premi <strong>&quot;Importa filtri&quot;</strong> → <strong>&quot;Scegli file&quot;</strong> → scegli il file scaricato → <strong>&quot;Apri file&quot;</strong>.
                          </li>
                          <li>
                            Compare il filtro &quot;Compass&quot;. Premi <strong>&quot;Crea filtri&quot;</strong>.
                          </li>
                        </ol>
                        <div className="flex flex-wrap gap-2">
                          <a href="/api/gmail-filter" className={ext}>
                            Scarica il filtro
                          </a>
                          <a href="https://mail.google.com/mail/u/0/#settings/filters" target="_blank" rel="noopener noreferrer" className={ext}>
                            Apri i filtri di Gmail <IconExternal size={13} />
                          </a>
                        </div>
                        <details className="text-[13px] text-muted">
                          <summary className="cursor-pointer">Preferisci crearlo a mano?</summary>
                          <p className="mt-1">Copia questo testo e incollalo nella barra di ricerca di Gmail. Premi l&apos;icona dei filtri a destra della barra → &quot;Crea filtro&quot; → spunta &quot;Inoltra a&quot; → scegli il tuo indirizzo Compass → &quot;Crea filtro&quot;.</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <code className="break-all rounded bg-subtle px-2 py-1 text-[12px]">{gmailFilter(platforms)}</code>
                            <CopyButton text={gmailFilter(platforms)} size="sm" />
                          </div>
                        </details>
                      </Sub>
                      <Sub n={6}>
                        <p>
                          <strong>Controllo finale</strong>: in <em>Filtri e indirizzi bloccati</em> c&apos;è una riga che finisce con <em>&quot;Inoltra a {address}&quot;</em>. Se c&apos;è, hai finito.
                        </p>
                      </Sub>
                    </>
                  )}
                  {provider === "outlook" && (
                    <>
                      <Sub n={2}>
                        <p>
                          <strong>Dal computer</strong>, apri le regole di Outlook con il pulsante qui sotto (si apre <em>Impostazioni → Posta → Regole</em>). Premi <strong>&quot;+ Aggiungi una nuova regola&quot;</strong> e come nome scrivi <strong>Compass</strong>.
                        </p>
                        <a href="https://outlook.live.com/mail/0/options/mail/rules" target="_blank" rel="noopener noreferrer" className={ext}>
                          Apri le regole di Outlook <IconExternal size={13} />
                        </a>
                        <p className="text-[13px] text-muted">Usi Outlook del lavoro o dell&apos;università? Spesso l&apos;inoltro verso fuori è bloccato: in quel caso scegli &quot;Un&apos;altra&quot; qui sopra e usa la tua e-mail personale per gli avvisi.</p>
                      </Sub>
                      <Sub n={3}>
                        <p>
                          In <strong>&quot;Aggiungi una condizione&quot;</strong> scegli <strong>&quot;Da&quot;</strong> e incolla questi mittenti (sono gli indirizzi da cui partono gli avvisi):
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="break-all rounded bg-subtle px-2 py-1 text-[12px]">{senders.join("; ")}</code>
                          <CopyButton text={senders.join("; ")} size="sm" />
                        </div>
                      </Sub>
                      <Sub n={4}>
                        <p>
                          In <strong>&quot;Aggiungi un&apos;azione&quot;</strong> scegli <strong>&quot;Reindirizza a&quot;</strong> (non &quot;Inoltra a&quot;: così il mittente resta quello del sito e Compass lo riconosce), incolla il tuo indirizzo Compass e premi <strong>&quot;Salva&quot;</strong>.
                        </p>
                      </Sub>
                      <Sub n={5}>
                        <p>
                          <strong>Controllo finale</strong>: nell&apos;elenco delle regole c&apos;è &quot;Compass&quot; ed è attiva (l&apos;interruttore è acceso).
                        </p>
                      </Sub>
                    </>
                  )}
                  {provider === "altro" && (
                    <Sub n={2}>
                      <p>Nelle impostazioni della tua e-mail cerca &quot;filtri&quot; o &quot;regole&quot; e fai inoltrare al tuo indirizzo Compass le e-mail di questi mittenti:</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="break-all rounded bg-subtle px-2 py-1 text-[12px]">{senders.join(", ")}</code>
                        <CopyButton text={senders.join(", ")} size="sm" />
                      </div>
                      <ul className="list-disc space-y-1 pl-5 text-muted">
                        <li>iCloud: icloud.com/mail → ⚙ → Regole → &quot;Se un messaggio è da&quot; → &quot;Inoltra a&quot;.</li>
                        <li>Libero: Impostazioni → Filtri → Nuovo filtro → mittente → Inoltra.</li>
                        <li>Yahoo o caselle senza inoltro: al passo 3 crea gli avvisi di Indeed e InfoJobs usando direttamente il tuo indirizzo Compass.</li>
                      </ul>
                    </Sub>
                  )}
                </ol>
                {next("Ho finito, avanti")}
              </>
            )}
          </>
        )}

        {n === 2 && (
          <>
            <h2 className="text-[18px] font-semibold">2. Crea gli account sui siti giusti</h2>
            <Why>
              gli avvisi si creano dall&apos;account di ogni sito. Questi sono i siti che contano per {p.track === "stage" ? "gli stage" : "il lavoro"} in {countries.map(countryName).join(", ")}
              {careers.length ? " e per le tue carriere" : ""}. Usa la stessa e-mail del passo 1. Se hai già l&apos;account, salta.
            </Why>
            <ul className="mt-5 space-y-3">
              {platforms.map((pl) => (
                <li key={pl.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3.5 py-2.5">
                  <span className="min-w-0 text-[14px]">
                    <span className="font-medium">{pl.name}</span>
                    <span className="block text-[13px] text-muted">{pl.why}</span>
                  </span>
                  <a href={pl.signup} target="_blank" rel="noopener noreferrer" className={ext}>
                    Crea l&apos;account <IconExternal size={13} />
                  </a>
                </li>
              ))}
              {p.track === "stage" && <li className="text-[14px] text-muted">E il portale carriere della tua università: ci sono stage riservati agli studenti.</li>}
            </ul>
            {next()}
          </>
        )}

        {n === 3 && (
          <>
            <h2 className="text-[18px] font-semibold">3. Crea gli avvisi giusti</h2>
            <Why>
              un avviso è una ricerca salvata: il sito ti scrive quando escono offerte nuove, e Compass le legge e le ordina per te. Ogni link apre la ricerca già impostata per te (posizione, città, livello, più recenti): tu devi solo salvarla come avviso.
            </Why>
            <div className="mt-4">
              <Notice tone="info" title="Scegli quelli che ti interessano di più">
                Non serve crearli tutti. Parti dai due o tre che senti più tuoi (ti ho segnato i consigliati): avvisi pochi e precisi portano offerte migliori di tanti avvisi generici. Gli altri li aggiungi quando vuoi.
              </Notice>
            </div>
            <div className="mt-5 space-y-2">
              {alerts.map((a) => (
                <div key={a.key} className="rounded-lg border border-line px-3.5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-medium">
                      {a.site} · {a.what} · {a.where} {recommended.has(a.key) && <Chip tone="accent">consigliato</Chip>}
                    </p>
                    <div className="flex gap-2">
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
                  <p className="mt-1 text-[12.5px] text-faint">
                    Filtri già messi: {a.filters}. {HOW_TO[a.site]}
                  </p>
                </div>
              ))}
              {platforms.filter((pl) => !["linkedin", "indeed", "infojobs"].includes(pl.key)).map((pl) => (
                <p key={pl.key} className="text-[13px] text-muted">
                  Su {pl.name}: crea un avviso con le stesse parole ({alerts[0]?.what ?? "la tua posizione"}) e la stessa città.
                </p>
              ))}
            </div>
            <details className="mt-4 text-[14px]">
              <summary className="cursor-pointer font-medium">Consigli per avvisi davvero utili</summary>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
                <li>Una ricerca per carriera e per paese, con il titolo preciso degli annunci (&quot;Analista M&amp;A&quot;, non &quot;finanza&quot;).</li>
                <li>Frequenza giornaliera: stage e posizioni junior si chiudono in pochi giorni.</li>
                <li>Su LinkedIn segui le aziende che ti interessano: ti avvisa quando pubblicano.</li>
                <li>Su LinkedIn imposta &quot;Disponibile per lavorare&quot; visibile solo ai recruiter: sono loro a scriverti.</li>
                <li>Se un avviso porta solo offerte poco adatte, rendilo più preciso o cancellalo.</li>
              </ul>
            </details>
            {next()}
          </>
        )}

        {n === 4 && (
          <>
            <h2 className="text-[18px] font-semibold">4. Verifica</h2>
            <Why>qui vedi da quali siti stanno già arrivando gli avvisi.</Why>
            <div className="mt-4">
              <Notice tone="info" title="Ci vuole un po' di pazienza">
                I siti mandano gli avvisi una volta al giorno, spesso al mattino: la prima e-mail può arrivare dopo qualche ora o anche dopo uno o due giorni da quando hai creato l&apos;avviso, e solo se nel frattempo esce un&apos;offerta nuova. Se dopo due giorni un sito è ancora &quot;in attesa&quot;, ricontrolla il filtro del passo 1.
              </Notice>
            </div>
            <ul className="mt-5 space-y-2.5 text-[14px]">
              {platforms.map((pl) => {
                const d = got(pl.key);
                return (
                  <li key={pl.key} className="flex items-center gap-2">
                    {d ? <Chip tone="good">arrivato</Chip> : <Chip>in attesa</Chip>}
                    <span>
                      {pl.name}
                      {d && <span className="text-muted"> · ultimo avviso {formatWhen(d, now)}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <form action={checkInboxNowAction}>
                <input type="hidden" name="back" value="/collega?passo=4" />
                <Button variant="secondary" disabled={checking}>
                  {checking ? "Controllo in corso…" : "Controlla ora"}
                </Button>
              </form>
              <LinkButton href="/offerte">Vai alle offerte</LinkButton>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
