import { notFound } from "next/navigation";
import { Flash } from "@/components/flash";
import { IconArrowLeft, IconCalendar, IconClock, IconDoc, IconEuro, IconExternal, IconLang, IconMail, IconPin, IconSparkle } from "@/components/icons";
import { Button, Card, ExternalButton, Fact, HelpBox, LevelBadge, LinkButton, Notice, SectionTitle } from "@/components/ui";
import { CONTRACT_LABELS, HOURS_LABELS } from "@/lib/core/extract";
import { SOURCE_LABELS } from "@/lib/core/normalize";
import { formatSalary } from "@/lib/core/salary";
import { daysAgoLabel, formatDate } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { getJob, markSeen } from "@/lib/server/jobs";
import { and, eq } from "drizzle-orm";
import { prepareEmailAction, restoreAction } from "../../actions";

export default async function OffertaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const data = await getJob(db, Number(id));
  if (!data) notFound();
  const { job, sources } = data;
  if (job.status === "new") await markSeen(db, job.id);
  const app = await db.query.applications.findFirst({ where: and(eq(schema.applications.jobId, job.id)) });
  const link = sources.find((s) => s.url)?.url ?? null;
  const salary = formatSalary({
    raw: job.salaryRaw ?? "",
    minAnnualGross: job.salaryMin,
    maxAnnualGross: job.salaryMax,
    basis: job.salaryBasis as never,
    isEstimate: job.salaryIsEstimate,
    note: job.salaryNote,
  });
  const appliedText =
    app && ["sent", "replied", "interview", "rejected", "offer", "applied_site"].includes(app.status)
      ? "Ti sei già candidata a questa offerta."
      : app?.status === "queued"
        ? "La candidatura è in partenza: la trovi in “Da inviare”."
        : app?.status === "draft"
          ? "La candidatura è pronta in “Da inviare”."
          : null;

  return (
    <>
      <Flash code={sp.msg} />
      <LinkButton href="/offerte" variant="quiet" className="-ml-3 mb-2 px-3">
        <IconArrowLeft /> Torna alle offerte
      </LinkButton>

      <article className="rise">
        <LevelBadge level={job.level} />
        <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.12] sm:text-[2.5rem]">{job.title}</h1>
        <p className="mt-2 text-[1.2rem] text-ink-soft">
          {job.company ?? "Azienda non indicata"}
          {job.city ? ` · ${job.city}${job.province ? ` (${job.province})` : ""}` : ""}
        </p>

        <HelpBox text="Leggi l'offerta. Se ti piace, premi il pulsante blu grande per candidarti; se non ti interessa, premi Non mi interessa." />

        {job.scamFlags.length > 0 && (
          <div className="mt-5">
            <Notice tone="danger" title="Attenzione: questo annuncio sembra sospetto">
              <ul className="mt-1 list-disc pl-5">
                {job.scamFlags.map((f) => (
                  <li key={f.id}>{f.warning}</li>
                ))}
              </ul>
            </Notice>
          </div>
        )}

        {job.reasons.length > 0 && (
          <Card className="mt-5">
            <p className="font-bold">Perché te la propongo</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {job.factors
                .filter((f) => f.points !== 0)
                .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
                .slice(0, 4)
                .map((f) => (
                  <li key={f.key}>{f.reason}</li>
                ))}
            </ul>
          </Card>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Fact icon={<IconPin />} label="Dove">
            {job.remote === "remote" ? "Da casa" : job.city ?? "Non indicato"}
            {job.distanceKm != null && job.remote !== "remote" ? (job.distanceKm < 1 ? ", nella tua città" : `, a ${Math.round(job.distanceKm)} km da casa`) : ""}
            {job.remote === "hybrid" ? " (in parte da casa)" : ""}
          </Fact>
          <Fact icon={<IconEuro />} label="Stipendio">
            {salary}
            {job.salaryNote && job.salaryIsEstimate && <span className="block text-[0.95rem] text-ink-soft">{job.salaryNote}</span>}
          </Fact>
          <Fact icon={<IconClock />} label="Orario">
            {HOURS_LABELS[job.hours as keyof typeof HOURS_LABELS]}
          </Fact>
          <Fact icon={<IconDoc />} label="Contratto">
            {CONTRACT_LABELS[job.contract as keyof typeof CONTRACT_LABELS]}
          </Fact>
          {job.languages.length > 0 && (
            <Fact icon={<IconLang />} label="Lingue">
              {job.languages.map((l) => `${l.language[0].toUpperCase()}${l.language.slice(1)} ${l.level === "richiesto" ? "" : l.level}`).join(", ")}
            </Fact>
          )}
          <Fact icon={<IconCalendar />} label="Trovata">
            {job.postedAt ? formatDate(job.postedAt) : daysAgoLabel(job.firstSeenAt)}
          </Fact>
        </div>

        {appliedText && (
          <div className="mt-6">
            <Notice tone="success">{appliedText}</Notice>
          </div>
        )}

        {job.status === "dismissed" ? (
          <form action={restoreAction} className="mt-6">
            <input type="hidden" name="jobId" value={job.id} />
            <Notice tone="info">Avevi scartato questa offerta.</Notice>
            <Button className="mt-3" variant="secondary" wide>
              Rimettila tra le offerte
            </Button>
          </form>
        ) : (
          !appliedText && (
            <section className="mt-7 space-y-3">
              {job.applicationEmail ? (
                <>
                  <form action={prepareEmailAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button wide>
                      <IconMail /> Prepara la candidatura via e-mail
                    </Button>
                  </form>
                  <p className="text-center text-[0.98rem] text-ink-soft">
                    L&apos;annuncio chiede di scrivere a <strong className="text-ink">{job.applicationEmail}</strong>. Prima di partire te la faccio vedere.
                  </p>
                </>
              ) : (
                <LinkButton href={`/offerte/${job.id}/kit`} wide>
                  <IconExternal /> Candidati sul sito
                </LinkButton>
              )}
              <LinkButton href={`/offerte/${job.id}/claude`} variant="secondary" wide>
                <IconSparkle /> Prepara con Claude (per le offerte migliori)
              </LinkButton>
              <LinkButton href={`/offerte/${job.id}/non-mi-interessa`} variant="quiet" wide>
                Non mi interessa
              </LinkButton>
            </section>
          )
        )}

        <SectionTitle>L&apos;annuncio</SectionTitle>
        <Card>
          {job.description ? (
            <div className="whitespace-pre-line text-[1.05rem] leading-relaxed">{job.description}</div>
          ) : (
            <p className="text-ink-soft">Il testo completo è sul sito dell&apos;annuncio.</p>
          )}
          {job.thin && <p className="mt-4 text-[0.98rem] text-ink-soft">Qui c&apos;è solo un riassunto: il testo completo è sul sito dell&apos;annuncio.</p>}
          {job.applicationEmailEvidence && (
            <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-[0.98rem]">
              <strong>Dove ho trovato l&apos;indirizzo:</strong> &ldquo;{job.applicationEmailEvidence}&rdquo;
            </p>
          )}
        </Card>

        {link && (
          <div className="mt-5">
            <ExternalButton href={link} wide>
              <IconExternal /> Apri l&apos;annuncio originale
            </ExternalButton>
          </div>
        )}
        <p className="mt-4 text-[0.98rem] text-ink-soft">
          Trovata tramite: {[...new Set(sources.map((s) => SOURCE_LABELS[s.source] ?? s.source))].join(", ")}.
        </p>
      </article>
    </>
  );
}
