// Jobs repository. Jobs are stored once (merging duplicates across sources); each person has
// their own view of them in user_jobs: distance from their home, their ranking, their actions.
// A job is visible to someone if at least one of its sources is shared (userId null) or theirs.

import { and, desc, eq, gte, inArray, isNull, like, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { findDuplicate, dedupeKey, type DedupeCandidate } from "../core/dedupe";
import { distanceKm } from "../core/geo";
import { normalizeJob, type RawJob } from "../core/normalize";
import { rankJob, type Level, type RankAdjustment } from "../core/rank";
import { MONTHS_PER_YEAR, netAnnualToGrossAnnual } from "../core/salary";
import { scamFlags } from "../core/scam-rules";
import type { DB } from "../db";
import { schema } from "../db";
import { rankPrefs } from "./catalog";
import { getProfile, homeOf, toRankProfile, type Profile } from "./profile";

export type JobRow = typeof schema.jobs.$inferSelect;
export type UserJobRow = typeof schema.userJobs.$inferSelect;
/** A job as one person sees it. */
export type Job = JobRow & Omit<UserJobRow, "jobId" | "userId">;

// --- Ranking context ---------------------------------------------------------------------------

export interface RankContext {
  userId: number;
  profile: Profile;
  rp: ReturnType<typeof toRankProfile>;
  home: { lat: number; lng: number } | null;
  adj: RankAdjustment[];
}

export async function activeAdjustments(db: DB, userId: number): Promise<RankAdjustment[]> {
  const rows = await db
    .select()
    .from(schema.rankAdjustments)
    .where(and(eq(schema.rankAdjustments.active, true), eq(schema.rankAdjustments.userId, userId)));
  return rows.map((r) => ({ id: r.id, kind: r.kind, value: r.value, label: r.label }));
}

export async function rankContext(db: DB, userId: number): Promise<RankContext> {
  const profile = await getProfile(db, userId);
  return { userId, profile, rp: toRankProfile(profile, await rankPrefs(db, userId)), home: homeOf(profile), adj: await activeAdjustments(db, userId) };
}

/** Everyone who gets offers: active people (not admin accounts). */
export async function seekers(db: DB) {
  return db.select().from(schema.users).where(and(eq(schema.users.role, "user"), eq(schema.users.active, true)));
}

export async function rankContexts(db: DB): Promise<RankContext[]> {
  return Promise.all((await seekers(db)).map((u) => rankContext(db, u.id)));
}

function computeFor(job: JobRow, ctx: RankContext, now: Date) {
  const dist = ctx.home && job.lat != null && job.lng != null ? distanceKm(ctx.home, { lat: job.lat, lng: job.lng }) : null;
  const r = rankJob(
    {
      title: job.title,
      company: job.company,
      description: job.description,
      sector: job.sector,
      distanceKm: dist,
      remote: job.remote as never,
      hours: job.hours as never,
      contract: job.contract as never,
      minAnnualGross: job.salaryMin,
      maxAnnualGross: job.salaryMax,
      languages: job.languages as never,
      postedAt: job.postedAt ?? job.firstSeenAt,
      scamFlagCount: job.scamFlags.length,
      city: job.city,
      jobType: job.jobType as never,
      eligibility: job.eligibility as never,
    },
    ctx.rp,
    ctx.adj,
    now,
  );
  return { distanceKm: dist, score: r.score, level: r.level, reasons: r.reasons, factors: r.factors, presetMatch: r.presetMatch };
}

/** Who may see a job: null = everyone, else the owners of its private sources. */
async function audience(db: DB, jobId: number): Promise<Set<number> | null> {
  const rows = await db.select({ userId: schema.jobSources.userId }).from(schema.jobSources).where(eq(schema.jobSources.jobId, jobId));
  if (rows.length === 0 || rows.some((r) => r.userId == null)) return null;
  return new Set(rows.map((r) => r.userId!));
}

/** Rank one job for everyone allowed to see it (insert or update their user_jobs row, keeping their actions). */
export async function rankJobForAll(db: DB, jobId: number, now = new Date(), contexts?: RankContext[]): Promise<void> {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) });
  if (!job) return;
  const who = await audience(db, jobId);
  for (const ctx of contexts ?? (await rankContexts(db))) {
    if (who && !who.has(ctx.userId)) continue;
    const v = computeFor(job, ctx, now);
    await db
      .insert(schema.userJobs)
      .values({ userId: ctx.userId, jobId, ...v })
      .onConflictDoUpdate({ target: [schema.userJobs.userId, schema.userJobs.jobId], set: v });
  }
}

