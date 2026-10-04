import { Flash } from "@/components/flash";
import { Button, Card, Field } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { changePasswordAction } from "../../actions";

export const metadata = { title: "Accessi" };

export default async function UtentiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const users = await getDb().select({ id: schema.users.id, email: schema.users.email, role: schema.users.role }).from(schema.users);
  return (
    <>
      <Flash code={sp.msg} />
      <h1 className="text-[2.2rem] font-semibold">Accessi</h1>
      <p className="mt-2 text-ink-soft">Due account: quello di lei e il tuo da amministratore. Qui puoi cambiare le parole d&apos;accesso.</p>
      <div className="mt-6 space-y-4">
        {users.map((u) => (
          <Card key={u.id}>
            <p className="font-bold">
              {u.email} <span className="font-normal text-ink-soft">· {u.role === "admin" ? "amministratore" : "lei"}</span>
            </p>
            <form action={changePasswordAction} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="userId" value={u.id} />
              <Field label="Nuova parola d'accesso (almeno 8 caratteri)" htmlFor={`pw-${u.id}`}>
                <input id={`pw-${u.id}`} name="password" type="password" autoComplete="new-password" minLength={8} required />
              </Field>
              <Button variant="secondary">Cambia</Button>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
