// What the people using Compass look for, for reading employers' boards on their behalf: the countries
// any of them chose, the words big boards are searched with, and the test an offer on a board nobody
// chose must pass (one of their roles in the title; students: programmes too).
import { homeCountries, type CountryCode } from "../core/geo";
import type { RawJob } from "../core/normalize";
import { roleTerms, titleMatches } from "../core/relevance";
import type { RankContext } from "../server/jobs";
import { isProgrammeTitle } from "./programmes";
import { searchKeywords } from "./search-terms";

export function whatPeopleWant(contexts: RankContext[]): { countries: CountryCode[]; keywords: string[]; relevant: (j: RawJob) => boolean } {
  const countries = [...new Set(contexts.flatMap((c) => homeCountries(c.profile.countries, c.profile.city)))];
  const keywords = [...new Set(contexts.flatMap((c) => searchKeywords(c.profile.roles, c.profile.synonyms, 3)))].slice(0, 8);
  const terms = roleTerms(contexts.flatMap((c) => [...c.profile.roles, ...c.profile.synonyms]));
  const students = contexts.some((c) => c.profile.track === "stage");
  return { countries, keywords, relevant: (j) => titleMatches(j.title, terms) || (students && isProgrammeTitle(j.title)) };
}