/** Recompute one person's view of every job they can see (after their profile or choices change). */
export async function rerankUser(db: DB, userId: number, now = new Date(), ctx?: RankContext): Promise<number> {
  const c = ctx ?? (await rankContext(db, userId));
  const visible = await db
    .select()
    .from(schema.jobs)
    .where(sql`exists (select 1 from ${schema.jobSources} s where s.job_id = ${schema.jobs.id} and (s.user_id is null or s.user_id = ${userId}))`);
  const existing = new Map((await db.select().from(schema.userJobs).where(eq(schema.userJobs.userId, userId))).map((r) => [r.jobId, r]));
  // Only rows whose values change are written, in batches of 200 statements per round trip
  // (on Turso one batch = one HTTP request instead of one per job).
  const writes = [];
  for (const job of visible) {
    const v = computeFor(job, c, now);
    const old = existing.get(job.id);
    if (
      old &&
      old.distanceKm === v.distanceKm &&
      old.score === v.score &&
      old.level === v.level &&
      old.presetMatch === v.presetMatch &&
      JSON.stringify(old.reasons) === JSON.stringify(v.reasons) &&
      JSON.stringify(old.factors) === JSON.stringify(v.factors)
    )
      continue;
    writes.push(
      db
        .insert(schema.userJobs)
        .values({ userId, jobId: job.id, ...v })
        .onConflictDoUpdate({ target: [schema.userJobs.userId, schema.userJobs.jobId], set: v }),
    );
  }
  for (let i = 0; i < writes.length; i += 200) {
    const chunk = writes.slice(i, i + 200);
    await db.batch(chunk as [(typeof chunk)[0], ...typeof chunk]);
  }
  return visible.length;
}

/** Recompute everyone's view (after global changes). */
export async function rerankAll(db: DB, now = new Date()): Promise<number> {
  let n = 0;
  for (const ctx of await rankContexts(db)) n += await rerankUser(db, ctx.userId, now, ctx);
  return n;
}

// --- Storing -------------------------------------------------------------------------------------

export interface UpsertResult {
  jobId: number;
  created: boolean;
}

export interface UpsertOptions {
  cache?: DedupeCandidate[];
  /** Private source: someone's own alert e-mails (all owners of that mailbox) or a manual addition. */
  owners?: number[];
  contexts?: RankContext[];
}

