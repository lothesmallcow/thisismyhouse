import Link from "next/link";
import { Brand } from "@/components/brand";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Brand href="/" small />
          <nav aria-label="Menu" className="flex items-center gap-1">
            <Link href="/abbonamento" className="inline-flex h-9 items-center rounded-md px-3 text-[14px] text-muted no-underline hover:text-ink">
              Prezzi
            </Link>
            <Link href="/entra" className="inline-flex h-9 items-center rounded-md px-3 text-[14px] text-muted no-underline hover:text-ink">
              Entra
            </Link>
            <Link href="/registrati" className="ml-1 inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-[14px] font-medium text-on-primary no-underline hover:bg-primary-hover">
              Crea un account
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-24 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-faint sm:px-8">
          <p>Compass · progetto indipendente, fatto in Italia.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/abbonamento" className="text-faint">
              Prezzi
            </Link>
            <Link href="/entra" className="text-faint">
              Entra
            </Link>
            <Link href="/privacy" className="text-faint">
              Privacy
            </Link>
            <Link href="/admin/entra" className="text-faint">
              Amministrazione
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
