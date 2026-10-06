import Link from "next/link";
import type { Job } from "@/lib/server/jobs";
import { daysAgoLabel } from "@/lib/core/time";
import { deadlineText } from "@/lib/core/deadline";
import { IconMail, IconPin, IconStar } from "./icons";
import { LevelBadge } from "./ui";
import { CardActions } from "./card-actions";

function salaryShort(j: Job): string | null {
  if (j.salaryMin == null || j.salaryMax == null) return null;
  const f = (n: number) => `${Math.round(n / 1000)}k`;
  const r = j.salaryMin === j.salaryMax ? f(j.salaryMin) : `${f(j.salaryMin)}–${f(j.salaryMax)}`;
  return `${r} €/anno${j.salaryIsEstimate ? " (stima)" : ""}`;
}

const TYPE_LABEL: Record<string, string> = { stage: "Stage", programma: "Programma studenti" };
const LEVEL_BAR = { molto: "before:bg-level-molto", adatta: "before:bg-level-adatta", poco: "before:bg-level-poco" } as const;

/** `dismiss`: the instant "Non mi interessa" (the card goes at once and never comes back), with "Mi interessa" next to it. */
export function JobCard({ job, dismiss, back }: { job: Job; dismiss?: (jobId: number) => Promise<void>; back?: string }) {
  const negative = (r: string) => /lontan|sotto|non è|chiede|evitare|truffa|vecchio|scartato|non cerchi|è part|è a tempo|fuori|pensato per|non retribuito|riservato|solo per|chiuse|non aperto|per studenti di magistrale|per chi si laurea nel \d{4}, tu/i.test(r);
  const salary = salaryShort(job);
  const deadline = deadlineText(job, new Date());
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
        <span>Trovata {daysAgoLabel(job.postedAt ?? job.firstSeenAt)}</span>
        {dismiss && job.status !== "dismissed" && <CardActions jobId={job.id} title={job.title} back={back ?? "/offerte"} dismiss={dismiss} />}
      </div>
    </article>
  );
}
