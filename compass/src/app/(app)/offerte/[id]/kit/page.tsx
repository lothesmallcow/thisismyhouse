import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { IconArrowLeft, IconCheck, IconDoc, IconExternal } from "@/components/icons";
import { Button, Card, ExternalButton, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { pickCv } from "@/lib/core/cv-pick";
import { getDb, schema } from "@/lib/db";
import { getJob } from "@/lib/server/jobs";
import { getProfile } from "@/lib/server/profile";
import { appliedOnSiteAction } from "../../../actions";

export const metadata = { title: "Kit candidatura" };

export default async function KitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const data = await getJob(db, Number(id));
  if (!data) notFound();
  const { job, sources } = data;
  const p = await getProfile(db);
  const cvs = await db.select({ id: schema.cvs.id, label: schema.cvs.label, roleFamily: schema.cvs.roleFamily, isDefault: schema.cvs.isDefault, filename: schema.cvs.filename }).from(schema.cvs);
  const cv = pickCv(cvs, { title: job.title, sector: job.sector });
  const link = sources.find((s) => s.url)?.url;

  const answers = [
    { label: "Breve presentazione", value: p.presentation },
    { label: "Disponibilità", value: p.availability },
    { label: "Richiesta economica", value: p.salaryExpectation },
    { label: "Telefono", value: p.phone },
    { label: "E-mail", value: p.email },
    { label: "Profilo LinkedIn", value: p.linkedinUrl },
    { label: "Nome e cognome", value: p.name },
  ].filter((a) => a.value);

  return (
    <>
      <Flash code={sp.msg} />
      <LinkButton href={`/offerte/${id}`} variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna all&apos;offerta
      </LinkButton>
      <PageHeader
        title="Kit candidatura"
        help="Apri il sito dell'annuncio, poi copia da qui le risposte che ti chiedono e incollale nel modulo. Alla fine premi il pulsante verde in fondo."
      />
      <p className="mb-5 text-[1.1rem]">
        <strong>{job.title}</strong> · {job.company ?? "azienda non indicata"}
      </p>

      <Card className="space-y-4">
        <p className="font-bold">1. Apri l&apos;annuncio sul sito</p>
        {link ? (
          <ExternalButton href={link} variant="primary" wide>
            <IconExternal /> Apri il sito dell&apos;annuncio
          </ExternalButton>
        ) : (
          <p className="text-ink-soft">Non ho il link dell&apos;annuncio: cercalo sul sito dell&apos;azienda.</p>
        )}
        <p className="text-[0.98rem] text-ink-soft">Si apre in una nuova finestra. Questa pagina resta qui, ci puoi tornare quando vuoi.</p>
      </Card>

      <SectionTitle>2. Copia e incolla le risposte</SectionTitle>
      <div className="space-y-3">
        {answers.length === 0 && <p className="text-ink-soft">Compila le tue risposte in Aiuto → Il mio profilo.</p>}
        {answers.map((a) => (
          <Card key={a.label} className="!p-4">
            <p className="text-[0.92rem] font-bold uppercase tracking-wide text-ink-soft">{a.label}</p>
            <p className="mt-1 text-[1.05rem]">{a.value}</p>
            <div className="mt-3">
              <CopyButton text={a.value} label={`Copia ${a.label[0].toLowerCase()}${a.label.slice(1)}`} wide />
            </div>
          </Card>
        ))}
      </div>

      <SectionTitle>3. Il tuo CV</SectionTitle>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        {cv ? (
          <>
            <p className="flex items-center gap-2">
              <IconDoc /> <span>{cv.label}</span>
            </p>
            <a href={`/api/cv/${cv.id}`} download className="inline-flex min-h-[56px] items-center rounded-2xl border-2 border-navy px-5 font-bold no-underline">
              Scarica il CV
            </a>
          </>
        ) : (
          <p className="text-ink-soft">Non hai ancora caricato un CV. Puoi farlo in Aiuto → I miei CV.</p>
        )}
      </Card>
      <p className="mt-2 text-[0.98rem] text-ink-soft">Quando il sito ti chiede di caricare il CV, scegli questo file dalla cartella &ldquo;Download&rdquo;.</p>

      <form action={appliedOnSiteAction} className="mt-10">
        <input type="hidden" name="jobId" value={job.id} />
        <Button variant="success" wide>
          <IconCheck /> Fatto, mi sono candidata
        </Button>
      </form>
    </>
  );
}
