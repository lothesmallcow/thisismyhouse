import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Field, Notice } from "@/components/ui";
import { currentUser, signIn } from "@/lib/server/auth";

export const metadata = { title: "Entra" };
export const dynamic = "force-dynamic";

async function entraAction(f: FormData) {
  "use server";
  const r = await signIn(String(f.get("email") ?? ""), String(f.get("password") ?? ""), "user");
  redirect(r === "ok" ? "/offerte" : r === "locked" ? "/entra?errore=attesa" : "/entra?errore=1");
}

export default async function EntraPage({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  if ((await currentUser())?.role === "user") redirect("/offerte");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 pt-16">
      <h1 className="text-[24px] font-semibold">Entra in Compass</h1>
      <p className="mt-1.5 text-[14px] text-muted">Resti collegato su questo dispositivo.</p>
      {sp.errore && (
        <div className="mt-5">
          <Notice tone="warn">{sp.errore === "attesa" ? "Troppi tentativi: riprova tra 15 minuti." : "E-mail o password non corrette."}</Notice>
        </div>
      )}
      <form action={entraAction} className="mt-6 space-y-4">
        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button wide>Entra</Button>
      </form>
      <p className="mt-6 text-[13.5px] text-muted">
        Non hai un account? <Link href="/registrati">Creane uno</Link>. Password dimenticata? Chiedi all&apos;amministratore.
      </p>
    </div>
  );
}
