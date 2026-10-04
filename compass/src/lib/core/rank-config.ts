// Every ranking weight and threshold in one place. Positive = more suitable.
// Thresholds: a typical good match (role +40, nearby +20) clears "Molto adatta" on its own;
// a similar role nearby (+20 +10) lands in "Adatta"; anything with a big minus (far away,
// excluded, scam) falls to "Poco adatta".

export const RANK_WEIGHTS = {
  roleExact: 40, // a target role or approved synonym appears in the title
  roleSimilar: 20, // a meaningful word of a target role appears in the title
  roleInDescription: 8, // target role mentioned only in the text
  roleMismatch: -10,
  remoteAccepted: 18, // fully remote and she accepts remote work
  distanceNear: 20, // within half her radius (min 3 km)
  distanceOk: 10, // within her radius
  distanceFar: -25, // beyond her radius
  hybridBonus: 5,
  salaryAtLeastFloor: 10, // unknown salary = 0 (neutral)
  salaryBelowFloor: -20,
  hoursMatch: 10,
  hoursMismatch: -15,
  contractPermanent: 8,
  contractAccepted: 5,
  contractNotAccepted: -15,
  recentDays: 3,
  recent: 8,
  oldDays: 30,
  old: -10,
  languageKnown: 3,
  languageMissingFluent: -15,
  languageMissing: -8,
  avoidKeyword: -40,
  avoidRoleWord: -30, // learned from "Non mi interessa: non è il lavoro che cerco"
  avoidCompany: -100, // always ends in "Poco adatta"
  avoidSector: -30,
  scam: -40,
  // Choices from the catalog ("Mi interessa")
  companyLiked: 25, // a company they chose, for a position that fits
  companyLikedOtherRole: 6, // a company they chose, but the listing's position is not what they want
  sectorLiked: 15, // a sector they chose, in the title or the detected sector
  sectorLikedText: 6, // a sector they chose, only in the text
  outsideInterests: -12, // students who chose sectors: an ad outside all of them
  // Students ("stage" track)
  stageMatch: 25, // it is an internship
  programmeMatch: 20, // insight day / spring week
  notAnInternship: -35, // a regular job
  notClearlyInternship: -12, // the ad never says internship (often a regular job)
  degreeRequired: -20, // asks for a degree already completed
  finalYearOnly: -12, // for students about to graduate
  penultimateOnly: -10, // for the penultimate year, and they are earlier
  firstYearWelcome: 10, // explicitly open to first-year students
  experienceRequired: -20, // asks for years of experience
  unpaid: -15, // unpaid, and they asked for paid only
  paid: 3,
  extraPlaceMatch: 18, // in one of the other cities they chose (e.g. Londra)
  regionMatch: 8, // in one of the regions they chose (e.g. Lombardia), farther than their radius: OK, not preferred
  outsideCountries: -25, // in a country they did not choose (and not remote)
  // Students, by year of study (see core/career-stage.ts)
  programmeFirstYears: 32, // spring week / insight day: the best fit in the first years
  programmeLate: 5, // programmes are mostly for earlier years
  stageFirstYears: 18, // internships are fine, but programmes come first
  summerPenultimate: 8, // the summer internship of the penultimate year
  summerAnalystEarly: -8, // "Summer Analyst" usually recruits penultimate-year students
  entryJobFinalYear: -5, // graduate / junior roles: fine in the final year
  seniorityTooHigh: -30, // Associate, Senior, Manager... for a student
  degreeRequiredFinalYear: -5, // final year: graduating soon
  finalYearWelcome: 10, // "for final-year students", and they are
  // Job seekers ("lavoro" track)
  programmeForStudents: -30, // a student programme in a job search
  // Experience (from the timeline)
  experienceSameSector: 18, // the listing is in the sector they worked in
  experienceNearSector: 8, // a sector that shares a theme with it (fashion → watches: "lusso")
  experienceOtherSector: -6, // something else: a career change, possible but harder
  levelRight: 8, // a manager role and 5+ years
  levelTooHigh: -12, // a manager role with under 3 years
  levelTooLow: -8, // a junior role with 6+ years
  // Requirements written in the listing (core/requirements.ts)
  reqMet: 4,
  reqYearsMet: 8,
  reqAlmost: -3,
  reqMissing: -6,
  reqYearsMissing: -15,
  reqDegreeMissing: -10,
} as const;

/** Levels from the fit score out of 100 (core/fit.ts). */
export const THRESHOLDS = { molto: 70, adatta: 52 } as const;
/** Job priority (Profilo → Punteggio, questionnaire): in a hurry, more offers count as good; with time, only the best. */
export const PRIORITY_THRESHOLDS = { alta: { molto: 64, adatta: 45 }, media: THRESHOLDS, bassa: { molto: 76, adatta: 60 } } as const;
