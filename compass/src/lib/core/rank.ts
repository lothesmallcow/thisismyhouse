// Explainable, rule-based ranking. Every point comes from a named factor with an Italian
// reason, so the level shown to her ("Molto adatta", "Adatta", "Poco adatta") can always be
// explained, and the admin can see the full breakdown.

import type { Contract, Eligibility, Hours, JobType, LanguageReq, Remote } from "./extract";
import { normalizeCompany } from "./dedupe";
import { escapeRe, fold, keyTokens } from "./text";
import { PRIORITY_THRESHOLDS, RANK_WEIGHTS as W, THRESHOLDS } from "./rank-config";
import { careerStage, titleSeniority } from "./career-stage";
import { countryName, findPlace } from "./geo";
import { computeFit, type FitArea, type FitWeights } from "./fit";
import { checkRequirements, extractRequirements, type Person } from "./requirements";

export { THRESHOLDS };

export type Level = "molto" | "adatta" | "poco";

export const LEVEL_LABELS: Record<Level, string> = {
  molto: "Molto adatta",
  adatta: "Adatta",
  poco: "Poco adatta",
};

export interface RankProfile {
  track: "lavoro" | "stage";
  roles: string[]; // target role titles
  synonyms: string[]; // approved synonyms
  maxKm: number;
  remoteOk: boolean;
  hours: "full" | "part" | "any";
  contracts: Contract[]; // accepted; empty = any
  minAnnualGross: number | null; // floor, estimate from her net monthly
  languages: { language: string; level: "base" | "buono" | "fluente" }[];
  avoidKeywords: string[];
  avoidCompanies: string[];
  avoidSectors: string[];
  /** From the catalog: sectors with their words, companies with their other names. */
  likedSectors: { name: string; keywords: string[] }[];
  avoidSectorTerms: { name: string; keywords: string[] }[];
  likedCompanies: { name: string; aliases: string[] }[];
  // Students
  studyYear: number | null;
  degreeYears: number | null;
  /** The year they graduate, when they said it (otherwise worked out from year of study and degree length). */
  graduationYear?: number | null;
  extraPlaces: string[];
  paidOnly: boolean;
  /** Countries and regions ("IT:Lombardia") they chose; empty = no limit. */
  countries: string[];
  regions: string[];
  /** CV and timeline, for the requirements check (null = not known). */
  person: Person | null;
  /** Sectors of their past work ("same") and sectors that share a theme with it ("near"). */
  experienceSectors: { name: string; keywords: string[]; relation: "same" | "near"; theme?: string }[];
  /** Their own weights for the fit score (null = defaults). */
  weights: Partial<FitWeights> | null;
  /** Where they work now: a discreet search never puts it forward. */
  currentEmployers: string[];
  /** How soon they need a job: alta = also a step below and gentler levels, bassa = only the best. */
  priority: "alta" | "media" | "bassa";
}

/** The year they graduate: as they said it, or from year of study and degree length (academic years end in summer). */
export function graduationYearOf(p: Pick<RankProfile, "graduationYear" | "studyYear" | "degreeYears">, now: Date): number | null {
  if (p.graduationYear) return p.graduationYear;
  if (!p.studyYear || !p.degreeYears) return null;
  const endOfThisYear = now.getUTCMonth() >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return endOfThisYear + Math.max(0, p.degreeYears - p.studyYear);
}

/** A job seeker with no catalog choices and no student fields (handy defaults for tests and tools). */
export const NO_CHOICES = {
  track: "lavoro",
  likedSectors: [],
  avoidSectorTerms: [],
  likedCompanies: [],
  studyYear: null,
  degreeYears: null,
  extraPlaces: [],
  paidOnly: false,
  countries: [],
  regions: [],
  person: null,
  experienceSectors: [],
  weights: null,
  currentEmployers: [],
  priority: "media",
} satisfies Partial<RankProfile>;

