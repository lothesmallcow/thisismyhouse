// raw -> normalized job. Every source adapter produces RawJob; this turns it into the
// fields the database, filters and ranking need. Pure and deterministic.

import { canonicalUrl } from "./dedupe";
import {
  extractApplicationEmails,
  extractContract,
  extractDurationMonths,
  extractEligibility,
  extractHours,
  extractJobType,
  extractLanguages,
  extractRemote,
  extractSector,
  type Contract,
  type Eligibility,
  type Hours,
  type JobType,
  type LanguageReq,
  type Remote,
} from "./extract";
import { distanceKm, findPlace } from "./geo";
import { keyDates } from "./dates";
import { findSalaryText, parseSalary, type Salary } from "./salary";
import { scamFlags, type ScamFlag } from "./scam-rules";
import { truncate } from "./text";

export type SourceKind =
  | "email:linkedin"
  | "email:indeed"
  | "email:infojobs"
  | "email:generic"
  | "api:adzuna"
  | "api:jooble"
  | "ats:greenhouse"
  | "ats:lever"
  | "ats:ashby"
  | "ats:smartrecruiters"
  | "ats:workable"
  | "ats:personio"
  | "w1"
  | "w2"
  | "w3"
  | "manual";

export const SOURCE_LABELS: Record<string, string> = {
  "email:linkedin": "Avviso e-mail LinkedIn",
  "email:indeed": "Avviso e-mail Indeed",
  "email:infojobs": "Avviso e-mail InfoJobs",
  "email:generic": "Avviso e-mail",
  "api:adzuna": "Adzuna",
  "api:jooble": "Jooble",
  "ats:greenhouse": "Sito dell'azienda",
  "ats:lever": "Sito dell'azienda",
  "ats:ashby": "Sito dell'azienda",
  "ats:smartrecruiters": "Sito dell'azienda",
  "ats:workable": "Sito dell'azienda",
  "ats:personio": "Sito dell'azienda",
  w1: "Ricerca sul web",
  w2: "Sito di annunci",
  w3: "Pagina pubblica dell'annuncio",
  manual: "Aggiunta a mano",
};

export interface RawJob {
  source: SourceKind;
  url: string | null;
  externalId?: string | null;
  title: string;
  company?: string | null;
  location?: string | null;
  description?: string | null;
  salaryText?: string | null;
  postedAt?: Date | null;
  /** Structured hints when the source has them (JSON-LD, APIs). */
  hints?: { contract?: Contract; hours?: Hours; remote?: Remote; minAnnualGross?: number; maxAnnualGross?: number; closesAt?: Date | null };
  /** Thin record: only title/snippet/url (W1, some alerts). */
  thin?: boolean;
}

export interface NormalizedJob {
  title: string;
  company: string | null;
  city: string | null;
  province: string | null;
  lat: number | null;
  lng: number | null;
  /** Country code of the place, "" when there is a place we do not cover (or cannot read), null when none. */
  country: string | null;
  region: string | null;
  distanceKm: number | null;
  description: string;
  salary: Salary;
  contract: Contract;
  hours: Hours;
  remote: Remote;
  languages: LanguageReq[];
  sector: string | null;
  jobType: JobType;
  eligibility: Eligibility[];
  durationMonths: number | null;
  applicationEmail: string | null;
  applicationEmailEvidence: string | null;
  postedAt: Date | null;
  scamFlags: ScamFlag[];
  thin: boolean;
  url: string | null;
  /** When applications close and open, when it runs, and whether they are reviewed as they arrive (core/dates.ts). */
  closesAt: Date | null;
  opensAt: Date | null;
  runsStart: Date | null;
  runsEnd: Date | null;
  runsMonthOnly: boolean;
  rolling: boolean;
}

export function normalizeJob(raw: RawJob, home: { lat: number; lng: number } | null, now = new Date()): NormalizedJob {
  const title = raw.title.replace(/\s+/g, " ").trim();
  const description = (raw.description ?? "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  const all = `${title}\n${raw.location ?? ""}\n${description}`;

  const place = findPlace(raw.location) ?? (raw.location ? null : findPlace(description.slice(0, 300), { abroad: false }));
  const salaryText = raw.salaryText ?? findSalaryText(description);
  let salary = parseSalary(salaryText);
  if (salary.minAnnualGross == null && raw.hints?.minAnnualGross) {
    salary = {
      raw: salaryText ?? "",
      minAnnualGross: raw.hints.minAnnualGross,
      maxAnnualGross: raw.hints.maxAnnualGross ?? raw.hints.minAnnualGross,
      basis: "annual_unspecified",
      isEstimate: true,
      note: "dato fornito dalla fonte",
    };
  }

  const emails = extractApplicationEmails(description);
  const company = raw.company?.trim() || null;
  const remote = raw.hints?.remote ?? extractRemote(all);
  const applicationEmail = emails[0]?.email ?? null;
  const dates = keyDates(`${title}\n${description}`, raw.postedAt ?? now);

  return {
    title: truncate(title, 200),
    company,
    city: place?.name ?? (raw.location?.split(/[,(]/)[0].trim() || null),
    province: place?.province ?? null,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    country: place?.country ?? (raw.location?.trim() ? "" : null),
    region: place?.region || null,
    distanceKm: place && home ? distanceKm(home, place) : null,
    description,
    salary,
    contract: raw.hints?.contract ?? extractContract(all),
    hours: raw.hints?.hours ?? extractHours(all),
    remote,
    languages: extractLanguages(description),
    sector: extractSector(`${title}\n${description.slice(0, 500)}`),
    jobType: extractJobType(title, description),
    eligibility: extractEligibility(description),
    durationMonths: extractDurationMonths(`${title}\n${description}`),
    applicationEmail,
    applicationEmailEvidence: emails[0]?.evidence ?? null,
    postedAt: raw.postedAt ?? null,
    scamFlags: scamFlags({ title, company, description, applicationEmail, maxAnnualGross: salary.maxAnnualGross }),
    thin: raw.thin ?? description.length < 120,
    url: raw.url ? canonicalUrl(raw.url) : null,
    closesAt: raw.hints?.closesAt ?? dates.closesAt,
    opensAt: dates.opensAt,
    runsStart: dates.runs?.start ?? null,
    runsEnd: dates.runs?.end ?? null,
    runsMonthOnly: dates.runs?.monthOnly ?? false,
    rolling: dates.rolling,
  };
}
