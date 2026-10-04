import { Brand } from "@/components/brand";
import { requireUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-dvh pb-16">
      <header className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <Brand href="/offerte" />
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