export interface RankJob {
  title: string;
  company: string | null;
  description: string;
  sector: string | null;
  distanceKm: number | null;
  remote: Remote;
  hours: Hours;
  contract: Contract;
  minAnnualGross: number | null;
  maxAnnualGross: number | null;
  languages: LanguageReq[];
  postedAt: Date | null;
  scamFlagCount: number;
  city: string | null;
  /** Country code when known; "" = a place outside the countries we cover (New York, Madrid…). */
  country?: string | null;
  /** When applications close (null = not stated). */
  closesAt?: Date | null;
  jobType: JobType;
  eligibility: Eligibility[];
}

/** An adjustment created by "Non mi interessa" (or by the admin). Visible and undoable. */
export interface RankAdjustment {
  id: number;
  kind: "company" | "keyword" | "role" | "distance" | "salary";
  value: string; // company name, keyword, role word, km cap, or annual gross floor
  label: string;
}

export interface Factor {
  key: string;
  points: number;
  reason: string; // short Italian reason
}

export interface RankResult {
  score: number;
  level: Level;
  reasons: string[]; // 1-2 reasons shown in the list
  factors: Factor[]; // full breakdown (detail page, admin)
  /** The ad matches a chosen company or sector (used by the "only my choices" focus). */
  presetMatch: "company" | "sector" | null;
  /** Fit score out of 100 and its seven parts (see core/fit.ts). */
  fit: number;
  parts: Record<FitArea, number>;
}


/** Words too generic to count as "similar role" on their own. */
const GENERIC_ROLE_WORDS = new Set(["addett", "operat", "operator", "assistent", "responsabil", "collaborator", "junior", "senior", "stagist", "tirocinant", "specialist", "figura", "risorsa"]);

const LANGUAGE_RANK = { base: 0, richiesto: 1, buono: 1, fluente: 2 } as const;

function containsPhrase(haystackTokens: string[], phrase: string): boolean {
  const p = keyTokens(phrase);
  if (p.length === 0) return false;
  for (let i = 0; i + p.length <= haystackTokens.length; i++) {
    if (p.every((w, j) => haystackTokens[i + j] === w)) return true;
  }
  return false;
}

