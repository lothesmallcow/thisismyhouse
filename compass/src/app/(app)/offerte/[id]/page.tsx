import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { IconArrowLeft, IconExternal, IconMail, IconSparkle, IconStar } from "@/components/icons";
import { Button, Card, Chip, ExternalButton, Fact, LevelBadge, LinkButton, Notice } from "@/components/ui";
import { CONTRACT_LABELS, eligibilityLabel, HOURS_LABELS } from "@/lib/core/extract";
import { deadlineText, ROLLING_TEXT, runsText } from "@/lib/core/deadline";
import { SOURCE_LABELS } from "@/lib/core/normalize";
import { formatSalary } from "@/lib/core/salary";
import { daysAgoLabel, formatDate } from "@/lib/core/time";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";
import { getJob, markSeen } from "@/lib/server/jobs";
import { FitCard, RequirementsCard } from "@/components/fit";
import { scaledPay, sheetFor } from "@/lib/catalog/role-sheets";
import { findPlace } from "@/lib/core/geo";
import { checkRequirements, extractRequirements } from "@/lib/core/requirements";
import { background } from "@/lib/server/person";
import { getProfile } from "@/lib/server/profile";
import { prepareEmailAction, removeFromFolderAction, restoreAction, saveToFolderAction } from "../../actions";
import { foldersOf, listFolders } from "@/lib/server/folders";

