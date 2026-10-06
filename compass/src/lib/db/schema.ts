// Database schema (SQLite / libSQL via Drizzle). One file so the whole data model is
// readable at a glance. Dates are stored as integer timestamps (ms).

import { sql } from "drizzle-orm";
import { blob, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () => ts("created_at").notNull().default(sql`(unixepoch() * 1000)`);
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

// --- Accounts -----------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role", { enum: ["user", "admin"] }).notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  /** A disabled account cannot sign in and is skipped by every scheduled job. */
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  /** Which configured mailbox reads this person's alerts and sends their e-mails (see env.mailboxes). Null: none yet. */
  mailboxKey: text("mailbox_key"),
  /** Where the morning e-mail goes. Null: the sign-in address. */
  digestEmail: text("digest_email"),
  lastLoginAt: ts("last_login_at"),
  /** Asked for access from the public page and waits for the admin (inactive until approved). */
  pendingSince: ts("pending_since"),
  /** Tag of their personal Compass address (mailbox+cmp-<tag>@...), for forwarded job alerts. */
  alertTag: text("alert_tag").unique(),
  createdAt: createdAt(),
});

/** One-time invitation codes for "Crea un account" (only the hash is stored). */
export const invites = sqliteTable("invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codeHash: text("code_hash").notNull().unique(),
  note: text("note").notNull().default(""),
  expiresAt: ts("expires_at").notNull(),
  usedByUserId: integer("used_by_user_id").references(() => users.id, { onDelete: "set null" }),
  usedAt: ts("used_at"),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
});

/** Sign-in throttling: 5 failures in 15 minutes lock that account for 15 minutes. */
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(), // role:email
  failures: integer("failures").notNull().default(0),
  firstAt: ts("first_at").notNull(),
  lockedUntil: ts("locked_until"),
});

// --- Profiles (one per account) --------------------------------------------------------------

export type ProfileLanguage = { language: string; level: "base" | "buono" | "fluente" };
export type Track = "lavoro" | "stage";

