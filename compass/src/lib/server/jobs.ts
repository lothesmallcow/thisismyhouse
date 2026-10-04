// Jobs repository: store normalized jobs (merging duplicates across sources), keep ranking
// fresh, list with filters, and record "Non mi interessa" as visible, undoable adjustments.

import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { findDuplicate, dedupeKey, type DedupeCandidate } from "../core/dedupe";
import { normalizeJob, type RawJob } from "../core/normalize";
import { rankJob, type Level, type RankAdjustment } from "../core/rank";
import type { DB } from "../db";
import { schema } from "../db";
import { getProfile, homeOf, toRankProfile } from "./profile";

export type Job = typeof schema.jobs.$inferSelect;

export async function activeAdjustments(db: DB): Promise<RankAdjustment[]> {
  const rows = await db.select().from(schema.rankAdjustments).where(eq(schema.rankAdjustments.active, true));
  return rows.map((r) => ({ id: r.id, kind: r.kind, value: r.value, label: r.label }));
}

function rankRow(job: Pick<Job, "title" | "company" | "description" | "sector" | "distanceKm" | "remote" | "hours" | "contract" | "salaryMin" | "salaryMax" | "languages" | "postedAt" | "scamFlags" | "firstSeenAt">, rp: ReturnType<typeof toRankProfile>, adj: RankAdjustment[], now: Date) {
  return rankJob(
    {
      title: job.title,
      company: job.company,
      description: job.description,
      sector: job.sector,
      distanceKm: job.distanceKm,
      remote: job.remote as never,
      hours: job.hours as never,
      contract: job.contract as never,
      minAnnualGross: job.salaryMin,
      maxAnnualGross: job.salaryMax,
      languages: job.languages as never,
      postedAt: job.postedAt ?? job.firstSeenAt,
      scamFlagCount: job.scamFlags.length,
    },
    rp,
    adj,
    now,
  );
}

export interface UpsertResult {
  jobId: number;
  created: boolean;
}

/** Insert a raw job, or merge it into an existing duplicate (keeping every source link). */
export async function upsertRawJob(db: DB, raw: RawJob, now = new Date(), cache?: DedupeCandidate[]): Promise<UpsertResult> {
  const profile = await getProfile(db);
  const n = normalizeJob(raw, homeOf(profile));
  const candidates = cache ?? (await dedupeCandidates(db));
  const dupId = findDuplicate({ company: n.company, title: n.title, city: n.city, url: n.url }, candidates);

  if (dupId != null) {
    const existing = (await db.query.jobs.findFirst({ where: eq(schema.jobs.id, dupId) }))!;
    // Enrich thin records with richer data, never overwrite good data with thinner data.
    const patch: Partial<Job> = { updatedAt: now };
    if (existing.thin && !n.thin) {
      Object.assign(patch, {
        description: n.description,
        thin: false,
        company: existing.company ?? n.company,
        city: existing.city ?? n.city,
        province: existing.province ?? n.province,
        lat: existing.lat ?? n.lat,
        lng: existing.lng ?? n.lng,
        distanceKm: existing.distanceKm ?? n.distanceKm,
        languages: n.languages,
        sector: existing.sector ?? n.sector,
        scamFlags: n.scamFlags,
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
    if (!existing.applicationEmail && n.applicationEmail) {
      patch.applicationEmail = n.applicationEmail;
      patch.applicationEmailEvidence = n.applicationEmailEvidence;
    }
    if (!existing.postedAt && n.postedAt) patch.postedAt = n.postedAt;
    await db.update(schema.jobs).set(patch).where(eq(schema.jobs.id, dupId));
    await addSource(db, dupId, raw, n.url, now);
    await rerankJob(db, dupId, now);
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
      distanceKm: n.distanceKm,
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
      applicationEmail: n.applicationEmail,
      applicationEmailEvidence: n.applicationEmailEvidence,
      scamFlags: n.scamFlags,
      thin: n.thin,
      postedAt: n.postedAt,
      firstSeenAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.jobs.id });
  await addSource(db, row.id, raw, n.url, now);
  await rerankJob(db, row.id, now);
  cache?.push({ id: row.id, company: n.company, title: n.title, city: n.city, urls: n.url ? [n.url] : [] });
  return { jobId: row.id, created: true };
}

async function addSource(db: DB, jobId: number, raw: RawJob, url: string | null, now: Date) {
  const dup = await db.query.jobSources.findFirst({
    where: and(eq(schema.jobSources.jobId, jobId), eq(schema.jobSources.source, raw.source), url ? eq(schema.jobSources.url, url) : isNull(schema.jobSources.url)),
  });
  if (dup) return;
  await db.insert(schema.jobSources).values({ jobId, source: raw.source, url, externalId: raw.externalId ?? null, seenAt: now });
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

export async function rerankJob(db: DB, jobId: number, now = new Date()): Promise<void> {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) });
  if (!job) return;
  const rp = toRankProfile(await getProfile(db));
  const r = rankRow(job, rp, await activeAdjustments(db), now);
  await db.update(schema.jobs).set({ score: r.score, level: r.level, reasons: r.reasons, factors: r.factors }).where(eq(schema.jobs.id, jobId));
}

