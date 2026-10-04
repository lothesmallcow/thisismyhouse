// Database schema (SQLite / libSQL via Drizzle). One file so the whole data model is
// readable at a glance. Dates are stored as integer timestamps (ms).

import { sql } from "drizzle-orm";
import { blob, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () => ts("created_at").notNull().default(sql`(unixepoch() * 1000)`);
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

// --- Accounts -----------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role", { enum: ["user", "admin"] }).notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
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

// --- Her profile (single row, id = 1) ------------------------------------------------------

export type ProfileLanguage = { language: string; level: "base" | "buono" | "fluente" };

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
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
  onboardingStep: integer("onboarding_step").notNull().default(1),
  onboardedAt: ts("onboarded_at"),
  updatedAt: ts("updated_at"),
});

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
    distanceKm: real("distance_km"),
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
    applicationEmail: text("application_email"),
    applicationEmailEvidence: text("application_email_evidence"),
    scamFlags: json<ScamFlagRow[]>("scam_flags").notNull().default([]),
    thin: integer("thin", { mode: "boolean" }).notNull().default(false),
    postedAt: ts("posted_at"),
    firstSeenAt: ts("first_seen_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    // ranking (recomputed when profile or adjustments change)
    score: integer("score").notNull().default(0),
    level: text("level", { enum: ["molto", "adatta", "poco"] }).notNull().default("poco"),
    reasons: json<Reason[]>("reasons").notNull().default([]),
    factors: json<FactorRow[]>("factors").notNull().default([]),
    // her actions
    status: text("status", { enum: ["new", "seen", "dismissed", "applied"] }).notNull().default("new"),
    dismissReason: text("dismiss_reason"),
    seenAt: ts("seen_at"),
  },
  (t) => [index("jobs_level_idx").on(t.level, t.status), index("jobs_dedupe_idx").on(t.dedupeKey)],
);

export const jobSources = sqliteTable(
  "job_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // SourceKind
    url: text("url"),
    externalId: text("external_id"),
    seenAt: ts("seen_at").notNull(),
  },
  (t) => [index("job_sources_job_idx").on(t.jobId), index("job_sources_url_idx").on(t.url)],
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
  name: text("name").notNull(),
  kind: text("kind", { enum: ["job", "spontaneous"] }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  updatedAt: ts("updated_at"),
});

export const spontaneousCompanies = sqliteTable("spontaneous_companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  (t) => [index("applications_status_idx").on(t.status), index("applications_job_idx").on(t.jobId)],
);

export const sendLog = sqliteTable("send_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  kind: text("kind", { enum: ["application", "digest", "admin-alert"] }).notNull(),
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
  raw: text("raw").notNull(), // full RFC 822 source
  receivedAt: ts("received_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audience: text("audience", { enum: ["user", "admin"] }).notNull(),
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
