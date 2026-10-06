import { Brand } from "@/components/brand";
import { requireUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-dvh pb-16">
      <header className="glass sticky top-0 z-20 border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4 sm:px-6">
          <Brand href="/offerte" small />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">{children}</main>
    </div>
  );
}