/** Recompute distance + ranking for all jobs (after profile or adjustment changes). */
export async function rerankAll(db: DB, now = new Date()): Promise<number> {
  const profile = await getProfile(db);
  const rp = toRankProfile(profile);
  const home = homeOf(profile);
  const adj = await activeAdjustments(db);
  const all = await db.select().from(schema.jobs);
  const { distanceKm } = await import("../core/geo");
  for (const job of all) {
    const dist = home && job.lat != null && job.lng != null ? distanceKm(home, { lat: job.lat, lng: job.lng }) : null;
    const r = rankRow({ ...job, distanceKm: dist }, rp, adj, now);
    await db
      .update(schema.jobs)
      .set({ distanceKm: dist, score: r.score, level: r.level, reasons: r.reasons, factors: r.factors })
      .where(eq(schema.jobs.id, job.id));
  }
  return all.length;
}

// --- Listing --------------------------------------------------------------------------------

export interface JobFilters {
  level?: Level | "tutte";
  maxKm?: number;
  minSalary?: number; // annual gross
  hours?: "full" | "part";
  contract?: string;
  sector?: string;
  remote?: boolean;
  days?: number; // recency
  show?: "nuove" | "tutte" | "scartate";
}

export const PAGE_SIZE = 10;

export async function listJobs(db: DB, f: JobFilters, limit: number, now = new Date()): Promise<{ jobs: Job[]; total: number }> {
  const where: SQL[] = [];
  if (f.show === "scartate") where.push(eq(schema.jobs.status, "dismissed"));
  else where.push(ne(schema.jobs.status, "dismissed"));
  if (f.level && f.level !== "tutte") where.push(eq(schema.jobs.level, f.level));
  if (f.maxKm) where.push(or(lte(schema.jobs.distanceKm, f.maxKm), eq(schema.jobs.remote, "remote"))!);
  if (f.minSalary) where.push(or(isNull(schema.jobs.salaryMax), gte(schema.jobs.salaryMax, f.minSalary))!); // unknown stays visible
  if (f.hours) where.push(or(eq(schema.jobs.hours, f.hours), eq(schema.jobs.hours, "unknown"))!);
  if (f.contract) where.push(or(eq(schema.jobs.contract, f.contract), eq(schema.jobs.contract, "unknown"))!);
  if (f.sector) where.push(eq(schema.jobs.sector, f.sector));
  if (f.remote) where.push(inArray(schema.jobs.remote, ["remote", "hybrid"]));
  if (f.days) where.push(gte(sql`coalesce(${schema.jobs.postedAt}, ${schema.jobs.firstSeenAt})`, now.getTime() - f.days * 86400000));
  const cond = and(...where);
  const levelOrder = sql`case ${schema.jobs.level} when 'molto' then 0 when 'adatta' then 1 else 2 end`;
  const jobs = await db
    .select()
    .from(schema.jobs)
    .where(cond)
    .orderBy(levelOrder, desc(schema.jobs.score), desc(schema.jobs.firstSeenAt))
    .limit(limit);
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.jobs).where(cond);
  return { jobs, total: Number(n) };
}

export async function getJob(db: DB, id: number) {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, id) });
  if (!job) return null;
  const sources = await db.select().from(schema.jobSources).where(eq(schema.jobSources.jobId, id));
  return { job, sources };
}

export async function markSeen(db: DB, id: number): Promise<void> {
  await db
    .update(schema.jobs)
    .set({ status: "seen", seenAt: new Date() })
    .where(and(eq(schema.jobs.id, id), eq(schema.jobs.status, "new")));
}

// --- "Non mi interessa" -------------------------------------------------------------------------

export type DismissReason = "lontano" | "ruolo" | "paga" | "azienda" | "nessuno";

export const DISMISS_LABELS: Record<DismissReason, string> = {
  lontano: "È troppo lontano",
  ruolo: "Non è il lavoro che cerco",
  paga: "La paga è troppo bassa",
  azienda: "Non mi piace l'azienda",
  nessuno: "Preferisco non dirlo",
};

/**
 * Hide the job and, depending on the reason, add ONE ranking adjustment. Adjustments are
 * listed in the admin "Classifica" page with an "Annulla" button.
 */
export async function dismissJob(db: DB, id: number, reason: DismissReason, now = new Date()): Promise<string | null> {
  const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, id) });
  if (!job) return null;
  await db.update(schema.jobs).set({ status: "dismissed", dismissReason: reason, updatedAt: now }).where(eq(schema.jobs.id, id));

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
    const profile = await getProfile(db);
    const wanted = new Set([...profile.roles, ...profile.synonyms].join(" ").toLowerCase().split(/\W+/));
    const word = job.title
      .toLowerCase()
      .split(/[^a-zà-ù]+/)
      .find((w) => w.length >= 5 && !wanted.has(w));
    if (word) adj = { kind: "role", value: word, label: `Meno offerte con "${word}" nel titolo` };
  }
  if (adj) {
    await db.insert(schema.rankAdjustments).values({ ...adj, fromJobId: id });
    await rerankAll(db, now);
    return adj.label;
  }
  return null;
}

export async function restoreJob(db: DB, id: number): Promise<void> {
  await db.update(schema.jobs).set({ status: "seen", dismissReason: null }).where(eq(schema.jobs.id, id));
}

export async function setAdjustmentActive(db: DB, adjId: number, active: boolean): Promise<void> {
  await db.update(schema.rankAdjustments).set({ active }).where(eq(schema.rankAdjustments.id, adjId));
  await rerankAll(db);
}

export async function sectorsInUse(db: DB): Promise<string[]> {
  const rows = await db.selectDistinct({ s: schema.jobs.sector }).from(schema.jobs).where(sql`${schema.jobs.sector} is not null`);
  return rows.map((r) => r.s!).sort();
}
