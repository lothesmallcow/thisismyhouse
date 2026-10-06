import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Field, Notice } from "@/components/ui";
import { currentUser, signIn } from "@/lib/server/auth";

export const metadata = { title: "Entra" };
export const dynamic = "force-dynamic";

async function entraAction(f: FormData) {
  "use server";
  // "Sono l'amministratore": the same form opens the admin area (its own account and session).
  const admin = f.get("admin") === "1";
  const r = await signIn(String(f.get("email") ?? ""), String(f.get("password") ?? ""), admin ? "admin" : "user");
  const err = (code: string) => `/entra?errore=${code}${admin ? "&admin=1" : ""}`;
  redirect(r === "ok" ? (admin ? "/admin" : "/offerte") : r === "locked" ? err("attesa") : r === "pending" ? err("richiesta") : err("1"));
}

export default async function EntraPage({ searchParams }: { searchParams: Promise<{ errore?: string; msg?: string; admin?: string }> }) {
  if ((await currentUser())?.role === "user") redirect("/offerte");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-4 pt-16">
      <h1 className="text-[24px] font-semibold">Entra in Compass</h1>
      <p className="mt-1.5 text-[14px] text-muted">Resti collegato su questo dispositivo.</p>
      {sp.msg === "account-eliminato" && (
        <div className="mt-5">
          <Notice tone="success">Il tuo account e tutti i tuoi dati sono stati eliminati. Se vuoi tornare, puoi creare un nuovo account.</Notice>
        </div>
      )}
      {sp.errore && (
        <div className="mt-5">
          <Notice tone={sp.errore === "richiesta" ? "info" : "warn"}>
            {sp.errore === "attesa" ? "Troppi tentativi: riprova tra un minuto." : sp.errore === "richiesta" ? "La tua richiesta di accesso è in attesa: riceverai un'e-mail quando l'amministratore la approva." : "E-mail o password non corrette."}
          </Notice>
        </div>
      )}
      <form action={entraAction} className="mt-6 space-y-4">
        <Field label="E-mail" htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[14px]">
          <input type="checkbox" name="admin" value="1" defaultChecked={sp.admin === "1"} className="h-4 w-4 accent-[var(--accent)]" />
          Sono l&apos;amministratore
        </label>
        <Button wide>Entra</Button>
      </form>
      <p className="mt-6 text-[13.5px] text-muted">
        Non hai un account? <Link href="/registrati">Creane uno</Link>. Password dimenticata? Chiedi all&apos;amministratore.
      </p>
    </div>
  );
}