export const profile = sqliteTable(
  "profile",
  {
  id: integer("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  /** "lavoro": a job (the original Compass). "stage": internships and student programmes. */
  track: text("track", { enum: ["lavoro", "stage"] }).notNull().default("lavoro"),
  /**
   * "tutte": every offer, with extra weight on chosen companies and sectors.
   * "preferite": only offers from chosen companies (and chosen sectors unless focusCompaniesOnly).
   */
  focus: text("focus", { enum: ["tutte", "preferite"] }).notNull().default("tutte"),
  focusCompaniesOnly: integer("focus_companies_only", { mode: "boolean" }).notNull().default(false),
  /** Personal tastes from the questionnaire (TASTES keys), used for company suggestions. */
  tastes: json<string[]>("tastes").notNull().default([]),
  /** Hide offers whose known pay is below minNetMonthly (unknown pay stays visible). */
  hideBelowMin: integer("hide_below_min", { mode: "boolean" }).notNull().default(false),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  linkedinUrl: text("linkedin_url").notNull().default(""),
  roles: json<string[]>("roles").notNull().default([]),
  synonyms: json<string[]>("synonyms").notNull().default([]),
  city: text("city").notNull().default(""),
  lat: real("lat"),
  lng: real("lng"),
  maxKm: integer("max_km").notNull().default(20),
  remoteOk: integer("remote_ok", { mode: "boolean" }).notNull().default(true),
  hours: text("hours", { enum: ["full", "part", "any"] }).notNull().default("any"),
  contracts: json<string[]>("contracts").notNull().default([]),
  minNetMonthly: integer("min_net_monthly"),
  minGrossAnnualEstimate: integer("min_gross_annual_estimate"),
  languages: json<ProfileLanguage[]>("languages").notNull().default([]),
  avoidSectors: json<string[]>("avoid_sectors").notNull().default([]),
  avoidCompanies: json<string[]>("avoid_companies").notNull().default([]),
  avoidKeywords: json<string[]>("avoid_keywords").notNull().default([]),
  // "Kit candidatura" standard answers
  presentation: text("presentation").notNull().default(""),
  availability: text("availability").notNull().default(""),
  salaryExpectation: text("salary_expectation").notNull().default(""),
  // Students ("stage" track)
  university: text("university").notNull().default(""),
  degree: text("degree").notNull().default(""),
  studyYear: integer("study_year"), // 1 = first year
  degreeYears: integer("degree_years"), // 3 for a bachelor, 2 for a master, 5 for a single-cycle degree
  graduationYear: integer("graduation_year"),
  periods: json<string[]>("periods").notNull().default([]), // "estate", "autunno", "inverno", "primavera", "part-time"
  extraPlaces: json<string[]>("extra_places").notNull().default([]), // other cities, e.g. "Londra"
  /** Optional: countries (IT, GB, DE, FR) and regions ("IT:Lombardia") where they want to work. Empty = no limit. */
  countries: json<string[]>("countries").notNull().default([]),
  regions: json<string[]>("regions").notNull().default([]),
  /** Questionnaire version chosen at the start: "veloce" (5 questions) or "completo"; null = not chosen yet. */
  onboardingMode: text("onboarding_mode").$type<"veloce" | "completo">(),
  /** How soon they need a job: alta = wider (also a step below), media = normal, bassa = only the best fits. */
  priority: text("priority").$type<"alta" | "media" | "bassa">().notNull().default("media"),
  /** Their own weights for the fit score (Profilo → Punteggio); null = the defaults. */
  fitWeights: json<Record<string, number> | null>("fit_weights"),
  paidOnly: integer("paid_only", { mode: "boolean" }).notNull().default(false),
  /** "Cosa fai ora?" (core/situation.ts): the first answer, it decides the questionnaire. Null = not asked yet. */
  situation: text("situation").$type<import("../core/situation").Situation>(),
  /** Work: years of experience as they said it (the CV timeline counts first), current role, notice. */
  yearsExperience: integer("years_experience"),
  currentRole: text("current_role").notNull().default(""),
  noticePeriod: text("notice_period").notNull().default(""),
  /** Students: what they do besides studying ("associazione", "sport", "volontariato"...). */
  activities: json<string[]>("activities").notNull().default([]),
  /** Where they can work without a visa: "UE" (EU citizens), "GB", "US", "CH". */
  workRights: json<string[]>("work_rights").notNull().default(["UE"]),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  onboardedAt: ts("onboarded_at"),
  updatedAt: ts("updated_at"),
  },
  (t) => [uniqueIndex("profile_user_idx").on(t.userId)],
);

// --- Jobs ------------------------------------------------------------------------------------

export type Reason = string;
export type FactorRow = { key: string; points: number; reason: string };
export type ScamFlagRow = { id: string; warning: string };
export type LanguageRow = { language: string; level: string };

export const jobs = sqliteTable(
  "jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    company: text("company"),
    city: text("city"),
    province: text("province"),
    lat: real("lat"),
    lng: real("lng"),
    /** Where the job is: country code (IT, GB, DE, FR), "" when the place is elsewhere or unknown, null when not checked yet. */
    country: text("country"),
    region: text("region"),
    description: text("description").notNull().default(""),
    salaryRaw: text("salary_raw"),
    salaryMin: integer("salary_min"), // annual gross
    salaryMax: integer("salary_max"),
    salaryBasis: text("salary_basis").notNull().default("unknown"),
    salaryIsEstimate: integer("salary_is_estimate", { mode: "boolean" }).notNull().default(false),
    salaryNote: text("salary_note"),
    contract: text("contract").notNull().default("unknown"),
    hours: text("hours").notNull().default("unknown"),
    remote: text("remote").notNull().default("unknown"),
    languages: json<LanguageRow[]>("languages").notNull().default([]),
    sector: text("sector"),
    /** "lavoro", "stage" (internship), "programma" (insight/spring week), or "unknown". */
    jobType: text("job_type").notNull().default("unknown"),
    /** Who the ad is for: codes from extractEligibility() (e.g. "laurea-richiesta", "primo-anno"). */
    eligibility: json<string[]>("eligibility").notNull().default([]),
    durationMonths: integer("duration_months"),
    applicationEmail: text("application_email"),
    applicationEmailEvidence: text("application_email_evidence"),
    scamFlags: json<ScamFlagRow[]>("scam_flags").notNull().default([]),
    thin: integer("thin", { mode: "boolean" }).notNull().default(false),
    postedAt: ts("posted_at"),
    /** When applications close / open, when the programme runs (core/dates.ts), "rolling" review. */
    closesAt: ts("closes_at"),
    opensAt: ts("opens_at"),
    runsStart: ts("runs_start"),
    runsEnd: ts("runs_end"),
    runsMonthOnly: integer("runs_month_only", { mode: "boolean" }).notNull().default(false),
    rolling: integer("rolling", { mode: "boolean" }).notNull().default(false),
    firstSeenAt: ts("first_seen_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (t) => [index("jobs_dedupe_idx").on(t.dedupeKey), index("jobs_country_idx").on(t.country, t.region)],
);

/**
 * A job as one person sees it: distance from their home, their ranking, their actions.
 * A row exists only for people allowed to see the job (see jobSources.userId).
 */
export const userJobs = sqliteTable(
  "user_jobs",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    distanceKm: real("distance_km"),
    score: integer("score").notNull().default(0),
    level: text("level", { enum: ["molto", "adatta", "poco"] }).notNull().default("poco"),
    reasons: json<Reason[]>("reasons").notNull().default([]),
    factors: json<FactorRow[]>("factors").notNull().default([]),
    status: text("status", { enum: ["new", "seen", "dismissed", "applied"] }).notNull().default("new"),
    dismissReason: text("dismiss_reason"),
    seenAt: ts("seen_at"),
    /** Matches the person's choices: "company" (a chosen company), "sector" (a chosen sector) or null. */
    presetMatch: text("preset_match", { enum: ["company", "sector"] }),
    /** Fit score out of 100 and its parts (core/fit.ts). */
    fit: integer("fit").notNull().default(0),
    parts: json<Record<string, number>>("parts").notNull().default({}),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] }), index("user_jobs_list_idx").on(t.userId, t.level, t.status), index("user_jobs_fit_idx").on(t.userId, t.fit)],
);

