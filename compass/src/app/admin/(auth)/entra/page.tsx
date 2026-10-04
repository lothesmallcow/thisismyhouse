import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Button, Card, Field, Notice } from "@/components/ui";
import { currentAdmin } from "@/lib/server/auth";
import { adminSignInAction } from "../../actions";

export const metadata = { title: "Area amministratore" };
export const dynamic = "force-dynamic";

export default async function AdminEntra({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <Brand href="/" />
      <Card className="mt-6 !p-8">
        <h1 className="text-[2rem] font-semibold">Area amministratore</h1>
        <p className="mt-2 text-muted">Accesso separato per chi gestisce Compass.</p>
        {sp.errore && (
          <div className="mt-5">
            <Notice tone="warn">{sp.errore === "attesa" ? "Troppi tentativi: riprova tra 15 minuti." : "Credenziali non corrette."}</Notice>
          </div>
        )}
        <form action={adminSignInAction} className="mt-6 space-y-5">
          <Field label="E-mail" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Password" htmlFor="password">
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button wide>Entra</Button>
        </form>
      </Card>
    </div>
  );
}
