import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { IconArrowLeft } from "@/components/icons";
import { Button, Card, Field, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { pickCv } from "@/lib/core/cv-pick";
import { buildClaudePrompt } from "@/lib/core/prompt";
import { getDb, schema } from "@/lib/db";
import { getJob } from "@/lib/server/jobs";
import { getProfile } from "@/lib/server/profile";
import { saveCuratedAction } from "../../../actions";

export const metadata = { title: "Prepara con Claude" };

export default async function ClaudePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const data = await getJob(db, Number(id));
  if (!data) notFound();
  const { job, sources } = data;
  const p = await getProfile(db);
  const cvs = await db.select().from(schema.cvs);
  const cv = pickCv(cvs, { title: job.title, sector: job.sector });
  const cvText = cvs.find((c) => c.id === cv?.id)?.text ?? "";
  const prompt = buildClaudePrompt({
    job: { title: job.title, company: job.company, city: job.city, description: job.description, url: sources.find((s) => s.url)?.url ?? null },
    cvText,
    name: p.name,
  });

  return (
    <>
      <LinkButton href={`/offerte/${id}`} variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna all&apos;offerta
      </LinkButton>
      <PageHeader
        title="Prepara con Claude"
        help="Per le offerte migliori: copia il testo, incollalo nella chat di Claude, poi incolla qui sotto quello che ti risponde."
      />

      <Card className="space-y-4">
        <p className="font-bold">1. Copia questo testo</p>
        <p className="text-[0.98rem] text-ink-soft">Contiene l&apos;annuncio, il tuo CV e la regola più importante: non inventare niente.</p>
        <CopyButton text={prompt} label="Copia il testo per Claude" wide primary />
        <pre tabIndex={0} role="region" aria-label="Contenuto scorrevole" className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-4 font-sans text-[0.95rem]">{prompt}</pre>
      </Card>

      <Card className="mt-5">
        <p className="font-bold">2. Incollalo nella chat di Claude</p>
        <p className="mt-1">Claude è un assistente che aiuta a scrivere: apri claude.ai, incolla il testo e invia. Controlla che la lettera dica solo cose vere.</p>
        <p className="mt-2 text-ink-soft">La prima volta fatti aiutare da chi ti ha preparato Compass: serve un account su claude.ai.</p>
        {!cvText && <p className="mt-3 rounded-xl bg-amber px-4 py-3 text-amber-ink">Il testo del tuo CV non è ancora salvato: puoi aggiungerlo in Aiuto → I miei CV.</p>}
      </Card>

      <SectionTitle>3. Incolla qui la lettera preparata</SectionTitle>
      <form action={saveCuratedAction} className="space-y-5">
        <input type="hidden" name="jobId" value={job.id} />
        <Field label="Oggetto dell'e-mail" htmlFor="subject">
          <input id="subject" name="subject" type="text" defaultValue={`Candidatura per ${job.title} | ${p.name}`} />
        </Field>
        <Field label="Testo della lettera" htmlFor="body" hint="Incolla qui la lettera che ti ha preparato Claude.">
          <textarea id="body" name="body" rows={10} required />
        </Field>
        <Button wide>{job.applicationEmail ? "Salva e metti tra quelle da inviare" : "Salva e vai al kit candidatura"}</Button>
      </form>
    </>
  );
}
