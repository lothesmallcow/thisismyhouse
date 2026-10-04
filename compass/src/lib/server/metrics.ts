// Admin metrics. These numbers may end up on a CV, so they are computed from raw rows,
// not estimated: jobs per source, applications per lane, reply rate, posting-to-application time.
import { sql } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";

export interface Metrics {
  jobsTotal: number;
  jobsBySource: { source: string; jobs: number }[];
  jobsByLevel: { level: string; jobs: number }[];
  applicationsByLane: { lane: string; total: number }[];
  emailSent: number;
  emailSimulated: number;
  replies: number;
  replyRate: number | null; // replies / REAL e-mail applications (demo sends excluded)
  simulatedReplyRate: number | null; // same, demo mode only
  medianHoursPostingToApplication: number | null;
  medianHoursFirstSeenToApplication: number | null;
  interviews: number;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function computeMetrics(db: DB): Promise<Metrics> {
  const [{ n: jobsTotal }] = await db.select({ n: sql<number>`count(*)` }).from(schema.jobs);
  // A job found by two sources counts for both: this is "jobs found per source".
  const bySource = await db
    .select({ source: schema.jobSources.source, jobs: sql<number>`count(distinct ${schema.jobSources.jobId})` })
    .from(schema.jobSources)
    .groupBy(schema.jobSources.source);
  const byLevel = await db.select({ level: schema.jobs.level, jobs: sql<number>`count(*)` }).from(schema.jobs).groupBy(schema.jobs.level);

  const apps = await db
    .select({ lane: schema.applications.lane, status: schema.applications.status, simulated: schema.applications.simulated, sentAt: schema.applications.sentAt, replyAt: schema.applications.replyAt, postedAt: schema.jobs.postedAt, firstSeenAt: schema.jobs.firstSeenAt })
    .from(schema.applications)
    .leftJoin(schema.jobs, sql`${schema.jobs.id} = ${schema.applications.jobId}`);
  const done = apps.filter((a) => a.sentAt && !["draft", "queued", "cancelled", "skipped", "failed"].includes(a.status));
  const lanes = new Map<string, number>();
  for (const a of done) lanes.set(a.lane, (lanes.get(a.lane) ?? 0) + 1);
  const emailDone = done.filter((a) => a.lane !== "site");
  const emailReal = emailDone.filter((a) => !a.simulated);
  const replied = emailDone.filter((a) => a.replyAt);
  const hrs = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 3600000;

  return {
    jobsTotal: Number(jobsTotal),
    jobsBySource: bySource.map((r) => ({ source: r.source, jobs: Number(r.jobs) })).sort((a, b) => b.jobs - a.jobs),
    jobsByLevel: byLevel.map((r) => ({ level: r.level, jobs: Number(r.jobs) })),
    applicationsByLane: [...lanes].map(([lane, total]) => ({ lane, total })),
    emailSent: emailReal.length,
    emailSimulated: emailDone.length - emailReal.length,
    replies: replied.filter((a) => !a.simulated).length,
    replyRate: emailReal.length ? emailReal.filter((a) => a.replyAt).length / emailReal.length : null,
    simulatedReplyRate: emailDone.length > emailReal.length ? replied.filter((a) => a.simulated).length / (emailDone.length - emailReal.length) : null,
    medianHoursPostingToApplication: median(done.filter((a) => a.postedAt).map((a) => hrs(a.postedAt!, a.sentAt!))),
    medianHoursFirstSeenToApplication: median(done.filter((a) => a.firstSeenAt).map((a) => hrs(a.firstSeenAt!, a.sentAt!))),
    interviews: apps.filter((a) => a.status === "interview" || a.status === "offer").length,
  };
}
