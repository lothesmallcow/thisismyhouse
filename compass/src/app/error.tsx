"use client";
import Link from "next/link";
// One calm sentence and what to do next. Never codes or stack traces.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-sm px-4 pt-24">
      <h1 className="text-[22px] font-semibold">Qualcosa non ha funzionato</h1>
      <p className="mt-2 text-[14px] text-muted">Riprova tra un minuto. Se succede ancora, avvisa l&apos;amministratore.</p>
      <div className="mt-6 flex gap-2">
        <button onClick={reset} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-[14px] font-medium text-on-primary">
          Riprova
        </button>
        <Link href="/offerte" className="inline-flex h-10 items-center rounded-lg border border-line-strong px-4 text-[14px] font-medium text-ink no-underline">
          Torna alle offerte
        </Link>
      </div>
    </div>
  );
}