export function rankJob(job: RankJob, profile: RankProfile, adjustments: RankAdjustment[] = [], now = new Date()): RankResult {
  const f: Factor[] = [];
  const titleT = keyTokens(job.title);
  const descT = keyTokens(job.description);
  const titleAndDesc = fold(`${job.title} ${job.description}`);

  // 1. Role match
  const wanted = [...profile.roles, ...profile.synonyms].filter(Boolean);
  if (wanted.length > 0) {
    const exact = wanted.find((r) => containsPhrase(titleT, r));
    if (exact) f.push({ key: "role", points: W.roleExact, reason: `È il lavoro che cerchi (${exact.toLowerCase()})` });
    else {
      const words = new Set(wanted.flatMap((r) => keyTokens(r)).filter((w) => w.length > 3 && !GENERIC_ROLE_WORDS.has(w)));
      const overlap = titleT.filter((w) => words.has(w)).length;
      if (overlap > 0) f.push({ key: "role", points: W.roleSimilar, reason: "Simile al lavoro che cerchi" });
      else if (wanted.some((r) => containsPhrase(descT, r))) f.push({ key: "role", points: W.roleInDescription, reason: "Il tuo lavoro è citato nell'annuncio" });
      else f.push({ key: "role", points: W.roleMismatch, reason: "Non è proprio il lavoro che cerchi" });
    }
  }

  // 2. Distance / remote
  const kmCap = Math.min(
    profile.maxKm,
    ...adjustments.filter((a) => a.kind === "distance").map((a) => Number(a.value)).filter((n) => n > 0),
  );
  const jobPlace = job.city ? findPlace(job.city) : null;
  // "Londra" chosen, ad in "London": compare the places, not the words.
  const extraPlace = job.city ? profile.extraPlaces.find((p) => fold(p) === fold(job.city!) || (jobPlace != null && findPlace(p)?.name === jobPlace.name)) : undefined;
  const inRegion = jobPlace && profile.regions.includes(`${jobPlace.country}:${jobPlace.region}`) ? jobPlace.region : null;
  const kmTooFar = job.distanceKm != null && Math.round(job.distanceKm) > kmCap;
  if (jobPlace && profile.countries.length > 0 && !profile.countries.includes(jobPlace.country) && job.remote !== "remote" && !extraPlace) {
    f.push({ key: "country", points: W.outsideCountries, reason: `In ${countryName(jobPlace.country)}, fuori dai paesi che hai scelto` });
  } else if (!jobPlace && job.city && job.country === "" && profile.countries.length > 0 && job.remote !== "remote" && !extraPlace) {
    f.push({ key: "country", points: W.outsideCountries, reason: `A ${job.city}, fuori dai paesi che hai scelto` });
  }
  if (job.remote === "remote" && profile.remoteOk) f.push({ key: "distance", points: W.remoteAccepted, reason: "Da remoto" });
  else if (inRegion && kmTooFar && !extraPlace) f.push({ key: "distance", points: W.regionMatch, reason: `A ${job.city}, in ${inRegion}: una regione che hai scelto` });
  else if (extraPlace) f.push({ key: "distance", points: W.extraPlaceMatch, reason: `A ${job.city}, tra le città che hai scelto` });
  else if (job.distanceKm != null) {
    const km = Math.round(job.distanceKm);
    if (km <= Math.max(3, kmCap / 2)) f.push({ key: "distance", points: W.distanceNear, reason: km <= 1 ? "Nella tua città" : `A ${km} km da casa` });
    else if (km <= kmCap) f.push({ key: "distance", points: W.distanceOk, reason: `A ${km} km da casa` });
    else f.push({ key: "distance", points: W.distanceFar, reason: `Lontano: ${km} km da casa` });
    if (job.remote === "hybrid" && profile.remoteOk) f.push({ key: "remote", points: W.hybridBonus, reason: "In parte da remoto" });
  }

  // 3. Salary vs floor (unknown = neutral)
  const floor = Math.max(
    profile.minAnnualGross ?? 0,
    ...adjustments.filter((a) => a.kind === "salary").map((a) => Number(a.value)).filter((n) => n > 0),
  );
  if (floor > 0 && job.maxAnnualGross != null) {
    if (job.maxAnnualGross >= floor) f.push({ key: "salary", points: W.salaryAtLeastFloor, reason: "Stipendio in linea con quello che chiedi" });
    else f.push({ key: "salary", points: W.salaryBelowFloor, reason: "Stipendio sotto il tuo minimo" });
  }

  // 4. Hours
  if (profile.hours !== "any" && job.hours !== "unknown") {
    if (job.hours === profile.hours) f.push({ key: "hours", points: W.hoursMatch, reason: job.hours === "part" ? "Part-time come vuoi tu" : "Tempo pieno come vuoi tu" });
    else f.push({ key: "hours", points: W.hoursMismatch, reason: job.hours === "part" ? "È part-time" : "È a tempo pieno" });
  }

  // 5. Contract
  if (profile.contracts.length > 0 && job.contract !== "unknown") {
    if (profile.contracts.includes(job.contract)) f.push({ key: "contract", points: job.contract === "indeterminato" ? W.contractPermanent : W.contractAccepted, reason: job.contract === "indeterminato" ? "Contratto a tempo indeterminato" : "Contratto che accetti" });
    else f.push({ key: "contract", points: W.contractNotAccepted, reason: "Tipo di contratto che non cerchi" });
  }

  // 6. Recency
  if (job.postedAt) {
    const days = (now.getTime() - job.postedAt.getTime()) / 86400000;
    if (days <= W.recentDays) f.push({ key: "recency", points: W.recent, reason: "Pubblicata da poco" });
    else if (days > W.oldDays) f.push({ key: "recency", points: W.old, reason: "Annuncio vecchio di oltre un mese" });
  }

  // 7. Languages
  for (const req of job.languages) {
    const mine = profile.languages.find((l) => l.language === req.language);
    const need = LANGUAGE_RANK[req.level];
    const have = mine ? LANGUAGE_RANK[mine.level] : -1;
    if (have >= need) f.push({ key: `lang-${req.language}`, points: W.languageKnown, reason: `Chiede ${req.language}, che conosci` });
    else if (req.level === "base") continue;
    else f.push({ key: `lang-${req.language}`, points: req.level === "fluente" ? W.languageMissingFluent : W.languageMissing, reason: `Chiede ${req.language}${req.level === "fluente" ? " fluente" : ""}` });
  }

  // 8. Things to avoid
  const avoidKw = [...profile.avoidKeywords, ...adjustments.filter((a) => a.kind === "keyword").map((a) => a.value)].filter(Boolean);
  const hitKw = avoidKw.find((k) => titleAndDesc.includes(fold(k)));
  if (hitKw) f.push({ key: "avoid-keyword", points: W.avoidKeyword, reason: `Contiene "${hitKw}", che vuoi evitare` });

  const avoidRoleWords = adjustments.filter((a) => a.kind === "role").map((a) => a.value);
  const hitRole = avoidRoleWords.find((w) => containsPhrase(titleT, w));
  if (hitRole) f.push({ key: "avoid-role", points: W.avoidRoleWord, reason: "Ruolo che hai scartato prima" });

  const comp = normalizeCompany(job.company);
  const avoidCo = [...profile.avoidCompanies, ...adjustments.filter((a) => a.kind === "company").map((a) => a.value)];
  if (comp && profile.currentEmployers.some((c) => companyNameMatches(job.company, { name: c, aliases: [] }))) f.push({ key: "avoid-company", points: W.avoidCompany, reason: "È la tua azienda attuale: ricerca riservata" });
  else if (comp && avoidCo.some((c) => normalizeCompany(c) === comp)) f.push({ key: "avoid-company", points: W.avoidCompany, reason: "Azienda che vuoi evitare" });

  if (job.sector && profile.avoidSectors.some((s) => fold(s) === fold(job.sector!))) {
    f.push({ key: "avoid-sector", points: W.avoidSector, reason: "Settore che vuoi evitare" });
  }

  for (const s of profile.avoidSectorTerms) {
    if (f.some((x) => x.key === "avoid-sector")) break;
    if (sectorHit(s, job, titleT, null)) f.push({ key: "avoid-sector", points: W.avoidSector, reason: `Settore che vuoi evitare (${s.name.toLowerCase()})` });
  }

  // 9. Chosen companies and sectors
  let presetMatch: RankResult["presetMatch"] = null;
  const likedCo = profile.likedCompanies.find((c) => companyNameMatches(job.company, c));
  let bestSector: { name: string; where: "title" | "text" } | null = null;
  for (const s of profile.likedSectors) {
    const where = sectorHit(s, job, titleT, descT);
    if (where === "title" || (where === "text" && !bestSector)) bestSector = { name: s.name, where };
    if (where === "title") break;
  }
  // The position is the listing's, not the company's: a chosen company can post a job that has
  // nothing to do with what they want (IT helpdesk at an M&A boutique). Judge the title itself.
  const roleInTitle = f.some((x) => x.key === "role" && (x.points === W.roleExact || x.points === W.roleSimilar));
  const nothingToCompare = wanted.length === 0 && profile.likedSectors.length === 0;
  const positionFits = nothingToCompare || roleInTitle || bestSector?.where === "title";
  if (likedCo) {
    f.push(
      positionFits
        ? { key: "company-liked", points: W.companyLiked, reason: `${likedCo.name} è tra le aziende che hai scelto` }
        : { key: "company-liked", points: W.companyLikedOtherRole, reason: `${likedCo.name} è tra le tue aziende, ma questo ruolo è diverso da quello che cerchi` },
    );
    presetMatch = "company";
  }
  // At a chosen company, the description's words usually describe the company: they don't make
  // an unrelated position fit.
  if (likedCo && !positionFits && bestSector?.where === "text") bestSector = null;
  if (bestSector) {
    f.push({ key: "sector-liked", points: bestSector.where === "title" ? W.sectorLiked : W.sectorLikedText, reason: `Settore che ti interessa: ${bestSector.name.toLowerCase()}` });
    presetMatch ??= "sector";
  } else if (profile.track === "stage" && profile.likedSectors.length > 0 && !(likedCo && positionFits)) {
    f.push({ key: "sector-liked", points: W.outsideInterests, reason: "Fuori dai settori che hai scelto" });
  }

  // 10. Students: is it an internship, and is it right for their year?
  if (profile.track === "stage") {
    const stage = careerStage(profile.studyYear, profile.degreeYears);
    const seniority = titleSeniority(job.title);
    const summer = /\bsummer\b|estiv/i.test(job.title);
    if (job.jobType === "programma") {
      if (stage === "primi-anni") f.push({ key: "type", points: W.programmeFirstYears, reason: "Ideale per il tuo anno: programma per studenti" });
      else f.push({ key: "type", points: stage === "ultimo" ? W.programmeLate : W.programmeMatch, reason: "È un programma per studenti" });
    } else if (job.jobType === "stage") {
      if (stage === "primi-anni") f.push({ key: "type", points: W.stageFirstYears, reason: "È uno stage" });
      else if (stage === "penultimo" && summer) f.push({ key: "type", points: W.stageMatch + W.summerPenultimate, reason: "Stage estivo: quello che conta al penultimo anno" });
      else f.push({ key: "type", points: W.stageMatch, reason: "È uno stage" });
      if (stage === "primi-anni" && /summer (analyst|associate)/i.test(job.title)) f.push({ key: "stage-fit", points: W.summerAnalystEarly, reason: "Di solito per chi è al penultimo anno" });
    } else if (job.jobType === "lavoro") {
      if (stage === "ultimo" && seniority === "entry") f.push({ key: "type", points: W.entryJobFinalYear, reason: "Posizione da neolaureato: adatta se ti laurei a breve" });
      else f.push({ key: "type", points: W.notAnInternship, reason: "È un lavoro, non uno stage" });
    } else f.push({ key: "type", points: W.notClearlyInternship, reason: "Non dice se è uno stage" });
    if (seniority === "senior" || (seniority === "associate" && job.jobType !== "stage" && job.jobType !== "programma")) {
      f.push({ key: "seniority", points: W.seniorityTooHigh, reason: "Livello troppo alto per il tuo anno" });
    }
    const el = job.eligibility;
    const year = profile.studyYear;
    const total = profile.degreeYears;
    if (el.includes("laurea-richiesta") && stage === "ultimo") f.push({ key: "eligibility", points: W.degreeRequiredFinalYear, reason: "Chiede la laurea: ci sei quasi" });
    else if (el.includes("laurea-richiesta")) f.push({ key: "eligibility", points: W.degreeRequired, reason: "Chiede la laurea già conseguita" });
    else if (el.includes("fine-studi") && stage === "ultimo") f.push({ key: "eligibility-open", points: W.finalYearWelcome, reason: "Pensato per chi si laurea a breve" });
    else if (el.includes("fine-studi") && year && total && year < total) f.push({ key: "eligibility", points: W.finalYearOnly, reason: "Pensato per chi sta per laurearsi" });
    else if (el.includes("penultimo-anno") && year && total && year < total - 1) f.push({ key: "eligibility", points: W.penultimateOnly, reason: "Pensato per chi è al penultimo anno" });
    if (el.includes("primo-anno") && (!year || year <= 2)) f.push({ key: "eligibility-open", points: W.firstYearWelcome, reason: "Aperto anche ai primi anni" });
    if (el.includes("esperienza")) f.push({ key: "experience", points: W.experienceRequired, reason: "Chiede anni di esperienza" });
    if (el.includes("non-retribuito") && profile.paidOnly) f.push({ key: "pay", points: W.unpaid, reason: "Non retribuito" });
    else if (el.includes("retribuito")) f.push({ key: "pay", points: W.paid, reason: "Retribuito" });
  } else if (job.jobType === "programma") {
    f.push({ key: "type", points: W.programmeForStudents, reason: "È un programma per studenti" });
  }

  // 10b. Who can apply: stated in the ad. Never hidden; a low score and the reason instead.
  {
    const el = job.eligibility as string[];
    const where = job.country ?? null;
    const needsVisa = where === "GB" || (where === "" && job.city != null); // EU citizens: free to work in IT, DE, FR
    if (el.includes("solo-uk") && !profile.countries.includes("GB")) f.push({ key: "eligibility", points: W.ukStudentsOnly, reason: "Solo per studenti di università del Regno Unito" });
    if (el.includes("diritto-lavoro") && needsVisa) f.push({ key: "eligibility", points: W.rightToWork, reason: "Chiede il diritto di lavorare nel paese: con il passaporto UE servirebbe un visto, e non lo sponsorizzano" });
    else if (el.includes("sponsor-visto") && needsVisa) f.push({ key: "eligibility-open", points: W.visaSponsor, reason: "Offre lo sponsor per il visto" });
    if (el.includes("riservato")) f.push({ key: "eligibility", points: W.restricted, reason: "Riservato a un gruppo specifico (es. genere o provenienza): controlla di rientrarci" });
    if (profile.track === "stage") {
      if (el.includes("dal-secondo-anno") && profile.studyYear === 1) f.push({ key: "eligibility", points: W.notFirstYear, reason: "Non aperto a chi è al primo anno" });
      if (el.includes("magistrale") && profile.degreeYears != null && profile.degreeYears <= 3) f.push({ key: "eligibility", points: W.mastersOnly, reason: "Per studenti di magistrale" });
      const years = el.filter((e) => /^laurea-\d{4}$/.test(e)).map((e) => Number(e.slice(7)));
      const grad = graduationYearOf(profile, now);
      if (years.length && grad) {
        if (years.includes(grad)) f.push({ key: "eligibility-open", points: W.gradYearMatch, reason: `Per chi si laurea nel ${grad}: è il tuo anno` });
        else f.push({ key: "eligibility", points: W.gradYearOther, reason: `Per chi si laurea nel ${years.join(" o ")}, tu nel ${grad}` });
      }
    }
    if (job.closesAt && job.closesAt.getTime() < now.getTime() - 86_400_000) {
      f.push({ key: "deadline", points: W.applicationsClosed, reason: `Candidature chiuse il ${job.closesAt.toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" })}` });
    }
  }

  // 11. Experience: the listing's sector and level against what they have done.
  if (profile.experienceSectors.length > 0) {
    const same = profile.experienceSectors.find((s) => s.relation === "same" && sectorHit(s, job, titleT, descT));
    const near = same ? undefined : profile.experienceSectors.find((s) => s.relation === "near" && sectorHit(s, job, titleT, descT) === "title");
    if (same) f.push({ key: "exp-sector", points: W.experienceSameSector, reason: `Stesso settore della tua esperienza (${same.name.toLowerCase()})` });
    else if (near) f.push({ key: "exp-sector", points: W.experienceNearSector, reason: `Settore vicino alla tua esperienza${near.theme ? ` (${near.theme})` : ""}: cambio possibile` });
    else f.push({ key: "exp-sector", points: W.experienceOtherSector, reason: "Settore diverso dalla tua esperienza" });
  }
  const years = profile.person?.years ?? null;
  if (profile.track === "lavoro" && years != null) {
    const level = titleSeniority(job.title);
    if (level === "senior" && years < 3) f.push({ key: "exp-level", points: W.levelTooHigh, reason: "Ruolo di responsabilità: di solito chiede più anni" });
    else if (level === "senior" && years >= 5) f.push({ key: "exp-level", points: W.levelRight, reason: "Livello adatto alla tua esperienza" });
    else if (level === "entry" && years >= 6 && profile.priority !== "alta") f.push({ key: "exp-level", points: profile.priority === "bassa" ? W.levelTooLow * 2 : W.levelTooLow, reason: "Probabilmente sotto il tuo livello" });
  }

  // 12. Requirements written in the listing, against the CV and the timeline.
  if (profile.person) {
    const req = extractRequirements(job.title, job.description);
    if (profile.track === "stage") req.years = null; // students: handled by the year-of-study rules
    const checks = checkRequirements(req, profile.person);
    if (checks.length) {
      let points = 0;
      for (const c of checks) {
        const isYears = /anni di esperienza/.test(c.label);
        if (c.have === "si") points += isYears ? W.reqYearsMet : W.reqMet;
        else if (c.have === "quasi") points += W.reqAlmost;
        else if (c.have === "no") points += isYears ? W.reqYearsMissing : c.label === "Laurea" ? W.reqDegreeMissing : W.reqMissing;
      }
      const met = checks.filter((c) => c.have === "si").length;
      const gap = checks.find((c) => c.have === "no");
      f.push({ key: "req", points, reason: gap && met < checks.length ? `Requisiti: ${met} su ${checks.length} (manca: ${gap.label.toLowerCase()})` : `Requisiti: ${met} su ${checks.length}` });
    }
  }

  // 13. Scam
  if (job.scamFlagCount > 0) f.push({ key: "scam", points: W.scam, reason: "Attenzione: potrebbe essere una truffa" });

  const score = f.reduce((s, x) => s + x.points, 0);
  const { fit, parts } = computeFit(f, profile.weights, profile.track);
  const th = PRIORITY_THRESHOLDS[profile.priority] ?? THRESHOLDS;
  const level: Level = fit >= th.molto ? "molto" : fit >= th.adatta ? "adatta" : "poco";
  return { score, level, reasons: pickReasons(f, level), factors: f, presetMatch, fit, parts };
}

