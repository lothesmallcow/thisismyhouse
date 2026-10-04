import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { IconArrowLeft, IconCheck, IconDoc, IconExternal } from "@/components/icons";
import { Button, Card, ExternalButton, PageHeader, SectionTitle } from "@/components/ui";
import { pickCv } from "@/lib/core/cv-pick";
import { getDb } from "@/lib/db";
import { cvList } from "@/lib/server/applications";
import { requireUser } from "@/lib/server/auth";
import { getJob } from "@/lib/server/jobs";
import { getProfile } from "@/lib/server/profile";
import { appliedOnSiteAction } from "../../../actions";

export const metadata = { title: "Kit candidatura" };

export default async function KitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const data = await getJob(db, user.id, Number(id));
  if (!data) notFound();
  const { job, sources } = data;
  const p = await getProfile(db, user.id);
  const cv = pickCv(await cvList(db, user.id), { title: job.title, sector: job.sector });
  const link = sources.find((s) => s.url)?.url;

  const answers = [
    { label: "Nome e cognome", value: p.name },
    { label: "E-mail", value: p.email },
    { label: "Telefono", value: p.phone },
    { label: "Profilo LinkedIn", value: p.linkedinUrl },
    ...(p.track === "stage"
      ? [
          { label: "Università", value: p.university },
          { label: "Corso di laurea", value: p.degree },
          { label: "Anno di corso", value: p.studyYear ? `${p.studyYear}° anno${p.degreeYears ? ` di ${p.degreeYears}` : ""}` : "" },
          { label: "Laurea prevista", value: p.graduationYear ? String(p.graduationYear) : "" },
        ]
      : []),
    { label: "Breve presentazione", value: p.presentation },
    { label: "Disponibilità", value: p.availability },
    { label: p.track === "stage" ? "Richiesta economica / rimborso" : "Richiesta economica", value: p.salaryExpectation },
  ].filter((a) => a.value);

  return (
    <>
      <Flash code={sp.msg} />
      <Link href={`/offerte/${id}`} className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
        <IconArrowLeft size={16} /> Offerta
      </Link>
      <PageHeader eyebrow="Kit candidatura" title={job.title} description={`${job.company ?? "Azienda non indicata"} · apri il sito, copia le risposte nel modulo, poi segna la candidatura come inviata.`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="space-y-2">
            {answers.length === 0 && <p className="text-muted">Compila le risposte pronte nel tuo profilo.</p>}
            {answers.map((a) => (
              <div key={a.label} className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">{a.label}</p>
                  <p className="mt-0.5 text-[14px]">{a.value}</p>
                </div>
                <CopyButton text={a.value} label="Copia" size="sm" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px]">
            <Link href="/benvenuto/risposte?ritorno=profilo">Modifica le risposte</Link>
          </p>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-2.5 !p-4">
            {link ? (
              <ExternalButton href={link} variant="primary" wide>
                <IconExternal size={16} /> Apri il sito dell&apos;annuncio
              </ExternalButton>
            ) : (
              <p className="text-[13.5px] text-muted">Link non disponibile: cerca l&apos;annuncio sul sito dell&apos;azienda.</p>
            )}
            {cv ? (
              <a href={`/api/cv/${cv.id}`} download className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line-strong text-[14px] font-medium text-ink no-underline hover:bg-subtle">
                <IconDoc size={16} /> Scarica {cv.label}
              </a>
            ) : (
              <p className="text-[13.5px] text-muted">
                Nessun CV caricato. <Link href="/profilo/cv">Caricalo qui</Link>.
              </p>
            )}
          </Card>
          <form action={appliedOnSiteAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <Button variant="accent" wide>
              <IconCheck size={16} /> Ho inviato la candidatura
            </Button>
          </form>
        </aside>
      </div>
      <SectionTitle className="sr-only">Fine</SectionTitle>
    </>
  );
}
