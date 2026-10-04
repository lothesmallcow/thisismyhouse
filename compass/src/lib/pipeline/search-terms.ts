// What to ask the job APIs and the search API for, per person: job titles for job seekers,
// "stage" + interests (and chosen companies) for students.
import type { Profile } from "../server/profile";
import type { RankPrefs } from "../server/catalog";

export interface SearchPlan {
  /** Keywords for job APIs (Adzuna "what"). */
  apiTerms: string[];
  /** Interests for students (sector words). */
  interests: string[];
  companies: string[];
  city: string;
  radiusKm: number;
}

const shortTerm = (s: { name: string; keywords: string[] }) => s.keywords[0] ?? s.name;

export function searchPlan(p: Profile, prefs: RankPrefs): SearchPlan {
  const city = p.city || (p.track === "stage" ? "Milano" : "Torino");
  const companies = prefs.likedCompanies.map((c) => c.name);
  if (p.track === "stage") {
    const interests = prefs.likedSectors.map(shortTerm).slice(0, 3);
    const apiTerms = interests.length ? interests.map((t) => `stage ${t}`) : ["stage", "internship"];
    return { apiTerms: apiTerms.slice(0, 3), interests, companies, city, radiusKm: p.maxKm || 30 };
  }
  return { apiTerms: p.roles.slice(0, 3), interests: [], companies, city, radiusKm: p.maxKm };
}
