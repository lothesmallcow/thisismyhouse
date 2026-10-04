import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BackLink } from "@/components/back-link";
import { Flash } from "@/components/flash";
import { IconExternal } from "@/components/icons";
import { Button, Card, Field, PageHeader } from "@/components/ui";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { canChoose } from "@/lib/server/catalog";
import { getProfile } from "@/lib/server/profile";
import { startSpontaneousAction } from "../../actions";

export const metadata = { title: "Candidatura spontanea" };

/** Write to a company without a job ad: they give the published address, Compass prepares the e-mail. */
export default async function ScriviPage({ searchParams }: { searchParams: Promise<{ azienda?: string; msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const id = Number(sp.azienda);
  if (!id || !(await canChoose(db, user.id, "company", id))) notFound();
  const c = (await db.select().from(schema.catalogCompanies).where(eq(schema.catalogCompanies.id, id)).get())!;
  const p = await getProfile(db, user.id);
  const site = c.website ? `https://${c.website.replace(/^https?:\/\//, "")}` : null;
  const search = `https://duckduckgo.com/?q=${encodeURIComponent(`${c.name} ${p.track === "stage" ? "careers internship email" : "lavora con noi candidatura spontanea email"}`)}`;
  return (
    <>
      <Flash code={sp.msg} />
      <BackLink href="/percorsi#aziende">Percorsi</BackLink>
      <PageHeader title={`Scrivi a ${c.name}`} description="Una candidatura spontanea: la prepara Compass con la tua lettera e il tuo CV, e la ritrovi in Da inviare per rileggerla prima dell'invio." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <form action={startSpontaneousAction} className="space-y-4">
            <input type="hidden" name="companyId" value={c.id} />
            <Field label="Indirizzo e-mail per le candidature" htmlFor="email" hint="Quello pubblicato dall'azienda (pagina Lavora con noi, Careers, contatti HR). Compass non inventa indirizzi.">
              <input id="email" name="email" type="email" required placeholder="careers@azienda.example" />
            </Field>
            <Field label="Dove l'hai trovato" htmlFor="sourceUrl" hint="Il link della pagina con l'indirizzo: resta nel registro.">
              <input id="sourceUrl" name="sourceUrl" type="url" required placeholder="https://" defaultValue={site ?? ""} />
            </Field>
            <Field label="Ruolo che proponi (facoltativo)" htmlFor="role">
              <input id="role" name="role" type="text" defaultValue={p.roles[0] ?? ""} />
            </Field>
            <Button>Prepara la candidatura</Button>
          </form>
        </Card>
        <aside className="space-y-3 text-[13px]">
          <Card className="space-y-2 !p-4">
            <p className="font-semibold">Trova l&apos;indirizzo</p>
            {site && (
              <a href={site} target="_blank" rel="noopener noreferrer" className="flex min-h-8 items-center gap-1.5">
                Sito di {c.name} <IconExternal size={13} />
              </a>
            )}
            <a href={search} target="_blank" rel="noopener noreferrer" className="flex min-h-8 items-center gap-1.5">
              Cerca la pagina carriere <IconExternal size={13} />
            </a>
          </Card>
          <p className="text-muted">Valgono le stesse regole delle altre candidature: limite giornaliero, orari d&apos;ufficio, 15 minuti per annullare, mai due volte alla stessa azienda in 6 mesi.</p>
        </aside>
      </div>
    </>
  );
}