/** Insert a raw job, or merge it into an existing duplicate (keeping every source link). */
export async function upsertRawJob(db: DB, raw: RawJob, now = new Date(), opts: UpsertOptions = {}): Promise<UpsertResult> {
  const n = normalizeJob(raw, null);
  const candidates = opts.cache ?? (await dedupeCandidates(db));
  const dupId = findDuplicate({ company: n.company, title: n.title, city: n.city, url: n.url }, candidates);
  const owners = opts.owners?.length ? opts.owners : [null];

  if (dupId != null) {
    const existing = (await db.query.jobs.findFirst({ where: eq(schema.jobs.id, dupId) }))!;
    // A private addition (pasted by hand, or someone's alert) may only enrich a job nobody else can see:
    // text one person pasted must never change what others read.
    const who = await audience(db, dupId);
    const mayEnrich = !opts.owners?.length || (who != null && [...who].every((u) => opts.owners!.includes(u)));
    const patch: Partial<JobRow> = { updatedAt: now };
    if (mayEnrich) {
      // Enrich thin records with richer data, never overwrite good data with thinner data.
      if (existing.thin && !n.thin) {
        Object.assign(patch, {
          description: n.description,
          thin: false,
          company: existing.company ?? n.company,
          city: existing.city ?? n.city,
          province: existing.province ?? n.province,
          lat: existing.lat ?? n.lat,
          lng: existing.lng ?? n.lng,
          languages: n.languages,
          sector: existing.sector ?? n.sector,
          jobType: existing.jobType !== "unknown" ? existing.jobType : n.jobType,
          eligibility: n.eligibility,
          durationMonths: existing.durationMonths ?? n.durationMonths,
        });
      }
      if (existing.salaryMin == null && n.salary.minAnnualGross != null) {
        Object.assign(patch, {
          salaryRaw: n.salary.raw,
          salaryMin: n.salary.minAnnualGross,
          salaryMax: n.salary.maxAnnualGross,
          salaryBasis: n.salary.basis,
          salaryIsEstimate: n.salary.isEstimate,
          salaryNote: n.salary.note,
        });
      }
      if (existing.contract === "unknown" && n.contract !== "unknown") patch.contract = n.contract;
      if (existing.hours === "unknown" && n.hours !== "unknown") patch.hours = n.hours;
      if (existing.remote === "unknown" && n.remote !== "unknown") patch.remote = n.remote;
      if (existing.jobType === "unknown" && n.jobType !== "unknown") patch.jobType = n.jobType;
      if (!existing.applicationEmail && n.applicationEmail) {
        patch.applicationEmail = n.applicationEmail;
        patch.applicationEmailEvidence = n.applicationEmailEvidence;
      }
      // Scam rules see the merged ad (new text, new e-mail address).
      patch.scamFlags = scamFlags({
        title: existing.title,
        company: patch.company ?? existing.company,
        description: [existing.description, n.description].filter(Boolean).join("\n"),
        applicationEmail: patch.applicationEmail ?? existing.applicationEmail,
        maxAnnualGross: patch.salaryMax ?? existing.salaryMax,
      });
      if (!existing.postedAt && n.postedAt) patch.postedAt = n.postedAt;
    }
    await db.update(schema.jobs).set(patch).where(eq(schema.jobs.id, dupId));
    for (const o of owners) await addSource(db, dupId, raw, n.url, now, o);
    await rankJobForAll(db, dupId, now, opts.contexts);
    return { jobId: dupId, created: false };
  }

  const [row] = await db
    .insert(schema.jobs)
    .values({
      dedupeKey: dedupeKey(n),
      title: n.title,
      company: n.company,
      city: n.city,
      province: n.province,
      lat: n.lat,
      lng: n.lng,
      description: n.description,
      salaryRaw: n.salary.raw || null,
      salaryMin: n.salary.minAnnualGross,
      salaryMax: n.salary.maxAnnualGross,
      salaryBasis: n.salary.basis,
      salaryIsEstimate: n.salary.isEstimate,
      salaryNote: n.salary.note,
      contract: n.contract,
      hours: n.hours,
      remote: n.remote,
      languages: n.languages,
      sector: n.sector,
      jobType: n.jobType,
      eligibility: n.eligibility,
      durationMonths: n.durationMonths,
      applicationEmail: n.applicationEmail,
      applicationEmailEvidence: n.applicationEmailEvidence,
      scamFlags: n.scamFlags,
      thin: n.thin,
      postedAt: n.postedAt,
      firstSeenAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.jobs.id });
  for (const o of owners) await addSource(db, row.id, raw, n.url, now, o);
  await rankJobForAll(db, row.id, now, opts.contexts);
  opts.cache?.push({ id: row.id, company: n.company, title: n.title, city: n.city, urls: n.url ? [n.url] : [] });
  return { jobId: row.id, created: true };
}

async function addSource(db: DB, jobId: number, raw: RawJob, url: string | null, now: Date, userId: number | null) {
  const dup = await db.query.jobSources.findFirst({
    where: and(
      eq(schema.jobSources.jobId, jobId),
      eq(schema.jobSources.source, raw.source),
      url ? eq(schema.jobSources.url, url) : isNull(schema.jobSources.url),
      userId == null ? isNull(schema.jobSources.userId) : eq(schema.jobSources.userId, userId),
    ),
  });
  if (dup) return;
  await db.insert(schema.jobSources).values({ jobId, source: raw.source, url, externalId: raw.externalId ?? null, userId, seenAt: now });
}

export async function dedupeCandidates(db: DB): Promise<DedupeCandidate[]> {
  const rows = await db
    .select({ id: schema.jobs.id, company: schema.jobs.company, title: schema.jobs.title, city: schema.jobs.city })
    .from(schema.jobs);
  const srcs = await db.select({ jobId: schema.jobSources.jobId, url: schema.jobSources.url }).from(schema.jobSources);
  const urls = new Map<number, string[]>();
  for (const s of srcs) if (s.url) urls.set(s.jobId, [...(urls.get(s.jobId) ?? []), s.url]);
  return rows.map((r) => ({ ...r, urls: urls.get(r.id) ?? [] }));
}

// --- Listing --------------------------------------------------------------------------------

export interface JobFilters {
  level?: Level | "tutte";
  maxKm?: number;
  /** Minimum pay, net per month (converted to the annual gross used in ads). Unknown pay stays visible. */
  minNetMonthly?: number;
  hours?: "full" | "part";
  contract?: string;
  sector?: string;
  remote?: boolean;
  days?: number; // recency
  /** Words in the title or company ("analyst", "segretaria", "Lazard"). */
  q?: string;
  type?: "lavoro" | "stage" | "programma";
  /** Only chosen companies, or chosen companies and sectors. */
  focus?: "aziende" | "preferite";
  show?: "nuove" | "tutte" | "scartate";
}

