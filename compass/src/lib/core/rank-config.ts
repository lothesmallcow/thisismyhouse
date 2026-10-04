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
} as const;

export const THRESHOLDS = { molto: 45, adatta: 15 } as const;