/** Searches already made (by their key, see core/search-code.ts): shared by everyone, not repeated within a day. */
export const searchCache = sqliteTable("search_cache", {
  key: text("key").primaryKey(),
  lastRunAt: ts("last_run_at").notNull(),
  items: integer("items").notNull().default(0),
});

/** Named folders where a person saves offers ("Candidarsi presto", "Da tenere d'occhio"...). */
export const folders = sqliteTable(
  "folders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("folders_user_idx").on(t.userId)],
);

export const folderItems = sqliteTable(
  "folder_items",
  {
    folderId: integer("folder_id").notNull().references(() => folders.id, { onDelete: "cascade" }),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    note: text("note"),
    addedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.folderId, t.jobId] }), index("folder_items_user_idx").on(t.userId, t.jobId)],
);

export const jobSources = sqliteTable(
  "job_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // SourceKind
    url: text("url"),
    externalId: text("external_id"),
    /** Private source (someone's own alert e-mails, or added by hand): only they see the job through it. Null: everyone. */
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    seenAt: ts("seen_at").notNull(),
  },
  (t) => [index("job_sources_job_idx").on(t.jobId), index("job_sources_url_idx").on(t.url)],
);

// --- Catalog: sectors, boutiques, brands (curated + "Altro" added by people) ---------------------

export type CatalogTrack = "lavoro" | "stage" | "tutti";
export const COMPANY_KINDS = ["boutique", "banca", "fondo", "consulenza", "startup", "brand", "azienda", "programma"] as const;
export type CompanyKind = (typeof COMPANY_KINDS)[number];

export const catalogSectors = sqliteTable("catalog_sectors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  track: text("track").$type<CatalogTrack>().notNull().default("tutti"),
  /** Words that identify the sector in a job title or text (the name itself always counts). */
  keywords: json<string[]>("keywords").notNull().default([]),
  /** Broad themes the sector belongs to ("lusso", "moda", "nautica"...): they connect related sectors. */
  themes: json<string[]>("themes").notNull().default([]),
  /** Curated entries have no author. Entries added with "Altro" are private until the admin shares them. */
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  shared: integer("shared", { mode: "boolean" }).notNull().default(true),
  /** curato = hand-made list; altro = added by a person; nace = the EU classification (shown when searched or chosen). */
  source: text("source").$type<"curato" | "altro" | "nace">().notNull().default("curato"),
  nace: text("nace"),
  createdAt: createdAt(),
});