export const PAGE_SIZE = 10;

export function filterWhere(userId: number, f: JobFilters, now = new Date()): SQL {
  const uj = schema.userJobs;
  const j = schema.jobs;
  const where: SQL[] = [eq(uj.userId, userId)];
  if (f.show === "scartate") where.push(eq(uj.status, "dismissed"));
  else where.push(ne(uj.status, "dismissed"));
  if (f.level && f.level !== "tutte") where.push(eq(uj.level, f.level));
  if (f.maxKm) where.push(or(lte(uj.distanceKm, f.maxKm), eq(j.remote, "remote"))!);
  if (f.minNetMonthly) {
    const gross = netAnnualToGrossAnnual(f.minNetMonthly * MONTHS_PER_YEAR);
    where.push(or(isNull(j.salaryMax), gte(j.salaryMax, gross))!);
  }
  if (f.hours) where.push(or(eq(j.hours, f.hours), eq(j.hours, "unknown"))!);
  if (f.contract) where.push(or(eq(j.contract, f.contract), eq(j.contract, "unknown"))!);
  if (f.sector) where.push(eq(j.sector, f.sector));
  if (f.remote) where.push(inArray(j.remote, ["remote", "hybrid"]));
  if (f.days) where.push(gte(sql`coalesce(${j.postedAt}, ${j.firstSeenAt})`, now.getTime() - f.days * 86400000));
  if (f.type) where.push(eq(j.jobType, f.type));
  if (f.focus === "aziende") where.push(eq(uj.presetMatch, "company"));
  else if (f.focus === "preferite") where.push(inArray(uj.presetMatch, ["company", "sector"]));
  const q = f.q?.trim().toLowerCase();
  if (q) {
    for (const w of q.split(/\s+/).slice(0, 5)) {
      const pat = `%${w.replace(/[%_]/g, "")}%`;
      where.push(or(like(sql`lower(${j.title})`, pat), like(sql`lower(coalesce(${j.company}, ''))`, pat))!);
    }
  }
  return and(...where)!;
}

/** The filters a person starts from, set by the questionnaire and changeable on "Offerte". */
export function defaultFilters(p: Profile): JobFilters {
  const f: JobFilters = {};
  if (p.focus === "preferite") f.focus = p.focusCompaniesOnly ? "aziende" : "preferite";
  if (p.hideBelowMin && p.minNetMonthly) f.minNetMonthly = p.minNetMonthly;
  return f;
}

const merged = (r: { j: JobRow; uj: UserJobRow }): Job => ({ ...r.j, ...r.uj, id: r.j.id });

export async function listJobs(db: DB, userId: number, f: JobFilters, limit: number, now = new Date()): Promise<{ jobs: Job[]; total: number }> {
  const cond = filterWhere(userId, f, now);
  const levelOrder = sql`case ${schema.userJobs.level} when 'molto' then 0 when 'adatta' then 1 else 2 end`;
  const rows = await db
    .select({ j: schema.jobs, uj: schema.userJobs })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(cond)
    .orderBy(levelOrder, desc(schema.userJobs.score), desc(schema.jobs.firstSeenAt))
    .limit(limit);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(cond);
  return { jobs: rows.map(merged), total: Number(n) };
}

/** One job as this person sees it, or null if they cannot see it. Only sources they may see are listed. */
export async function getJob(db: DB, userId: number, id: number) {
  const row = await db
    .select({ j: schema.jobs, uj: schema.userJobs })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, id)))
    .get();
  if (!row) return null;
  const sources = await db
    .select()
    .from(schema.jobSources)
    .where(and(eq(schema.jobSources.jobId, id), or(isNull(schema.jobSources.userId), eq(schema.jobSources.userId, userId))));
  return { job: merged(row), sources };
}

export async function canSee(db: DB, userId: number, jobId: number): Promise<boolean> {
  return Boolean(await db.query.userJobs.findFirst({ where: and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, jobId)) }));
}

export async function setUserJobStatus(db: DB, userId: number, jobId: number, patch: Partial<Pick<UserJobRow, "status" | "dismissReason" | "seenAt">>): Promise<void> {
  await db.update(schema.userJobs).set(patch).where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, jobId)));
}