/** Where a sector shows up in an ad: its name as the detected sector or in the title, or only in the text. */
function sectorHit(s: { name: string; keywords: string[] }, job: RankJob, titleT: string[], descT: string[] | null): "title" | "text" | null {
  if (job.sector && fold(job.sector) === fold(s.name)) return "title";
  const all = [s.name, ...s.keywords];
  const terms = all.filter((t) => keyTokens(t).length > 0);
  // Short symbolic terms ("m&a", "fp&a") have no word tokens: match them as written.
  const symbolic = all.filter((t) => /[&+]/.test(t) && t.length <= 6).map((t) => new RegExp(`(^|[^a-z0-9])${escapeRe(fold(t))}([^a-z0-9]|$)`));
  if (terms.some((t) => containsPhrase(titleT, t)) || symbolic.some((re) => re.test(fold(job.title)))) return "title";
  if (descT && (terms.some((t) => containsPhrase(descT, t)) || symbolic.some((re) => re.test(fold(job.description))))) return "text";
  if (job.company && terms.some((t) => containsPhrase(keyTokens(job.company!), t))) return "title";
  return null;
}

/** Same rule as the catalog: equal names, or the chosen name is the start of the ad's company name. */
export function companyNameMatches(jobCompany: string | null, entry: { name: string; aliases: string[] }): boolean {
  const job = normalizeCompany(jobCompany);
  if (!job) return false;
  const jt = job.split(" ");
  return [entry.name, ...entry.aliases].some((n) => {
    const c = normalizeCompany(n);
    if (!c) return false;
    if (c === job) return true;
    const ct = c.split(" ");
    return ct.length <= jt.length && ct.every((w, i) => jt[i] === w) && (ct.length > 1 || c.length >= 4);
  });
}

function pickReasons(f: Factor[], level: Level): string[] {
  const scam = f.find((x) => x.key === "scam");
  const pos = f.filter((x) => x.points > 0).sort((a, b) => b.points - a.points);
  const neg = f.filter((x) => x.points < 0).sort((a, b) => a.points - b.points);
  let picked: Factor[];
  if (scam) picked = [scam, ...pos.slice(0, 1)];
  else if (level === "poco") picked = [...neg.slice(0, 1), ...pos.slice(0, 1)];
  else if (level === "adatta") picked = [...pos.slice(0, 1), ...(neg.length ? neg.slice(0, 1) : pos.slice(1, 2))];
  else picked = pos.slice(0, 2);
  return picked.slice(0, 2).map((x) => x.reason);
}