export const catalogCompanies = sqliteTable("catalog_companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  aliases: json<string[]>("aliases").notNull().default([]),
  kind: text("kind").$type<CompanyKind>().notNull().default("azienda"),
  /** Main sector. A brand is often in more than one: see extraSectorIds (Ferrari: auto, and luxury lifestyle). */
  sectorId: integer("sector_id").references(() => catalogSectors.id, { onDelete: "set null" }),
  extraSectorIds: json<number[]>("extra_sector_ids").notNull().default([]),
  /** Themes of its own, on top of those of its sectors. */
  themes: json<string[]>("themes").notNull().default([]),
  city: text("city"),
  track: text("track").$type<CatalogTrack>().notNull().default("tutti"),
  note: text("note"),
  /** Optional public ATS feed (filled in by the admin after checking it). */
  ats: text("ats", { enum: ["greenhouse", "lever", "ashby", "smartrecruiters", "workable", "personio"] }),
  atsSlug: text("ats_slug"),
  /** When Compass last looked for its public job board on its own (sources/ats/discover.ts). */
  atsCheckedAt: ts("ats_checked_at"),
  /** Its own careers page, found by the web scraping (sources/web/careers.ts), and when it was looked for. */
  careersUrl: text("careers_url"),
  careersCheckedAt: ts("careers_checked_at"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  shared: integer("shared", { mode: "boolean" }).notNull().default(true),
  /** curato = hand-made list; altro = added by a person; borsa = listed companies (shown when searched or chosen). */
  /** + registro = imported from an official company register (scripts/import-register.ts). */
  source: text("source").$type<"curato" | "altro" | "borsa" | "registro">().notNull().default("curato"),
  country: text("country").notNull().default("IT"),
  region: text("region"),
  website: text("website"),
  industry: text("industry"),
  /** 0 nano ... 5 mega (market value), null = unknown. */
  size: integer("size"),
  createdAt: createdAt(),
}, (t) => [
  index("catalog_companies_source_idx").on(t.source, t.country),
  // Browsing and suggestions read only the rows they show, not the ~950,000 of the registers (online
  // databases bill by rows read). Name search uses the full-text table catalog_companies_fts (0008).
  index("catalog_companies_browse_idx").on(t.source, t.country, sql`${t.size} desc`, t.name),
  index("catalog_companies_sector_idx").on(t.sectorId, t.country, sql`${t.size} desc`),
  index("catalog_companies_author_idx").on(t.createdByUserId),
  index("catalog_companies_ats_idx").on(t.ats),
]);

/** One person's experience timeline: work, studies, volunteering. From the CV, a LinkedIn data export, or typed in. */
export const experiences = sqliteTable(
  "experiences",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["lavoro", "studio", "volontariato", "altro"] }).notNull().default("lavoro"),
    title: text("title").notNull().default(""),
    organization: text("organization").notNull().default(""),
    city: text("city"),
    startYear: integer("start_year"),
    startMonth: integer("start_month"),
    endYear: integer("end_year"), // null and current=false: unknown
    endMonth: integer("end_month"),
    current: integer("current", { mode: "boolean" }).notNull().default(false),
    description: text("description").notNull().default(""),
    source: text("source", { enum: ["cv", "linkedin", "manuale"] }).notNull().default("manuale"),
    /** What Compass understood: the catalog company and sector it matched (used for suggestions). */
    catalogCompanyId: integer("catalog_company_id").references(() => catalogCompanies.id, { onDelete: "set null" }),
    sectorId: integer("sector_id").references(() => catalogSectors.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("experiences_user_idx").on(t.userId)],
);

