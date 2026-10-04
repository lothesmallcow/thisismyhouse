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
      <div className={`px-4 py-2 text-center text-[0.95rem] font-bold ${env.demoMode ? "bg-navy text-white" : "bg-rose text-rose-ink"}`}>
        {env.demoMode ? "DEMO_MODE=true · nessuna e-mail esce dal server, le fonti leggono fixtures" : "Modalità reale · le fonti sono vive"}
      </div>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-5 sm:px-8">
        <div className="flex items-center gap-4">
          <Brand href="/admin" small />
          <span className="rounded-full bg-paper-deep px-3 py-1 text-[0.9rem] font-bold">Admin</span>
        </div>
        <div className="flex items-center gap-3 text-[0.95rem]">
          <span className="hidden text-ink-soft sm:inline">{admin.email}</span>
          <Link href="/offerte" className="inline-flex min-h-[48px] items-center font-bold">
            Apri l&apos;app di lei
          </Link>
          <form action={adminSignOutAction}>
            <button className="min-h-[48px] rounded-xl px-3 font-bold text-navy hover:bg-navy-soft">Esci</button>
          </form>
        </div>
      </header>
      <AdminTabs />
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-8">{children}</main>
    </div>
  );
}
