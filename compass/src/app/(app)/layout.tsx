import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { Brand } from "@/components/brand";
import { IconClock } from "@/components/icons";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { shellData } from "@/lib/server/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const db = getDb();
  const profile = await getProfile(db);
  if (!profile.onboardedAt && user.role === "user") redirect("/benvenuto/1");
  const s = await shellData(db);
  return (
    <div className="min-h-dvh pb-[110px]">
      {s.demo && (
        <div className="bg-navy px-4 py-2 text-center text-[0.95rem] font-bold text-white">
          Modalità prova: nessun invio è reale.
        </div>
      )}
      {user.role === "admin" && (
        <div className="bg-amber px-4 py-2 text-center text-[0.95rem] text-amber-ink">
          Stai guardando l&apos;app di lei come amministratore. <a href="/admin" className="font-bold text-amber-ink">Torna all&apos;area admin</a>
        </div>
      )}
      <header className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-5 pb-2 sm:px-6">
        <Brand />
        <p className="flex items-center gap-2 text-[0.95rem] text-ink-soft">
          <IconClock size={20} /> {s.lastUpdate}
        </p>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">{children}</main>
      <BottomNav badges={s.badges} />
    </div>
  );
}