/** "Mi interessa" / "Da evitare" on catalog entries, per person. */
export const userPrefs = sqliteTable(
  "user_prefs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["sector", "company"] }).notNull(),
    refId: integer("ref_id").notNull(),
    stance: text("stance", { enum: ["like", "avoid"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("user_prefs_unique").on(t.userId, t.kind, t.refId)],
);

// --- Sources: health, processed messages, watchlists, approvals -----------------------------

export const sourceHealth = sqliteTable("source_health", {
  source: text("source").primaryKey(),
  lastRunAt: ts("last_run_at"),
  lastSuccessAt: ts("last_success_at"),
  itemsFound: integer("items_found").notNull().default(0), // last run
  totalFound: integer("total_found").notNull().default(0),
  parseFailures: integer("parse_failures").notNull().default(0), // last run
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  blocks: integer("blocks").notNull().default(0), // 403/429/captcha events, total
  lastError: text("last_error"), // short, never contains personal data
  pausedUntil: ts("paused_until"),
});

export const processedMessages = sqliteTable("processed_messages", {
  messageId: text("message_id").primaryKey(),
  kind: text("kind", { enum: ["alert", "reply", "other"] }).notNull(),
  parser: text("parser"),
  processedAt: ts("processed_at").notNull(),
});

export const companyWatchlist = sqliteTable("company_watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ats: text("ats", { enum: ["greenhouse", "lever", "ashby", "smartrecruiters", "workable", "personio"] }).notNull(),
  slug: text("slug").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

/** W2 sites. Each must be reviewed (ToS + robots.txt) and approved by the admin before any fetch. */
export const approvedSites = sqliteTable("approved_sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startUrl: text("start_url").notNull(),
  termsSummary: text("terms_summary").notNull().default(""),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  approvedAt: ts("approved_at"),
  robotsSummary: text("robots_summary").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

/** HTTP cache for polite fetching (ETag / Last-Modified). */
export const httpCache = sqliteTable("http_cache", {
  url: text("url").primaryKey(),
  etag: text("etag"),
  lastModified: text("last_modified"),
  body: text("body"),
  status: integer("status").notNull(),
  fetchedAt: ts("fetched_at").notNull(),
});

/** W1 results awaiting nothing: thin records are stored as jobs; this keeps the query log for the cap. */
export const usageCounters = sqliteTable(
  "usage_counters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    counter: text("counter").notNull(), // "w1-queries", "w3-fetches"
    day: text("day").notNull(), // Rome date key
    count: integer("count").notNull().default(0),
  },
  (t) => [uniqueIndex("usage_counter_day").on(t.counter, t.day)],
);

// --- Applying -----------------------------------------------------------------------------------

export const cvs = sqliteTable("cvs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  roleFamily: text("role_family").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull().default("application/pdf"),
  size: integer("size").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  text: text("text").notNull().default(""), // plain text of the CV, used for the Claude prompt
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["job", "spontaneous"] }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  updatedAt: ts("updated_at"),
});

export const spontaneousCompanies = sqliteTable("spontaneous_companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  sourceUrl: text("source_url").notNull(), // page where the company publishes the address
  city: text("city"),
  notes: text("notes"),
  status: text("status", { enum: ["suggested", "approved", "rejected"] }).notNull().default("approved"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export type ApplicationStatus =
  | "draft" // prepared, waiting for her (Da inviare)
  | "queued" // approved, waiting for the undo window / send window
  | "sending" // claimed by one queue runner (prevents double sends)
  | "sent"
  | "cancelled" // "Annulla" during the undo window
  | "skipped" // "Salta"
  | "failed"
  | "applied_site" // Lane 3: "Fatto, mi sono candidata"
  | "replied"
  | "interview"
  | "rejected"
  | "offer";

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "set null" }),
    spontaneousCompanyId: integer("spontaneous_company_id").references(() => spontaneousCompanies.id, { onDelete: "set null" }),
    lane: text("lane", { enum: ["email", "curated", "site"] }).notNull(),
    mode: text("mode", { enum: ["manual", "autopilot"] }).notNull().default("manual"),
    status: text("status").$type<ApplicationStatus>().notNull(),
    company: text("company"),
    role: text("role"),
    toEmail: text("to_email"),
    subject: text("subject"),
    body: text("body"),
    cvId: integer("cv_id").references(() => cvs.id, { onDelete: "set null" }),
    templateId: integer("template_id").references(() => templates.id, { onDelete: "set null" }),
    warnings: json<{ code: string; message: string }[]>("warnings").notNull().default([]),
    sendAt: ts("send_at"), // scheduled send time (queued)
    sentAt: ts("sent_at"),
    messageId: text("message_id"), // RFC 5322 Message-ID of the sent e-mail
    simulated: integer("simulated", { mode: "boolean" }).notNull().default(false),
    lastError: text("last_error"),
    replyAt: ts("reply_at"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("applications_status_idx").on(t.status), index("applications_job_idx").on(t.jobId), index("applications_user_idx").on(t.userId, t.status)],
);

