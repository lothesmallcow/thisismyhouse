// Jobs repository. Jobs are stored once (merging duplicates across sources); each person has
// their own view of them in user_jobs: distance from their home, their ranking, their actions.
// A job is visible to someone if at least one of its sources is shared (userId null) or theirs.

import { background } from "./person";
import { and, asc, desc, eq, gte, inArray, isNull, like, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { canonicalUrl, companyKey, findDuplicate, dedupeKey, normalizeCity, normalizeTitle, type DedupeCandidate } from "../core/dedupe";
import { distanceKm, findPlace } from "../core/geo";
import type { WherePlace } from "../core/where";
import { canonicalCompany, guessCompany } from "./company-guess";
import { normalizeJob, type RawJob } from "../core/normalize";
import { EXPIRED_AD } from "../core/extract";
import { AGGREGATOR_HOST } from "../core/page-company";
import { PLATFORM_HOST } from "../sources/web/polite-fetch";
import { fold } from "../core/text";
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
  return { userId, profile, rp: toRankProfile(profile, await rankPrefs(db, userId), await background(db, userId, profile)), home: homeOf(profile), adj: await activeAdjustments(db, userId) };
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
      country: job.country,
      closesAt: job.closesAt,
      jobType: job.jobType as never,
      eligibility: job.eligibility as never,
    },
    ctx.rp,
    ctx.adj,
    now,
  );
  return { distanceKm: dist, score: r.score, level: r.level, reasons: r.reasons, factors: r.factors, presetMatch: r.presetMatch, fit: r.fit, parts: r.parts };
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
  // Dismissed before (the same exact links, or the same title at the same company and city): never again for them.
  const banned = await bannedFor(db, jobId, job.dedupeKey);
  for (const ctx of contexts ?? (await rankContexts(db))) {
    if (who && !who.has(ctx.userId)) continue;
    if (banned.has(ctx.userId)) {
      await db.delete(schema.userJobs).where(and(eq(schema.userJobs.userId, ctx.userId), eq(schema.userJobs.jobId, jobId)));
      continue;
    }
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
  // What they dismissed: exact links and exact title + company + city.
  const bannedKeys = new Set((await db.select({ k: schema.dismissedJobs.dedupeKey }).from(schema.dismissedJobs).where(eq(schema.dismissedJobs.userId, userId))).map((d) => d.k));
  const bannedUrls = new Set((await db.select({ u: schema.dismissedUrls.url }).from(schema.dismissedUrls).where(eq(schema.dismissedUrls.userId, userId))).map((d) => d.u));
  const urlsOf = new Map<number, string[]>();
  if (bannedUrls.size) {
    for (const r of await db.select({ jobId: schema.jobSources.jobId, url: schema.jobSources.url }).from(schema.jobSources).where(inArray(schema.jobSources.url, [...bannedUrls]))) {
      if (r.url) urlsOf.set(r.jobId, [...(urlsOf.get(r.jobId) ?? []), r.url]);
    }
  }
  const isBanned = (job: JobRow) => bannedKeys.has(job.dedupeKey) || urlsOf.has(job.id);
  // Only rows whose values change are written, in batches of 200 statements per round trip
  // (on Turso one batch = one HTTP request instead of one per job).
  const writes = [];
  for (const job of visible) {
    if (isBanned(job)) {
      if (existing.has(job.id)) writes.push(db.delete(schema.userJobs).where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, job.id))));
      continue;
    }
    const v = computeFor(job, c, now);
    const old = existing.get(job.id);
    if (
      old &&
      old.distanceKm === v.distanceKm &&
      old.score === v.score &&
      old.level === v.level &&
      old.presetMatch === v.presetMatch &&
      old.fit === v.fit &&
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

/** A job site's own name, from its address ("uk.indeed.com" → indeed): never taken for the employer. */
function siteNamesOf(url: string | null | undefined): string[] {
  try {
    const host = new URL(url ?? "").hostname;
    if (!PLATFORM_HOST.test(host) && !AGGREGATOR_HOST.test(host)) return []; // the firm's own site: its name is the answer
    return [host.replace(/^(www|it|uk|de|fr|m|jobs|careers)\./, "").split(".")[0]];
  } catch {
    return [];
  }
}

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
  const n = normalizeJob(raw, null, now);
  // No company in the source: from the title, the link or the catalog names in the text.
  if (!n.company) n.company = await guessCompany(db, { title: n.title, url: raw.url ?? n.url, description: n.description, page: raw.pageText, avoid: siteNamesOf(raw.url) }); // the original link: the clean one drops the slug
  else n.company = await canonicalCompany(db, n.company); // one spelling per company, so its ads meet
  // The page says the ad has expired ("Annuncio di lavoro scaduto", "No longer accepting applications").
  if (raw.pageText && EXPIRED_AD.test(fold(raw.pageText)) && !n.eligibility.includes("scaduto")) n.eligibility.push("scaduto");
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
          country: existing.city ? existing.country : n.country,
          region: existing.city ? existing.region : n.region,
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
      if (!existing.company && n.company) patch.company = n.company;
      if (n.eligibility.includes("scaduto") && !(existing.eligibility as string[]).includes("scaduto")) patch.eligibility = [...((patch.eligibility ?? existing.eligibility) as typeof n.eligibility), "scaduto"];
      if (!existing.closesAt && n.closesAt) patch.closesAt = n.closesAt;
      if (!existing.opensAt && n.opensAt) patch.opensAt = n.opensAt;
      if (!existing.runsStart && n.runsStart) Object.assign(patch, { runsStart: n.runsStart, runsEnd: n.runsEnd, runsMonthOnly: n.runsMonthOnly });
      if (!existing.rolling && n.rolling) patch.rolling = true;
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
      country: n.country,
      region: n.region,
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
      closesAt: n.closesAt,
      opensAt: n.opensAt,
      runsStart: n.runsStart,
      runsEnd: n.runsEnd,
      runsMonthOnly: n.runsMonthOnly,
      rolling: n.rolling,
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

/**
 * Merge offers stored twice (before the duplicate check knew company spellings and offers without a
 * company): the older one stays and takes the other's links, folders, applications and people.
 * Run at deploy; returns how many were merged away.
 */
export async function mergeDuplicateJobs(db: DB, now = new Date()): Promise<number> {
  const all = (await dedupeCandidates(db)).sort((a, b) => a.id - b.id);
  const byUrl = new Map<string, number>();
  const byCompany = new Map<string, DedupeCandidate[]>();
  const byTitleCity = new Map<string, DedupeCandidate[]>();
  const push = <K,>(m: Map<K, DedupeCandidate[]>, k: K, c: DedupeCandidate) => m.set(k, [...(m.get(k) ?? []), c]);
  let merged = 0;
  for (const c of all) {
    const urls = c.urls.map(canonicalUrl);
    let keep = urls.map((u) => byUrl.get(u)).find((id) => id != null) ?? null;
    if (keep == null) {
      const near = [...(byCompany.get(companyKey(c.company)) ?? []), ...(byTitleCity.get(`${normalizeTitle(c.title)}|${normalizeCity(c.city)}`) ?? [])];
      keep = findDuplicate({ company: c.company, title: c.title, city: c.city, url: null }, near);
    }
    if (keep == null || keep === c.id) {
      for (const u of urls) if (!byUrl.has(u)) byUrl.set(u, c.id);
      if (companyKey(c.company)) push(byCompany, companyKey(c.company), c);
      push(byTitleCity, `${normalizeTitle(c.title)}|${normalizeCity(c.city)}`, c);
      continue;
    }
    for (const u of urls) if (!byUrl.has(u)) byUrl.set(u, keep);
    await mergeJobInto(db, c.id, keep, now);
    merged++;
  }
  return merged;
}

async function mergeJobInto(db: DB, dropId: number, keepId: number, now: Date): Promise<void> {
  const drop = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, dropId) });
  const keep = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, keepId) });
  if (!drop || !keep) return;
  // Facts the kept one lacks, only from an offer everyone could see (private text stays private).
  const dropSources = await db.select({ userId: schema.jobSources.userId }).from(schema.jobSources).where(eq(schema.jobSources.jobId, dropId));
  if (dropSources.some((x) => x.userId == null)) {
    const patch: Partial<JobRow> = {};
    for (const k of ["company", "city", "province", "closesAt", "opensAt", "postedAt", "applicationEmail", "salaryRaw", "salaryMin", "salaryMax"] as const) {
      if (keep[k] == null && drop[k] != null) Object.assign(patch, { [k]: drop[k] });
    }
    if (keep.thin && !drop.thin) Object.assign(patch, { description: drop.description, thin: false });
    if (Object.keys(patch).length) await db.update(schema.jobs).set({ ...patch, updatedAt: now }).where(eq(schema.jobs.id, keepId));
  }
  await db.update(schema.jobSources).set({ jobId: keepId }).where(eq(schema.jobSources.jobId, dropId));
  await db.update(schema.applications).set({ jobId: keepId }).where(eq(schema.applications.jobId, dropId));
  for (const f of await db.select().from(schema.folderItems).where(eq(schema.folderItems.jobId, dropId))) {
    await db.insert(schema.folderItems).values({ ...f, jobId: keepId }).onConflictDoNothing();
  }
  for (const u of await db.select().from(schema.userJobs).where(eq(schema.userJobs.jobId, dropId))) {
    await db.insert(schema.userJobs).values({ ...u, jobId: keepId }).onConflictDoNothing();
    if (u.status === "applied") await db.update(schema.userJobs).set({ status: "applied" }).where(and(eq(schema.userJobs.userId, u.userId), eq(schema.userJobs.jobId, keepId)));
  }
  // Who said "Non mi interessa" to one of the two does not see the other: its links (now the kept
  // one's) are banned for them, so the offer stays out; undoing it brings the merged offer back.
  const banned = new Set([...(await bannedFor(db, keepId, drop.dedupeKey)), ...(await bannedFor(db, keepId, keep.dedupeKey))]);
  for (const u of banned) {
    await db.delete(schema.userJobs).where(and(eq(schema.userJobs.userId, u), eq(schema.userJobs.jobId, keepId)));
  }
  await db.delete(schema.jobs).where(eq(schema.jobs.id, dropId));
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
  /**
   * Only jobs in these places (a city with its province, a region, a whole country). Jobs that do not say
   * where they are stay visible; remote jobs only with `placesRemote`, and only in the chosen countries.
   */
  places?: WherePlace[];
  placesRemote?: boolean;
  /** Minimum pay, net per month (converted to the annual gross used in ads). Unknown pay stays visible. */
  minNetMonthly?: number;
  hours?: "full" | "part";
  /** Any of these contracts (unknown contract stays visible). */
  contracts?: string[];
  /** Any of these sectors. */
  sectors?: string[];
  remote?: boolean;
  days?: number; // recency
  /** Words in the title or company ("analyst", "segretaria", "Lazard"). */
  q?: string;
  /** Any of these kinds: job, internship, programme for students. */
  types?: ("lavoro" | "stage" | "programma")[];
  /** Only chosen companies, or chosen companies and sectors. */
  focus?: "aziende" | "preferite";
  show?: "nuove" | "tutte" | "scartate";
  /** Minimum fit score out of 100. */
  minFit?: number;
  /** Order: best fit (default), newest, best paid. */
  sort?: "fit" | "recenti" | "paga" | "scadenza";
}

