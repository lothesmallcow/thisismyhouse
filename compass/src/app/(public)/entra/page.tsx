import { redirect } from "next/navigation";
import { Button, Card, Field, Notice } from "@/components/ui";
import { currentUser, signIn } from "@/lib/server/auth";

export const metadata = { title: "Entra" };
export const dynamic = "force-dynamic";

async function entraAction(f: FormData) {
  "use server";
  const r = await signIn(String(f.get("email") ?? ""), String(f.get("password") ?? ""), "user");
  redirect(r === "ok" ? "/offerte" : r === "locked" ? "/entra?errore=attesa" : "/entra?errore=1");
}

export default async function EntraPage({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  if (await currentUser()) redirect("/offerte");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <Card className="rise !p-8">
        <h1 className="text-[2.2rem] font-semibold">Entra</h1>
        <p className="mt-2 text-ink-soft">
          <strong className="text-navy">Cosa faccio qui?</strong> Scrivi la tua e-mail e la parola d&apos;accesso. Resterai dentro su questo dispositivo, non serve rifarlo ogni volta.
        </p>
        {sp.errore && (
          <div className="mt-5">
            <Notice tone="warn">
              {sp.errore === "attesa"
                ? "Troppi tentativi. Per sicurezza aspetta 15 minuti, poi riprova."
                : "E-mail o parola d'accesso non corrette. Controlla e riprova."}
            </Notice>
          </div>
        )}
        <form action={entraAction} className="mt-6 space-y-5">
          <Field label="La tua e-mail" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Parola d'accesso" htmlFor="password">
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button wide>Entra</Button>
        </form>
        <p className="mt-6 text-[0.98rem] text-ink-soft">Hai dimenticato la parola d&apos;accesso? Chiedi a chi ti ha preparato Compass: la cambia in un minuto.</p>
      </Card>
    </div>
  );
}