export const sendLog = sqliteTable("send_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "set null" }),
  toEmail: text("to_email").notNull(),
  company: text("company"),
  role: text("role"),
  cvLabel: text("cv_label"),
  templateName: text("template_name"),
  status: text("status", { enum: ["sent", "simulated", "failed", "cancelled"] }).notNull(),
  detail: text("detail"),
  at: ts("at").notNull(),
});

export const replies = sqliteTable("replies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  subject: text("subject").notNull(),
  snippet: text("snippet").notNull().default(""),
  matchedBy: text("matched_by", { enum: ["thread", "domain"] }).notNull(),
  suggestedStatus: text("suggested_status").$type<ApplicationStatus>(),
  confirmed: integer("confirmed", { mode: "boolean" }).notNull().default(false),
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
  receivedAt: ts("received_at").notNull(),
});

// --- Ranking adjustments, blocklist, settings ---------------------------------------------------

export const rankAdjustments = sqliteTable("rank_adjustments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["company", "keyword", "role", "distance", "salary"] }).notNull(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  fromJobId: integer("from_job_id"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const blocklist = sqliteTable("blocklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["company", "domain", "keyword"] }).notNull(),
  value: text("value").notNull(),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: json<unknown>("value").notNull(),
});

// --- Outbox (demo mode) and notifications -------------------------------------------------------

/** Every e-mail the app "sends" in demo mode lands here instead of the internet. */
export const outbox = sqliteTable("outbox", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["application", "digest", "admin-alert", "account"] }).notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  html: text("html"),
  attachmentName: text("attachment_name"),
  messageId: text("message_id").notNull(),
  at: ts("at").notNull(),
});

/** Demo mailbox: synthetic inbound e-mails (alerts + replies) when DEMO_MODE=true. */
export const demoInbox = sqliteTable("demo_inbox", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: text("message_id").notNull().unique(),
  mailboxKey: text("mailbox_key").notNull().default("default"),
  raw: text("raw").notNull(), // full RFC 822 source
  receivedAt: ts("received_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audience: text("audience", { enum: ["user", "admin"] }).notNull(),
  /** For audience "user": whose notification it is. */
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  href: text("href"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const jobRuns = sqliteTable("job_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  job: text("job").notNull(), // ingest | discover | queue | replies | digest
  startedAt: ts("started_at").notNull(),
  finishedAt: ts("finished_at"),
  ok: integer("ok", { mode: "boolean" }),
  summary: text("summary"),
});

/**
 * A person's own mailbox connected with Google sign-in (read-only): Compass reads the job-site
 * alerts in it directly, no forwarding. The refresh token is stored encrypted (core/token-crypt.ts).
 */
export const mailConnections = sqliteTable("mail_connections", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["gmail"] }).notNull().default("gmail"),
  email: text("email").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  connectedAt: ts("connected_at").notNull(),
  lastReadAt: ts("last_read_at"),
  /** Why the last read failed ("revoked" = access removed in Google: connect again). */
  lastError: text("last_error"),
});

/**
 * Companies that run early-careers programmes (spring weeks, insight days, internships), found as
 * NAMES ONLY on public trackers or through web search. Nothing else from the trackers is kept: each
 * company's offers are then read from its own official page or job board (pipeline/programmes.ts).
 */
export const programmeLeads = sqliteTable(
  "programme_leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** The name folded, without legal suffixes ("barclays"): one lead per company. */
    nameKey: text("name_key").notNull().unique(),
    name: text("name").notNull(),
    /** What the source lists them for: "spring week", "internship"... */
    kind: text("kind").notNull().default("programme"),
    /** Where the programme is (country code), when the source is about one country. */
    country: text("country"),
    sourceHost: text("source_host").notNull(),
    catalogCompanyId: integer("catalog_company_id"),
    /** The official page found for it (firm site or its job board). */
    officialUrl: text("official_url"),
    firstSeenAt: ts("first_seen_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull(),
    checkedAt: ts("checked_at"),
    /** Offers read from the official page the last time. */
    found: integer("found").notNull().default(0),
  },
  (t) => [index("programme_leads_checked_idx").on(t.checkedAt)],
);
