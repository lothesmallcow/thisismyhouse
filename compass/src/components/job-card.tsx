import Link from "next/link";
import type { Job } from "@/lib/server/jobs";
import { daysAgoLabel } from "@/lib/core/time";
import { factChips } from "@/lib/core/job-facts";
import { grossAnnualToNetMonthly } from "@/lib/core/salary";
import { deadlineText } from "@/lib/core/deadline";
import { IconMail, IconPin, IconStar } from "./icons";
import { LevelBadge } from "./ui";
import { CardActions } from "./card-actions";

function salaryShort(j: Job): string | null {
  if (j.salaryMin == null || j.salaryMax == null) return null;
  const f = (n: number) => `${Math.round(n / 1000)}k`;
  const r = j.salaryMin === j.salaryMax ? f(j.salaryMin) : `${f(j.salaryMin)}–${f(j.salaryMax)}`;
  // The take-home pay, which is what people compare: ≈ net a month (13 months).
  const net = grossAnnualToNetMonthly((j.salaryMin + j.salaryMax) / 2);
  return `${r} €/anno${j.salaryIsEstimate ? " (stima)" : ""} · ≈ ${net.toLocaleString("it-IT")} € netti al mese`;
}

const TYPE_LABEL: Record<string, string> = { stage: "Stage", programma: "Programma studenti" };
const LEVEL_BAR = { molto: "before:bg-level-molto", adatta: "before:bg-level-adatta", poco: "before:bg-level-poco" } as const;

/** `dismiss`: the instant "Non mi interessa" (the card goes at once and never comes back), with "Mi interessa" next to it. */
export function JobCard({ job, dismiss, back }: { job: Job; dismiss?: (jobId: number) => Promise<void>; back?: string }) {
  const negative = (r: string) => /lontan|sotto|non è|chiede|evitare|truffa|vecchio|scadut|scartato|non cerchi|è part|è a tempo|fuori|pensato per|non retribuito|riservato|solo per|chiuse|non aperto|per studenti di magistrale|per chi si laurea nel \d{4}, tu/i.test(r);
  const salary = salaryShort(job);
  // An ad weeks old with no deadline ahead may be closed: said on the card, not only in the score.
  const now = new Date();
  const ageDays = job.postedAt ? (now.getTime() - job.postedAt.getTime()) / 86_400_000 : 0;
  const expired = (job.eligibility as string[]).includes("scaduto");
  const maybeExpired = !expired && ageDays > 14 && !(job.closesAt && job.closesAt.getTime() >= now.getTime());
  const deadline = deadlineText(job, now);
  const place = job.remote === "remote" ? "Da remoto" : job.city ? `${job.city}${job.distanceKm != null ? (job.distanceKm < 1 ? "" : ` · ${Math.round(job.distanceKm)} km`) : ""}` : null;
  return (
    <article
      id={`job-${job.id}`}
      data-job-card
      className={`lift scroll-mt-24 group relative overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-surface p-4 pl-5 shadow-[var(--shadow-card)] before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] hover:border-line-strong sm:p-5 sm:pl-6 ${LEVEL_BAR[job.level]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.015em]">
              <Link href={`/offerte/${job.id}`} className="text-ink no-underline after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']">
                {job.title}
              </Link>
            </h3>
            {job.status === "new" && <span className="inline-flex h-5 items-center rounded-full bg-accent px-2 text-[10.5px] font-bold uppercase tracking-[0.04em] text-on-primary">Nuova</span>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13.5px] text-muted">
            <span className="font-semibold text-ink/85">{job.company ?? "Azienda non indicata"}</span>
            {job.presetMatch === "company" && <IconStar size={13} className="text-accent" aria-label="Azienda scelta da te" />}
            {place && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <IconPin size={13} /> {place}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="leading-none tabular-nums text-ink" aria-label={`Punteggio ${job.fit} su 100`}>
            <span className="text-[26px] font-bold tracking-[-0.035em]">{job.fit}</span>
            <span className="text-[11px] font-medium text-faint">/100</span>
          </span>
          <LevelBadge level={job.level} />
        </div>
      </div>

      {job.reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {job.reasons.map((r) => (
            <li key={r} className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium ${negative(r) ? "bg-warn-soft text-warn" : "bg-subtle text-muted"}`}>
              {r}
            </li>
          ))}
        </ul>
      )}

      {factChips(job.facts, { max: 5 }).length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Cosa chiede e cosa offre">
          {factChips(job.facts, { max: 5 }).map((c) => (
            <li key={c.label} className={`rounded-md px-2 py-0.5 text-[12px] ${c.tone === "good" ? "bg-good-soft text-good" : c.tone === "warn" ? "bg-warn-soft text-warn" : "bg-fill/70 text-muted"}`}>
              {c.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-faint">
        {TYPE_LABEL[job.jobType] && <span className="font-medium text-muted">{TYPE_LABEL[job.jobType]}</span>}
        {deadline && <span className={deadline.urgent ? "font-medium text-warn" : "font-medium text-muted"}>{deadline.text}</span>}
        {job.rolling && !deadline?.text.startsWith("Candidature chiuse") && <span className="font-medium text-accent">Rolling: candidati presto</span>}
        {salary && <span>{salary}</span>}
        {job.applicationEmail && (
          <span className="inline-flex items-center gap-1">
            <IconMail size={13} /> Candidatura via e-mail
          </span>
        )}
        <span>{job.postedAt ? "Pubblicata" : "Trovata"} {daysAgoLabel(job.postedAt ?? job.firstSeenAt)}</span>
        {expired && <span className="font-semibold text-warn">Annuncio scaduto</span>}
        {maybeExpired && <span className="font-medium text-warn">{ageDays > 30 ? "Probabilmente scaduta" : "Potrebbe essere scaduta"}: controlla prima di candidarti</span>}
        {dismiss && job.status !== "dismissed" && <CardActions jobId={job.id} title={job.title} back={back ?? "/offerte"} dismiss={dismiss} />}
      </div>
    </article>
  );
}
