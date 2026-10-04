import Link from "next/link";
import { Brand } from "@/components/brand";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Brand href="/" />
        <nav aria-label="Menu" className="flex items-center gap-2 sm:gap-4">
          <Link href="/abbonamento" className="hidden min-h-[48px] items-center rounded-xl px-3 font-bold no-underline hover:bg-navy-soft sm:inline-flex">
            Prezzi
          </Link>
          <Link href="/entra" className="inline-flex min-h-[52px] items-center rounded-2xl bg-navy px-5 font-bold text-white no-underline hover:bg-navy-strong">
            Entra
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-20 border-t border-line bg-paper-deep/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[0.98rem] text-ink-soft sm:px-8">
          <p>Compass · un progetto personale, fatto con cura in Italia.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/abbonamento">Prezzi</Link>
            <Link href="/entra">Entra</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