export async function markSeen(db: DB, userId: number, id: number): Promise<void> {
  await db
    .update(schema.userJobs)
    .set({ status: "seen", seenAt: new Date() })
    .where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, id), eq(schema.userJobs.status, "new")));
}

// --- "Non mi interessa" -------------------------------------------------------------------------

export type DismissReason = "lontano" | "ruolo" | "paga" | "azienda" | "nessuno";

export const DISMISS_LABELS: Record<DismissReason, string> = {
  lontano: "È troppo lontano",
  ruolo: "Non è il ruolo che cerco",
  paga: "La paga è troppo bassa",
  azienda: "Non mi interessa l'azienda",
  nessuno: "Preferisco non dirlo",
};

/**
 * Hide the job for this person and, depending on the reason, add ONE ranking adjustment for them.
 * Adjustments are listed (with "Annulla") in their profile and in the admin "Classifica" page.
 */
export async function dismissJob(db: DB, userId: number, id: number, reason: DismissReason, now = new Date()): Promise<string | null> {
  const data = await getJob(db, userId, id);
  if (!data) return null;
  const { job } = data;
  await setUserJobStatus(db, userId, id, { status: "dismissed", dismissReason: reason });

  let adj: { kind: "company" | "keyword" | "role" | "distance" | "salary"; value: string; label: string } | null = null;
  if (reason === "azienda" && job.company) adj = { kind: "company", value: job.company, label: `Evita l'azienda ${job.company}` };
  if (reason === "lontano" && job.distanceKm != null) {
    const cap = Math.max(3, Math.floor(job.distanceKm * 0.9));
    adj = { kind: "distance", value: String(cap), label: `Distanza massima ridotta a ${cap} km` };
  }
  if (reason === "paga" && job.salaryMax != null) {
    const floor = Math.round((job.salaryMax + 500) / 500) * 500;
    adj = { kind: "salary", value: String(floor), label: `Stipendio minimo alzato a ${floor.toLocaleString("it-IT")} € lordi l'anno` };
  }
  if (reason === "ruolo") {
    const profile = await getProfile(db, userId);
    const wanted = new Set([...profile.roles, ...profile.synonyms].join(" ").toLowerCase().split(/\W+/));
    const word = job.title
      .toLowerCase()
      .split(/[^a-zà-ù]+/)
      .find((w) => w.length >= 5 && !wanted.has(w));
    if (word) adj = { kind: "role", value: word, label: `Meno offerte con "${word}" nel titolo` };
  }
  if (adj) {
    await db.insert(schema.rankAdjustments).values({ ...adj, userId, fromJobId: id });
    await rerankUser(db, userId, now);
    return adj.label;
  }
  return null;
}

export async function restoreJob(db: DB, userId: number, id: number): Promise<void> {
  await setUserJobStatus(db, userId, id, { status: "seen", dismissReason: null });
}

/** Turn an adjustment on or off. `userId` limits it to that person's own adjustments (null: admin). */
export async function setAdjustmentActive(db: DB, adjId: number, active: boolean, userId: number | null = null): Promise<void> {
  const row = await db.query.rankAdjustments.findFirst({ where: eq(schema.rankAdjustments.id, adjId) });
  if (!row?.userId || (userId != null && row.userId !== userId)) return;
  await db.update(schema.rankAdjustments).set({ active }).where(eq(schema.rankAdjustments.id, adjId));
  await rerankUser(db, row.userId);
}

export async function sectorsInUse(db: DB, userId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ s: schema.jobs.sector })
    .from(schema.jobs)
    .innerJoin(schema.userJobs, and(eq(schema.userJobs.jobId, schema.jobs.id), eq(schema.userJobs.userId, userId)))
    .where(sql`${schema.jobs.sector} is not null`);
  return rows.map((r) => r.s!).sort();
}

/**
 * Set the application e-mail by hand and refresh scam flags and ranking. Only for jobs that are
 * private to this person: an address typed by one person must never change where others write.
 */
export async function setApplicationEmail(db: DB, userId: number, jobId: number, email: string, evidence: string): Promise<boolean> {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) });
  if (!job) return false;
  const who = await audience(db, jobId);
  if (who == null || ![...who].every((u) => u === userId)) return false;
  const flags = scamFlags({ title: job.title, company: job.company, description: job.description, applicationEmail: email, maxAnnualGross: job.salaryMax });
  await db.update(schema.jobs).set({ applicationEmail: email, applicationEmailEvidence: evidence, scamFlags: flags }).where(eq(schema.jobs.id, jobId));
  await rankJobForAll(db, jobId);
  return true;
}
