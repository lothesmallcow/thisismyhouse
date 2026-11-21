/**
 * Website Scorer: shared types. The engine is plain TypeScript with no DOM or Node APIs, so the
 * same code runs in Cloudflare Pages Functions, in the Node CLI (scripts/scorer) and in the tests.
 *
 * rubric.json holds a library of checks, a common block of points that every sector shares, and
 * one profile per sector (its extra checks, its points, its wording and its vocabulary). A profile
 * resolved against the library gives a SectorRubric: the flat list of checks a page is scored on.
 */

export type CategoryId = "speed" | "conversion" | "local" | "trust" | "a11y" | "legal" | "content";

export type SectorId =
  | "fitness" | "ospitalita" | "ristorazione" | "edilizia" | "salute" | "bellezza"
  | "professionisti" | "immobiliare" | "negozio" | "eventi" | "altro";

export interface CheckText {
  title: string;
  why: string;
  fix: string;
}

export interface CheckDef extends CheckText {
  id: string;
  category: CategoryId;
  flag?: boolean;
  bands?: { full: number; half: number; unit: string; labFull?: number; labHalf?: number };
}

/** Regex sources (alternations, matched case-insensitively at a word start) and switches. */
export interface Vocab {
  activity: string;
  schema: string;
  hosts: string;
  words: string;
  paths: string;
  /** A contact or quote form on the page counts as the main action. */
  form: boolean;
  ota?: string;
  offer?: string;
  team?: string;
  hours?: string;
  hoursPaths?: string;
  prices?: string;
  rooms?: string;
  menu?: string;
  services?: string;
  servicesPaths?: string;
  credentials?: string;
  portfolio?: string;
  area?: string;
  listings?: string;
  listingsPaths?: string;
  listingsHosts?: string;
  products?: string;
  capacity?: string;
}

export interface SectorDef {
  id: SectorId;
  label: string;
  conversionLabel: string;
  points: Record<string, number>;
  texts: Record<string, Partial<CheckText>>;
  vocab: Vocab;
}

export interface Rubric {
  version: string;
  date: string;
  categories: { id: CategoryId; label: string }[];
  common: Record<string, number>;
  checks: CheckDef[];
  sectors: SectorDef[];
}

/** One check as scored for one sector: the library entry with that sector's points and wording. */
export interface RubricCheck extends CheckDef {
  points: number;
}

export interface SectorRubric {
  version: string;
  sector: SectorDef;
  categories: { id: CategoryId; label: string; weight: number }[];
  checks: RubricCheck[];
}

/** What the page itself shows: read from its HTML, nothing rendered. */
export interface PageSignals {
  finalUrl: string;
  https: boolean;
  lang: string | null;
  title: string;
  description: string;
  viewport: string;
  h1: string[];
  /** Visible text: scripts, styles and hidden elements removed (hidden text earns nothing). */
  text: string;
  /** The first part of the visible text, where a visitor looks first. */
  lead: string;
  links: LinkSignal[];
  buttons: string[];
  images: { total: number; withAlt: number };
  /** Forms that collect a message or a contact (a textarea, an email or a phone field). */
  forms: { count: number; fields: string[] };
  jsonLdTypes: string[];
  /** Property names found in the JSON-LD (openingHours, hasMenu, areaServed...). */
  jsonLdKeys: string[];
  /** addressLocality values in the JSON-LD. */
  localities: string[];
  hasAggregateRating: boolean;
  /** Script sources, iframe sources and inline script text, lowercased, for vendor detection. */
  vendorBlob: string;
  multilingual: boolean;
  /**
   * Cookie banner evidence from the raw HTML (banners are often hidden until a script shows them):
   * the marker that looks like a banner (class, id or script name), whether a reject option is
   * written anywhere, and whether Google Consent Mode defaults are set.
   */
  consent: { banner: string | null; reject: boolean; consentMode: boolean };
}

export interface LinkSignal {
  href: string;
  text: string;
  /** In <header> or <nav>, or before the first <h2>: what a visitor reaches without scrolling far. */
  early: boolean;
}

/** Speed and accessibility from Lighthouse (lab) and, when Google has it, CrUX (real users). */
export interface PerfData {
  /** "field" when real-user data was used for LCP, INP and CLS. */
  source: "field" | "lab";
  fieldScope?: "url" | "origin";
  lcpMs?: number;
  inpMs?: number;
  tbtMs?: number;
  cls?: number;
  bytes?: number;
  a11y?: number;
  lighthouseVersion?: string;
}

export type Status = "pass" | "partial" | "fail" | "unmeasured" | "flag-ok" | "flag-warn";

export interface CheckResult {
  id: string;
  category: CategoryId;
  earned: number;
  max: number;
  status: Status;
  /** One short Italian sentence on what was found on this page. */
  found: string;
}

export interface CategoryScore {
  id: CategoryId;
  label: string;
  earned: number;
  max: number;
  measured: boolean;
}

export interface Fix {
  id: string;
  title: string;
  why: string;
  fix: string;
  found: string;
  gain: number;
}

export interface Flag {
  id: string;
  title: string;
  why: string;
  status: "flag-ok" | "flag-warn";
  found: string;
}

export interface Report {
  rubricVersion: string;
  sector: SectorId;
  sectorLabel: string;
  url: string;
  /** 0-100. When some checks could not be measured, it is the share of the measured points. */
  total: number;
  partial: boolean;
  categories: CategoryScore[];
  checks: (CheckResult & { title: string })[];
  fixes: Fix[];
  flags: Flag[];
  perfSource: PerfData["source"] | "none";
  measuredAt: string;
}