export const PAGE_SIZE = 10;

export function filterWhere(userId: number, f: JobFilters, now = new Date()): SQL {
  const uj = schema.userJobs;
  const j = schema.jobs;
  const where: SQL[] = [eq(uj.userId, userId)];
  if (f.show === "scartate") where.push(eq(uj.status, "dismissed"));
  else where.push(ne(uj.status, "dismissed"));
  if (f.level && f.level !== "tutte") where.push(eq(uj.level, f.level));
  if (f.minFit) where.push(gte(uj.fit, f.minFit));
  if (f.places?.length) where.push(placesWhere(f.places, !!f.placesRemote));
  if (f.minNetMonthly) {
    const gross = netAnnualToGrossAnnual(f.minNetMonthly * MONTHS_PER_YEAR);
    where.push(or(isNull(j.salaryMax), gte(j.salaryMax, gross))!);
  }
  if (f.hours) where.push(or(eq(j.hours, f.hours), eq(j.hours, "unknown"))!);
  if (f.contracts?.length) where.push(or(inArray(j.contract, f.contracts), eq(j.contract, "unknown"))!);
  if (f.sectors?.length) where.push(inArray(j.sector, f.sectors));
  if (f.remote) where.push(inArray(j.remote, ["remote", "hybrid"]));
  if (f.days) where.push(gte(sql`coalesce(${j.postedAt}, ${j.firstSeenAt})`, now.getTime() - f.days * 86400000));
  if (f.types?.length) where.push(inArray(j.jobType, f.types));
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
function placesWhere(places: WherePlace[], remote: boolean): SQL {
  const j = schema.jobs;
  const any: SQL[] = [isNull(j.city)];
  for (const p of places) {
    if (p.kind === "paese") any.push(eq(j.country, p.country));
    else if (p.kind === "regione") any.push(and(eq(j.country, p.country), eq(j.region, p.name))!);
    else {
      const town = findPlace(p.name);
      // An Italian city with its province ("Milano" = Milano, Sesto San Giovanni, Rho…).
      any.push(town?.country === "IT" && town.province ? and(eq(j.country, "IT"), eq(j.province, town.province))! : and(eq(j.country, p.country), eq(j.city, town?.name ?? p.name))!);
    }
  }
  if (remote) any.push(and(eq(j.remote, "remote"), inArray(j.country, [...new Set(places.map((p) => p.country))]))!);
  return or(...any)!;
}

/** Fill in country and region for jobs saved before they were recorded (once, at migration time). */
export async function backfillJobPlaces(db: DB): Promise<number> {
  let done = 0;
  for (;;) {
    const rows = await db
      .select({ id: schema.jobs.id, city: schema.jobs.city, province: schema.jobs.province })
      .from(schema.jobs)
      .where(and(isNull(schema.jobs.country), sql`${schema.jobs.city} is not null`))
      .limit(500);
    if (!rows.length) return done;
    for (const r of rows) {
      const place = findPlace(r.province ? `${r.city} (${r.province})` : r.city);
      await db.update(schema.jobs).set({ country: place?.country ?? "", region: place?.region || null }).where(eq(schema.jobs.id, r.id));
    }
    done += rows.length;
  }
}

export function defaultFilters(p: Profile): JobFilters {
  const f: JobFilters = {};
  if (p.focus === "preferite") f.focus = p.focusCompaniesOnly ? "aziende" : "preferite";
  if (p.hideBelowMin && p.minNetMonthly) f.minNetMonthly = p.minNetMonthly;
  return f;
}

const merged = (r: { j: JobRow; uj: UserJobRow }): Job => ({ ...r.j, ...r.uj, id: r.j.id });

export async function listJobs(db: DB, userId: number, f: JobFilters, limit: number, now = new Date()): Promise<{ jobs: Job[]; total: number }> {
  const cond = filterWhere(userId, f, now);
  const order =
    f.sort === "recenti"
      ? [desc(sql`coalesce(${schema.jobs.postedAt}, ${schema.jobs.firstSeenAt})`), desc(schema.userJobs.fit)]
      : f.sort === "scadenza"
        ? // Open deadlines first, soonest first; then those without a date, best fit first.
          [sql`case when ${schema.jobs.closesAt} >= ${now.getTime() - 86_400_000} then 0 when ${schema.jobs.closesAt} is null then 1 else 2 end`, asc(schema.jobs.closesAt), desc(schema.userJobs.fit)]
        : f.sort === "paga"
        ? [sql`${schema.jobs.salaryMax} is null`, desc(schema.jobs.salaryMax), desc(schema.userJobs.fit)]
        : [desc(schema.userJobs.fit), desc(schema.userJobs.score), desc(schema.jobs.firstSeenAt)];
  const rows = await db
    .select({ j: schema.jobs, uj: schema.userJobs })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(cond)
    .orderBy(...order)
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
  await banJob(db, userId, job, reason, now);

  let adj: { kind: "company" | "keyword" | "role" | "distance" | "salary"; value: string; label: string } | null = null;
  if (reason === "azienda" && job.company) adj = { kind: "company", value: job.company, label: `Evita l'azienda ${job.company}` };
  // "Too far": no distance to adjust any more (places are chosen in Profilo → Dove).
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

/**
 * "Non mi interessa" = gone for good, for this person only: the offer leaves their account and is
 * never proposed again, matched by the exact links it was found at and by its exact title, company
 * and city (the same ad on another site). Other offers of the same company stay. An offer only they
 * could see (added by hand, their own alerts) is deleted once it can no longer be undone (purgeOldJobs):
 * until then "Annulla" brings it back.
 */
export async function banJob(db: DB, userId: number, job: { id: number; dedupeKey: string; title: string; company: string | null; city: string | null }, reason: string | null, now: Date): Promise<void> {
  const ban = { reason, title: job.title, company: job.company, city: job.city, at: now };
  await db
    .insert(schema.dismissedJobs)
    .values({ userId, dedupeKey: job.dedupeKey, ...ban })
    .onConflictDoUpdate({ target: [schema.dismissedJobs.userId, schema.dismissedJobs.dedupeKey], set: ban });
  const sources = await db.select({ url: schema.jobSources.url, userId: schema.jobSources.userId }).from(schema.jobSources).where(eq(schema.jobSources.jobId, job.id));
  for (const url of new Set(sources.map((x) => x.url).filter((u): u is string => !!u))) {
    await db.insert(schema.dismissedUrls).values({ userId, url, dedupeKey: job.dedupeKey, at: now }).onConflictDoNothing();
  }
  await db.delete(schema.userJobs).where(and(eq(schema.userJobs.userId, userId), eq(schema.userJobs.jobId, job.id)));
}

/** The people who dismissed this offer (by one of its links, or by the same title, company and city). */
async function bannedFor(db: DB, jobId: number, key: string): Promise<Set<number>> {
  const byKey = await db.select({ u: schema.dismissedJobs.userId }).from(schema.dismissedJobs).where(eq(schema.dismissedJobs.dedupeKey, key));
  const byUrl = await db
    .select({ u: schema.dismissedUrls.userId })
    .from(schema.dismissedUrls)
    .where(sql`${schema.dismissedUrls.url} in (select ${schema.jobSources.url} from ${schema.jobSources} where ${schema.jobSources.jobId} = ${jobId})`);
  return new Set([...byKey, ...byUrl].map((r) => r.u));
}

/** How long a "Non mi interessa" can be undone from its list. After that it leaves the list; the offer stays blocked. */
export const UNDO_DAYS = 3;

/** What they dismissed in the last UNDO_DAYS days, newest first (the list where it can be undone). */
export async function dismissedList(db: DB, userId: number, now = new Date()) {
  const since = new Date(now.getTime() - UNDO_DAYS * 86_400_000);
  return db
    .select()
    .from(schema.dismissedJobs)
    .where(and(eq(schema.dismissedJobs.userId, userId), gte(schema.dismissedJobs.at, since)))
    .orderBy(desc(schema.dismissedJobs.at))
    .limit(200);
}

/** Undo a dismissal: the offer comes back if it is still around, and can be proposed again. */
export async function undoDismissal(db: DB, userId: number, key: string, now = new Date()): Promise<void> {
  const d = await db.query.dismissedJobs.findFirst({ where: and(eq(schema.dismissedJobs.userId, userId), eq(schema.dismissedJobs.dedupeKey, key)) });
  if (!d || d.at.getTime() < now.getTime() - UNDO_DAYS * 86_400_000) return; // too late: it stays dismissed
  await db.delete(schema.dismissedJobs).where(and(eq(schema.dismissedJobs.userId, userId), eq(schema.dismissedJobs.dedupeKey, key)));
  await db.delete(schema.dismissedUrls).where(and(eq(schema.dismissedUrls.userId, userId), eq(schema.dismissedUrls.dedupeKey, key)));
  await rerankUser(db, userId, now);
}

/** Dismissals from before (rows marked "dismissed"): turned into bans, rows removed. Once, at deploy. */
export async function convertOldDismissals(db: DB, now = new Date()): Promise<number> {
  const rows = await db
    .select({ userId: schema.userJobs.userId, reason: schema.userJobs.dismissReason, job: schema.jobs })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(eq(schema.userJobs.status, "dismissed"));
  for (const r of rows) await banJob(db, r.userId, r.job, r.reason, now);
  return rows.length;
}

export async function restoreJob(db: DB, userId: number, id: number): Promise<void> {
  await setUserJobStatus(db, userId, id, { status: "seen", dismissReason: null });
}

/** Offers not seen by any source for this long are deleted (pages and database stay light). */
export const KEEP_DAYS = 7;

/**
 * Delete the offers no source has shown for a week, except those someone keeps: saved in a folder,
 * applied to, added by hand, or with applications still open. Their scores and sources go with them;
 * dismissals are remembered by dedupe key (dismissed_jobs, kept 6 months).
 */
export async function purgeOldJobs(db: DB, now = new Date()): Promise<number> {
  const j = schema.jobs;
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000);
  const kept = or(
    sql`exists (select 1 from ${schema.folderItems} f where f.job_id = ${j.id})`,
    sql`exists (select 1 from ${schema.applications} a where a.job_id = ${j.id})`,
    sql`exists (select 1 from ${schema.jobSources} s where s.job_id = ${j.id} and s.source = 'manual')`,
    sql`coalesce(${j.closesAt}, 0) >= ${now.getTime()}`, // coalesce: a NULL here would make the whole test unknown
  )!;
  const old = await db.select({ id: j.id }).from(j).where(and(lt(j.updatedAt, cutoff), sql`not (${kept})`));
  // Offers only their owners could see, dismissed by all of them and no longer undoable: deleted now.
  const undoEnd = new Date(now.getTime() - UNDO_DAYS * 86_400_000);
  const s = schema.jobSources;
  const d = schema.dismissedJobs;
  old.push(
    ...(await db
      .select({ id: j.id })
      .from(j)
      .where(
        sql`exists (select 1 from ${s} where ${s.jobId} = ${j.id}) and not exists (select 1 from ${s} where ${s.jobId} = ${j.id} and (${s.userId} is null or ${s.userId} not in (select ${d.userId} from ${d} where ${d.dedupeKey} = ${j.dedupeKey} and ${d.at} < ${undoEnd.getTime()})))`,
      )),
  );
  for (let i = 0; i < old.length; i += 500) {
    await db.delete(j).where(inArray(j.id, old.slice(i, i + 500).map((r) => r.id)));
  }
  const sixMonths = new Date(now.getTime() - 180 * 86_400_000);
  await db.delete(schema.dismissedJobs).where(lt(schema.dismissedJobs.at, sixMonths));
  await db.delete(schema.dismissedUrls).where(lt(schema.dismissedUrls.at, sixMonths));
  return old.length;
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
