import Link from "next/link";
import type { Job } from "@/lib/server/jobs";
import { HOURS_LABELS } from "@/lib/core/extract";
import { daysAgoLabel } from "@/lib/core/time";
import { IconAlert, IconArrowRight, IconCheck, IconClock, IconEuro, IconMail, IconPin } from "./icons";
import { LevelBadge } from "./ui";

function salaryShort(j: Job): string | null {
  if (j.salaryMin == null || j.salaryMax == null) return null;
  const f = (n: number) => `${Math.round(n / 1000)}k`;
  const r = j.salaryMin === j.salaryMax ? f(j.salaryMin) : `${f(j.salaryMin)}–${f(j.salaryMax)}`;
  return `${r} € l'anno${j.salaryIsEstimate ? " (stima)" : ""}`;
}

export function JobCard({ job }: { job: Job }) {
  const negative = (r: string) => /lontan|sotto|non è|chiede|evitare|truffa|vecchio|scartato|non cerchi|è part|è a tempo/i.test(r);
  const salary = salaryShort(job);
  return (
    <article className="rise group relative rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[0_14px_32px_-14px_rgb(23_34_45/0.35)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LevelBadge level={job.level} />
        {job.status === "new" && <span className="rounded-full bg-needle-ink px-3 py-1 text-[0.85rem] font-bold text-white">Nuova</span>}
      </div>
      <h3 className="mt-3 text-[1.5rem] font-semibold leading-snug">
        <Link href={`/offerte/${job.id}`} className="text-ink no-underline after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']">
          {job.title}
        </Link>
      </h3>
      <p className="mt-1 text-[1.05rem] text-ink-soft">
        {job.company ?? "Azienda non indicata"}
        {job.city ? ` · ${job.city}` : ""}
      </p>

      {job.reasons.length > 0 && (
        <ul className="mt-4 space-y-2">
          {job.reasons.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-[1.02rem]">
              {negative(r) ? <IconAlert className="mt-0.5 shrink-0 text-needle-ink" size={22} /> : <IconCheck className="mt-0.5 shrink-0 text-sage-ink" size={22} />}
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.98rem] text-ink-soft">
        {job.distanceKm != null && (
          <span className="inline-flex items-center gap-1.5">
            <IconPin size={20} /> {job.distanceKm < 1 ? "Nella tua città" : `${Math.round(job.distanceKm)} km`}
          </span>
        )}
        {salary && (
          <span className="inline-flex items-center gap-1.5">
            <IconEuro size={20} /> {salary}
          </span>
        )}
        {job.hours !== "unknown" && (
          <span className="inline-flex items-center gap-1.5">
            <IconClock size={20} /> {HOURS_LABELS[job.hours as keyof typeof HOURS_LABELS]}
          </span>
        )}
        {job.applicationEmail && (
          <span className="inline-flex items-center gap-1.5">
            <IconMail size={20} /> Candidatura via e-mail
          </span>
        )}
        <span>Vista {daysAgoLabel(job.postedAt ?? job.firstSeenAt)}</span>
      </div>

      <div className="mt-5 flex items-center justify-end">
        <span className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-navy px-5 font-bold text-white group-hover:bg-navy-strong">
          Vedi l&apos;offerta <IconArrowRight size={22} />
        </span>
      </div>
    </article>
  );
}
