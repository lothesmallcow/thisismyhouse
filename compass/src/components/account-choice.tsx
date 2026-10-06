"use client";
// Collega le fonti, step 2: for each site, "Ce l'ho già" or "Crea" (which opens the sign-up page).
// The choice is saved at once, without reloading the page.
import { useState, useTransition } from "react";

type State = "ho" | "creato" | null;

export function AccountChoice({ site, name, signup, initial, save }: { site: string; name: string; signup: string; initial: State; save: (key: string, state: State) => Promise<void> }) {
  const [state, setState] = useState<State>(initial);
  const [, start] = useTransition();
  const choose = (s: State) => {
    setState(s);
    start(() => save(site, s));
  };
  if (state) {
    return (
      <span className="flex items-center gap-2">
        <span className="inline-flex h-9 items-center rounded-full bg-good-soft px-3.5 text-[13px] font-medium text-good">✓ {state === "ho" ? "Ce l'hai" : "Creato"}</span>
        <button type="button" onClick={() => choose(null)} className="text-[12.5px] text-muted underline hover:text-ink" aria-label={`Cambia la risposta per ${name}`}>
          cambia
        </button>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-2">
      <button type="button" onClick={() => choose("ho")} className="inline-flex h-9 items-center rounded-full border border-line-strong px-3.5 text-[13px] font-medium hover:border-accent hover:text-accent" aria-label={`Ho già l'account ${name}`}>
        Ce l&apos;ho già
      </button>
      <a href={signup} target="_blank" rel="noopener noreferrer" onClick={() => choose("creato")} className="inline-flex h-9 items-center rounded-full bg-accent px-3.5 text-[13px] font-semibold text-surface no-underline hover:opacity-90" aria-label={`Crea l'account ${name}`}>
        Crea ↗
      </a>
    </span>
  );
}
