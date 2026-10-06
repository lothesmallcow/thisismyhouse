import Link from "next/link";
import type { Job } from "@/lib/server/jobs";
import { daysAgoLabel } from "@/lib/core/time";
import { deadlineText } from "@/lib/core/deadline";
import { IconMail, IconPin, IconStar } from "./icons";
import { LevelBadge } from "./ui";

function salaryShort(j: Job): string | null {
  if (j.salaryMin == null || j.salaryMax == null) return null;
  const f = (n: number) => `${Math.round(n / 1000)}k`;
  const r = j.salaryMin === j.salaryMax ? f(j.salaryMin) : `${f(j.salaryMin)}–${f(j.salaryMax)}`;
  return `${r} €/anno${j.salaryIsEstimate ? " (stima)" : ""}`;
}

const TYPE_LABEL: Record<string, string> = { stage: "Stage", programma: "Programma studenti" };

/** `dismiss`: the one-click "Non mi interessa" (the offer leaves the list, and does not come back). */
export function JobCard({ job, dismiss, back }: { job: Job; dismiss?: (f: FormData) => Promise<void>; back?: string }) {
  const negative = (r: string) => /lontan|sotto|non è|chiede|evitare|truffa|vecchio|scartato|non cerchi|è part|è a tempo|fuori|pensato per|non retribuito|riservato|solo per|chiuse|non aperto|per studenti di magistrale|per chi si laurea nel \d{4}, tu/i.test(r);
  const salary = salaryShort(job);
  const deadline = deadlineText(job, new Date());
  const place = job.remote === "remote" ? "Da remoto" : job.city ? `${job.city}${job.distanceKm != null ? (job.distanceKm < 1 ? "" : ` · ${Math.round(job.distanceKm)} km`) : ""}` : null;
  return (
    <article className="group relative rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15.5px] font-semibold leading-snug">
            <Link href={`/offerte/${job.id}`} className="text-ink no-underline after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13.5px] text-muted">
            <span className="font-medium text-ink/80">{job.company ?? "Azienda non indicata"}</span>
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
          <span className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold tabular-nums text-ink" aria-label={`Punteggio ${job.fit} su 100`}>
              {job.fit}
              <span className="text-[11px] font-normal text-faint">/100</span>
            </span>
            <LevelBadge level={job.level} />
          </span>
          {job.status === "new" && <span className="text-[11.5px] font-medium text-accent">Nuova</span>}
        </div>
      </div>

      {job.reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {job.reasons.map((r) => (
            <li key={r} className={`rounded-md px-2 py-0.5 text-[12.5px] ${negative(r) ? "bg-warn-soft text-warn" : "bg-subtle text-muted"}`}>
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
        {dismiss && job.status !== "dismissed" && (
          <form action={dismiss} className="relative z-10 ml-auto">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="back" value={back ?? "/offerte"} />
            <button className="inline-flex h-8 items-center rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-muted hover:border-line-strong hover:text-ink" aria-label={`Non mi interessa: ${job.title}`}>
              Non mi interessa
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
