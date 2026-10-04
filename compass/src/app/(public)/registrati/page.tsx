import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, ChoiceRow, Field, Notice } from "@/components/ui";
import { getDb } from "@/lib/db";
import { MIN_PASSWORD, register } from "@/lib/server/accounts";
import { currentUser, startSession } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata = { title: "Crea un account" };
export const dynamic = "force-dynamic";

async function registerAction(f: FormData) {
  "use server";
  const s = (k: string) => String(f.get(k) ?? "").trim();
  if (s("website")) redirect("/registrati?errore=email"); // honeypot: people never see this field
  const r = await register(getDb(), { email: s("email"), password: String(f.get("password") ?? ""), name: s("name"), track: s("track") === "stage" ? "stage" : "lavoro", invite: s("invito") });
  if (!r.ok) redirect(`/registrati?errore=${r.error}${s("invito") ? `&invito=${encodeURIComponent(s("invito"))}` : ""}`);
  await startSession(r.userId);
  redirect("/benvenuto/1?msg=registrato");
}

const ERRORS: Record<string, string> = {
  email: "L'indirizzo e-mail non è valido.",
  password: `La password deve avere almeno ${MIN_PASSWORD} caratteri.`,
  exists: "Esiste già un account con questa e-mail. Prova ad entrare.",
  invite: "Il codice di invito non è valido, è scaduto o è già stato usato.",
  closed: "Le registrazioni sono chiuse. Chiedi un account all'amministratore.",
  limit: "Troppe registrazioni oggi. Riprova domani.",
};

export default async function RegistratiPage({ searchParams }: { searchParams: Promise<{ errore?: string; invito?: string; piano?: string }> }) {
  if ((await currentUser())?.role === "user") redirect("/offerte");
  const sp = await searchParams;
  const mode = (await getSettings(getDb())).registration;
  return (
    <div className="mx-auto max-w-md px-4 pt-16">
      <h1 className="text-[24px] font-semibold">Crea un account</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        Gratis durante la prova{sp.piano ? " (i piani a pagamento non sono ancora attivi)" : ""}. Poi qualche domanda per capire cosa cerchi.
      </p>
      {sp.errore && ERRORS[sp.errore] && (
        <div className="mt-5">
          <Notice tone="warn">{ERRORS[sp.errore]}</Notice>
        </div>
      )}
      {mode === "closed" ? (
        <div className="mt-6">
          <Notice tone="info">Le registrazioni sono chiuse: gli account li crea l&apos;amministratore.</Notice>
        </div>
      ) : (
        <form action={registerAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <p className="text-[13px] font-medium">Cosa cerchi?</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ChoiceRow type="radio" name="track" value="lavoro" defaultChecked hint="Offerte di lavoro vicino a te.">
                Un lavoro
              </ChoiceRow>
              <ChoiceRow type="radio" name="track" value="stage" hint="Stage, internship e programmi per studenti.">
                Uno stage
              </ChoiceRow>
            </div>
          </div>
          <Field label="Nome e cognome" htmlFor="name">
            <input id="name" name="name" type="text" autoComplete="name" required />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" hint={`Almeno ${MIN_PASSWORD} caratteri.`}>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
          </Field>
          {mode === "invite" && (
            <Field label="Codice di invito" htmlFor="invito" hint="Le registrazioni sono su invito: il codice te lo dà l'amministratore.">
              <input id="invito" name="invito" type="text" autoComplete="off" defaultValue={sp.invito ?? ""} required />
            </Field>
          )}
          <div aria-hidden="true" className="hidden">
            <label htmlFor="website">Sito web</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <Button wide>Crea account</Button>
          <p className="text-[12.5px] text-faint">I tuoi dati restano tuoi: puoi cancellarli in ogni momento da Profilo. Compass non entra mai nei tuoi account LinkedIn, Indeed o InfoJobs.</p>
        </form>
      )}
      <p className="mt-6 text-[13.5px] text-muted">
        Hai già un account? <Link href="/entra">Entra</Link>
      </p>
    </div>
  );
}
