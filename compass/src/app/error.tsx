"use client";
import Link from "next/link";
// Nothing scary: one calm sentence, what to do next. Never codes or stack traces.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 pt-24 text-center">
      <h1 className="text-[2rem] font-semibold">Qualcosa non ha funzionato</h1>
      <p className="mt-3 text-ink-soft">Non è colpa tua. Riprova tra un minuto; se succede ancora, chiedi aiuto.</p>
      <button onClick={reset} className="mt-7 inline-flex min-h-[58px] w-full items-center justify-center rounded-2xl bg-navy px-6 font-bold text-white">
        Riprova
      </button>
      <Link href="/offerte" className="mt-3 inline-flex min-h-[58px] w-full items-center justify-center rounded-2xl border-2 border-navy font-bold no-underline">
        Torna alle offerte
      </Link>
    </div>
  );
}
