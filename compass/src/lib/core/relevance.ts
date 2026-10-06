// Is an offer about what someone looks for? Used where Compass reads a whole employer board or the
// results of a broad search: only offers whose title carries one of the searched roles (in any of its
// names) are kept, so a board of 3,000 openings brings the 5 that matter, not the rest.
import { keyTokens } from "./text";

/** A role as the words that must all be in a title ("Sales manager" → ["sales", "manager"]). */
export function roleTerms(roles: string[]): string[][] {
  const out = new Map<string, string[]>();
  for (const r of roles) {
    const words = keyTokens(r.split("/")[0]).filter((w) => w.length >= 3 || /^(?:hr|it|pr|ux|ui|qa|m&a)$/.test(w));
    if (words.length) out.set(words.join(" "), words);
  }
  return [...out.values()];
}

/** The title carries every word of at least one role (in any order). */
export function titleMatches(title: string, terms: string[][]): boolean {
  if (!terms.length) return true;
  const t = new Set(keyTokens(title));
  return terms.some((words) => words.every((w) => t.has(w)));
}
