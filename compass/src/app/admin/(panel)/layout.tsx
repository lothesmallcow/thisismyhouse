import Link from "next/link";
import { Brand } from "@/components/brand";
import { requireAdmin } from "@/lib/server/auth";
import { env } from "@/lib/env";
import { adminSignOutAction } from "../actions";
import { AdminTabs } from "./tabs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh pb-16">
      <div className={`border-b border-line px-4 py-1.5 text-center text-[12.5px] ${env.demoMode ? "bg-subtle text-muted" : "bg-bad-soft text-bad"}`}>
        {env.demoMode ? "DEMO_MODE=true · nessuna e-mail esce dal server, le fonti leggono fixtures" : "Modalità reale · le fonti sono vive"}
      </div>
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Brand href="/admin" small />
            <span className="rounded-md bg-subtle px-2 py-0.5 text-[12px] font-medium text-muted">Admin</span>
          </div>
          <div className="flex items-center gap-1 text-[13px]">
            <span className="hidden px-2 text-faint sm:inline">{admin.email}</span>
            <Link href="/admin/utenti" className="inline-flex h-9 items-center rounded-md px-2.5 text-muted no-underline hover:text-ink">
              Apri un&apos;app
            </Link>
            <form action={adminSignOutAction}>
              <button className="inline-flex h-9 items-center rounded-md px-2.5 text-muted hover:bg-subtle hover:text-ink">Esci</button>
            </form>
          </div>
        </div>
        <AdminTabs />
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-8">{children}</main>
    </div>
  );
}