export default async function OffertaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const db = getDb();
  const data = await getJob(db, user.id, Number(id));
  if (!data) notFound();
  const { job, sources } = data;
  if (job.status === "new" && user.viewer === "self") await markSeen(db, user.id, job.id);
  const app = await db.query.applications.findFirst({ where: and(eq(schema.applications.jobId, job.id), eq(schema.applications.userId, user.id)) });
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
      ? "Candidatura già inviata."
      : app?.status === "queued"
        ? "La candidatura è in partenza (Da inviare)."
        : app?.status === "draft"
          ? "La candidatura è pronta in Da inviare."
          : null;
  const factors = job.factors.filter((f) => f.points !== 0).sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  const profile = await getProfile(db, user.id);
  const req = extractRequirements(job.title, job.description);
  if (profile.track === "stage") req.years = null;
  const sheet = sheetFor(job.title);
  const estimate = (() => {
    if (!sheet || sheet.pay.top[1] === 0) return null;
    const p = scaledPay(sheet, job.city ? findPlace(job.city) : null);
    const lo = Math.min(p.small[0], p.mid[0]);
    const hi = Math.max(p.top[1], p.mid[1]);
    return { where: p.where.split(",")[0], text: p.currency === "£" ? `£${lo}-${hi}k lordi l'anno` : `${lo}-${hi}k € lordi l'anno` };
  })();
  const folders = await listFolders(db, user.id);
  const inIds = await foldersOf(db, user.id, job.id);
  const inFolders = folders.filter((f) => inIds.includes(f.id));
  const checks = checkRequirements(req, (await background(db, user.id, profile)).person);

  return (
    <>
      <Flash code={sp.msg} />
      <Link href="/offerte" className="mb-5 inline-flex h-8 items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink">
        <IconArrowLeft size={16} /> Offerte
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={job.level} />
            {job.jobType === "stage" && <Chip tone="accent">Stage</Chip>}
            {job.jobType === "programma" && <Chip tone="accent">Programma per studenti</Chip>}
            {job.presetMatch === "company" && (
              <Chip tone="good">
                <IconStar size={12} className="mr-1" /> Azienda scelta
              </Chip>
            )}
          </div>
          <h1 className="mt-3 text-[24px] font-semibold leading-tight sm:text-[28px]">{job.title}</h1>
          <p className="mt-1 text-[15px] text-muted">
            {job.company ?? "Azienda non indicata"}
            {job.city ? ` · ${job.city}${job.province ? ` (${job.province})` : ""}` : ""}
          </p>

          {job.scamFlags.length > 0 && (
            <div className="mt-5">
              <Notice tone="danger" title="Questo annuncio sembra sospetto">
                <ul className="list-disc pl-4">
                  {job.scamFlags.map((f) => (
                    <li key={f.id}>{f.warning}</li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-5 border-y border-line py-5 sm:grid-cols-3">
            <Fact label="Dove">
              {job.remote === "remote" ? "Da remoto" : (job.city ?? "Non indicato")}
              {job.distanceKm != null && job.remote !== "remote" ? (job.distanceKm < 1 ? ", nella tua città" : `, ${Math.round(job.distanceKm)} km`) : ""}
              {job.remote === "hybrid" ? " · ibrido" : ""}
            </Fact>
            <Fact label="Retribuzione">
              {salary}
              {job.salaryNote && job.salaryIsEstimate && <span className="block text-[12.5px] text-faint">{job.salaryNote}</span>}
              {job.salaryMax == null && estimate && (
                <span className="block text-[12.5px] text-faint">
                  Non indicata. Per questo ruolo a {estimate.where}: di solito {estimate.text}, a seconda della dimensione dell&apos;azienda (stima di Compass).
                </span>
              )}
            </Fact>
            <Fact label="Contratto">
              {CONTRACT_LABELS[job.contract as keyof typeof CONTRACT_LABELS]}
              {job.hours !== "unknown" ? ` · ${HOURS_LABELS[job.hours as keyof typeof HOURS_LABELS].toLowerCase()}` : ""}
              {job.durationMonths ? ` · ${job.durationMonths} mesi` : ""}
            </Fact>
            {job.languages.length > 0 && (
              <Fact label="Lingue">{job.languages.map((l) => `${l.language[0].toUpperCase()}${l.language.slice(1)}${l.level === "richiesto" ? "" : ` ${l.level}`}`).join(", ")}</Fact>
            )}
            {job.eligibility.length > 0 && <Fact label="Per chi">{job.eligibility.map(eligibilityLabel).join(", ")}</Fact>}
            {(deadlineText(job, new Date()) || job.rolling || runsText(job)) && (
              <Fact label="Date">
                {[deadlineText(job, new Date())?.text, runsText(job)].filter(Boolean).join(" · ")}
                {job.rolling && <span className="block text-[12.5px] text-accent">{ROLLING_TEXT}</span>}
                <span className="block text-[12.5px] text-faint">Lette dall&apos;annuncio: controllale sulla pagina ufficiale prima di candidarti.</span>
              </Fact>
            )}
            <Fact label="Trovata">{job.postedAt ? formatDate(job.postedAt) : daysAgoLabel(job.firstSeenAt)}</Fact>
          </div>

          <h2 className="mb-3 mt-8 text-[16px] font-semibold">Annuncio</h2>
          {job.description ? (
            <div className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{job.description}</div>
          ) : (
            <p className="text-muted">Il testo completo è sul sito dell&apos;annuncio.</p>
          )}
          {job.thin && <p className="mt-3 text-[13px] text-faint">Questo è un riassunto: il testo completo è sul sito dell&apos;annuncio.</p>}
          {job.applicationEmailEvidence && (
            <p className="mt-4 rounded-lg bg-subtle px-3.5 py-2.5 text-[13px] text-muted">
              Indirizzo trovato in: &ldquo;{job.applicationEmailEvidence}&rdquo;
            </p>
          )}
          <p className="mt-6 text-[12.5px] text-faint">Fonte: {[...new Set(sources.map((s) => SOURCE_LABELS[s.source] ?? s.source))].join(", ")}</p>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="space-y-2.5 !p-4">
            {appliedText ? (
              <Notice tone="success">{appliedText}</Notice>
            ) : job.status === "dismissed" ? (
              <form action={restoreAction} className="space-y-2.5">
                <input type="hidden" name="jobId" value={job.id} />
                <p className="text-[13.5px] text-muted">Avevi nascosto questa offerta.</p>
                <Button variant="secondary" wide>
                  Rimetti tra le offerte
                </Button>
              </form>
            ) : (
              <>
                {job.applicationEmail ? (
                  <form action={prepareEmailAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button wide>
                      <IconMail size={16} /> Prepara candidatura via e-mail
                    </Button>
                    <p className="mt-1.5 text-[12.5px] text-faint">Verrà inviata a {job.applicationEmail}, dopo la tua conferma.</p>
                  </form>
                ) : (
                  <LinkButton href={`/offerte/${job.id}/kit`} wide>
                    Candidati sul sito
                  </LinkButton>
                )}
                <LinkButton href={`/offerte/${job.id}/claude`} variant="secondary" wide>
                  <IconSparkle size={16} /> Prepara con Claude
                </LinkButton>
                <LinkButton href={`/offerte/${job.id}/non-mi-interessa`} variant="ghost" wide>
                  Non mi interessa
                </LinkButton>
              </>
            )}
            {link && (
              <ExternalButton href={link} variant="ghost" wide>
                <IconExternal size={16} /> Annuncio originale
              </ExternalButton>
            )}
          </Card>

          <Card className="!p-4">
            <p className="text-[13px] font-semibold">Salva in una cartella</p>
            {inFolders.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {inFolders.map((f) => (
                  <li key={f.id}>
                    <form action={removeFromFolderAction}>
                      <input type="hidden" name="folderId" value={f.id} />
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="back" value={`/offerte/${job.id}`} />
                      <button className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft px-3 text-[12.5px] text-accent" aria-label={`Togli da ${f.name}`}>
                        {f.name} ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={saveToFolderAction} className="mt-2.5 space-y-2">
              <input type="hidden" name="jobId" value={job.id} />
              <label htmlFor="folderId" className="sr-only">
                Cartella
              </label>
              <select id="folderId" name="folderId" defaultValue="">
                <option value="">Scegli una cartella…</option>
                {folders
                  .filter((f) => !inIds.includes(f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
              <label htmlFor="newFolder" className="sr-only">
                Oppure una nuova cartella
              </label>
              <input id="newFolder" name="newFolder" type="text" placeholder="…oppure una nuova cartella" />
              <Button size="sm" variant="secondary" wide>
                Salva
              </Button>
            </form>
            <Link href="/offerte/cartelle" className="mt-1 inline-flex min-h-8 items-center text-[12.5px]">
              Tutte le cartelle
            </Link>
          </Card>
          <FitCard fit={job.fit} parts={job.parts} />
          {sheet && (
            <Card className="!p-4 text-[13px]">
              <p className="font-semibold">Il ruolo: {sheet.title}</p>
              <p className="mt-1 text-muted">Cosa si fa, cosa serve, età tipica e stipendio per tipo di azienda nella tua zona.</p>
              <Link href={`/ruoli/${sheet.id}`} className="mt-1 inline-flex min-h-8 items-center">
                Apri la scheda del ruolo
              </Link>
            </Card>
          )}
          <RequirementsCard checks={checks} />
          {factors.length > 0 && (
            <Card className="!p-4">
              <p className="text-[13px] font-semibold">Perché è {job.level === "molto" ? "molto adatta" : job.level === "adatta" ? "adatta" : "poco adatta"}</p>
              <ul className="mt-2.5 space-y-1.5">
                {factors.slice(0, 8).map((f) => (
                  <li key={f.key} className="flex items-start justify-between gap-3 text-[13px]">
                    <span className="text-muted">{f.reason}</span>
                    <span className={`shrink-0 tabular-nums ${f.points > 0 ? "text-good" : "text-bad"}`}>
                      {f.points > 0 ? "+" : ""}
                      {f.points}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
