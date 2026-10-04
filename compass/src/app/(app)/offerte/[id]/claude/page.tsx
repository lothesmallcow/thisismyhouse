import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { IconArrowLeft } from "@/components/icons";
import { Button, Card, Field, Notice, PageHeader } from "@/components/ui";
import { pickCv } from "@/lib/core/cv-pick";
import { buildClaudePrompt } from "@/lib/core/prompt";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getJob } from "@/lib/server/jobs";
import { getProfile } from "@/lib/server/profile";
import { saveCuratedAction } from "../../../actions";

export const metadata = { title: "Prepara con Claude" };

export default async function ClaudePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lingua?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const data = await getJob(db, user.id, Number(id));
  if (!data) notFound();
  const { job, sources } = data;
  const p = await getProfile(db, user.id);
  const cvs = await db.select().from(schema.cvs).where(and(eq(schema.cvs.userId, user.id)));
  const cv = pickCv(cvs, { title: job.title, sector: job.sector });
  const cvText = cvs.find((c) => c.id === cv?.id)?.text ?? "";
  const language = sp.lingua === "en" ? "en" : "it";
  const prompt = buildClaudePrompt({
    job: { title: job.title, company: job.company, city: job.city, description: job.description, url: sources.find((s) => s.url)?.url ?? null },
    cvText,
    name: p.name,
    student: p.track === "stage" ? { university: p.university, degree: p.degree, year: p.studyYear } : null,
    language,
  });

  return (
    <>
      <Link href={`/offerte/${id}`} className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
        <IconArrowLeft size={16} /> Offerta
      </Link>
      <PageHeader
        eyebrow="Prepara con Claude"
        title={job.title}
        description="Copia il testo, incollalo in claude.ai, poi incolla qui la lettera che ti prepara. Il testo chiede a Claude di non inventare nulla."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="!p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] font-semibold">1. Testo da copiare</p>
            <div role="group" aria-label="Lingua della lettera" className="inline-flex rounded-lg border border-line p-0.5 text-[12.5px]">
              {(["it", "en"] as const).map((l) => (
                <Link
                  key={l}
                  href={`/offerte/${id}/claude${l === "en" ? "?lingua=en" : ""}`}
                  aria-current={language === l ? "true" : undefined}
                  className={`inline-flex h-7 items-center rounded-md px-2.5 no-underline ${language === l ? "bg-subtle font-medium text-ink" : "text-muted"}`}
                >
                  {l === "it" ? "Lettera in italiano" : "In inglese"}
                </Link>
              ))}
            </div>
          </div>
          <pre tabIndex={0} role="region" aria-label="Testo per Claude" className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-subtle p-3.5 font-sans text-[13px] leading-relaxed text-muted">
            {prompt}
          </pre>
          <div className="mt-3">
            <CopyButton text={prompt} label="Copia il testo" primary wide />
          </div>
          {!cvText && (
            <div className="mt-3">
              <Notice tone="warn">
                Il testo del tuo CV non è salvato: aggiungilo in <Link href="/profilo/cv">Profilo → CV</Link> per un risultato migliore.
              </Notice>
            </div>
          )}
        </Card>

        <form action={saveCuratedAction} className="space-y-4">
          <input type="hidden" name="jobId" value={job.id} />
          <p className="text-[14px] font-semibold">2. Incolla la lettera preparata</p>
          <Field label="Oggetto dell'e-mail" htmlFor="subject">
            <input id="subject" name="subject" type="text" defaultValue={`${language === "en" ? "Application" : "Candidatura"}: ${job.title} | ${p.name}`} />
          </Field>
          <Field label="Testo della lettera" htmlFor="body" hint="Rileggila: deve dire solo cose vere.">
            <textarea id="body" name="body" rows={12} required />
          </Field>
          <Button wide>{job.applicationEmail ? "Salva tra quelle da inviare" : "Salva e vai al kit candidatura"}</Button>
        </form>
      </div>
    </>
  );
}
