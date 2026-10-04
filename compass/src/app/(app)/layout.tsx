import Link from "next/link";
import { redirect } from "next/navigation";
import { readNotificationsAction } from "./actions";
import { BottomNav, TopNav } from "@/components/bottom-nav";
import { Brand } from "@/components/brand";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getProfile } from "@/lib/server/profile";
import { shellData } from "@/lib/server/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const db = getDb();
  const profile = await getProfile(db, user.id);
  if (!profile.onboardedAt && user.viewer === "self") redirect(`/benvenuto/${Math.max(1, Math.min(profile.onboardingStep, 20))}`);
  const s = await shellData(db, user.id);
  const initials = (profile.name || user.name || user.email).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-dvh pb-20 md:pb-12">
      {(s.demo || user.viewer === "admin") && (
        <div className="border-b border-line bg-subtle px-4 py-1.5 text-center text-[12.5px] text-muted">
          {s.demo && <span>Modalità prova: nessun invio è reale.</span>}
          {user.viewer === "admin" && (
            <span>
              {s.demo ? " · " : ""}Stai vedendo l&apos;app di <strong className="font-medium text-ink">{profile.name || user.email}</strong>.{" "}
              <a href="/admin/utenti">Torna all&apos;admin</a>
            </span>
          )}
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Brand small />
            <TopNav badges={s.badges} />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12.5px] text-faint lg:inline">{s.lastUpdate}</span>
            <Link href="/profilo" aria-label="Il tuo profilo" className="flex h-8 w-8 items-center justify-center rounded-full bg-subtle text-[12px] font-semibold text-ink no-underline ring-1 ring-line">
              {initials || "?"}
            </Link>
          </div>
        </div>
      </header>
      {s.notes.length > 0 && (
        <aside aria-label="Novità" className="mx-auto mt-4 max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 text-[14px]">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {s.notes.map((n) => (
                <li key={n.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {n.href ? <Link href={n.href}>{n.text}</Link> : n.text}
                </li>
              ))}
            </ul>
            <form action={readNotificationsAction}>
              <button className="h-8 rounded-md px-2.5 text-[13px] text-muted hover:bg-subtle hover:text-ink">Segna come letti</button>
            </form>
          </div>
        </aside>
      )}
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">{children}</main>
      <BottomNav badges={s.badges} />
    </div>
  );
}
