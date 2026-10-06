"use client";
// Collega le fonti, step 2: for each site, "Ce l'ho già" or "Crea" (which opens the sign-up page).
// The choice is saved at once, without reloading the page. Right after it, a small panel says where
// that site's alerts must arrive (the mailbox Compass reads) and where to check it on the site.
import { useState, useTransition } from "react";

type State = "ho" | "creato" | null;

export function AccountChoice({
  site,
  name,
  signup,
  initial,
  save,
  mail,
  emailWhere,
  alertsWhere,
}: {
  site: string;
  name: string;
  signup: string;
  initial: State;
  save: (key: string, state: State) => Promise<void>;
  /** The mailbox Compass reads (null: the one they forward from, step 1). */
  mail: string | null;
  /** Where the site shows the account's e-mail. */
  emailWhere?: string;
  /** Where the site turns alert e-mails on. */
  alertsWhere?: string;
}) {
  const [state, setState] = useState<State>(initial);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const choose = (s: State) => {
    setState(s);
    setOpen(s != null);
    start(() => save(site, s));
  };
  const to = mail ? <strong className="break-all">{mail}</strong> : <strong>la casella del passo 1</strong>;
  return (
    <>
      {state ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-full bg-good-soft px-3.5 text-[13px] font-medium text-good">✓ {state === "ho" ? "Ce l'hai" : "Creato"}</span>
          {!open && (
            <button type="button" onClick={() => setOpen(true)} className="text-[12.5px] text-muted underline hover:text-ink" aria-label={`Dove arrivano gli avvisi di ${name}`}>
              e-mail?
            </button>
          )}
          <button type="button" onClick={() => choose(null)} className="text-[12.5px] text-muted underline hover:text-ink" aria-label={`Cambia la risposta per ${name}`}>
            cambia
          </button>
        </span>
      ) : (
        <span className="flex flex-wrap gap-2">
          <button type="button" onClick={() => choose("ho")} className="inline-flex h-9 items-center rounded-full border border-line-strong px-3.5 text-[13px] font-medium hover:border-accent hover:text-accent" aria-label={`Ho già l'account ${name}`}>
            Ce l&apos;ho già
          </button>
          <a href={signup} target="_blank" rel="noopener noreferrer" onClick={() => choose("creato")} className="inline-flex h-9 items-center rounded-full bg-accent px-3.5 text-[13px] font-semibold text-surface no-underline hover:opacity-90" aria-label={`Crea l'account ${name}`}>
            Crea ↗
          </a>
        </span>
      )}
      {state && open && (
        <div role="region" aria-label={`Avvisi di ${name} sulla tua e-mail`} className="w-full basis-full rounded-lg border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13.5px] leading-relaxed anim-in">
          <p>
            Gli avvisi di {name} devono arrivare a {to}: è l&apos;unica casella che Compass legge. Se arrivano altrove, le offerte non entrano.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {state === "ho" ? (
              <li>
                Controlla l&apos;e-mail del tuo account {name}
                {emailWhere ? <>: {emailWhere}</> : "."} Se è un&apos;altra, cambiala con {to}.
              </li>
            ) : (
              <li>Registrati con {to} e conferma l&apos;indirizzo dal messaggio di benvenuto di {name}.</li>
            )}
            <li>Tieni accese le e-mail degli avvisi{alertsWhere ? <>: {alertsWhere}</> : "."}</li>
            <li>Poi crei gli avvisi al passo 3: arriveranno lì da soli.</li>
          </ol>
          <button type="button" onClick={() => setOpen(false)} className="mt-2.5 inline-flex h-8 items-center rounded-full bg-accent px-3 text-[12.5px] font-semibold text-surface hover:opacity-90">
            Ok, fatto
          </button>
        </div>
      )}
    </>
  );
}
