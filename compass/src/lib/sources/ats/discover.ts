// Finding a company's public job board on its own: the documented feeds of Greenhouse,
// SmartRecruiters and Workable, tried with the slugs a company name usually becomes. A board is
// accepted only when the name it publishes matches the company (no guessing from a slug alone).
// A few requests per company, done once a month at most (catalog_companies.ats_checked_at).
import { fold } from "../../core/text";
import { getJson, type FetchLike } from "../http";
import type { AtsType } from "./index";

const LEGAL = new Set("spa s p a srl s r l sapa snc sas group gruppo holding holdings italia italy ltd limited plc llp gmbh ag se sa sarl sas nv bv inc corp co the".split(" "));

/** The words that make the name ("Bending Spoons S.p.A." → ["bending", "spoons"]). */
export function nameWords(name: string): string[] {
  const words = fold(name).replace(/&/g, " and ").split(/[^a-z0-9]+/).filter(Boolean);
  const core = words.filter((w) => !LEGAL.has(w));
  return core.length ? core : words;
}

/** "Bending Spoons S.p.A." → ["bendingspoons", "bending-spoons"]. */
export function slugCandidates(name: string): string[] {
  const w = nameWords(name);
  if (!w.length) return [];
  return [...new Set([w.join(""), w.join("-"), w.length > 1 && w[0].length >= 5 ? w[0] : ""].filter((s) => s.length >= 3))];
}

/** Does the name a board publishes belong to this company? Every core word of the shorter name is in the longer one. */
export function sameCompany(a: string, b: string): boolean {
  const x = nameWords(a).join(" ");
  const y = nameWords(b).join(" ");
  if (!x || !y) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.split(" ").every((w) => new RegExp(`\\b${w}\\b`).test(long)) || short.replace(/ /g, "") === long.replace(/ /g, "");
}

type Probe = (fetchImpl: FetchLike, slug: string) => Promise<string | null>;
const quick = { timeoutMs: 6000, retries: 0 };

const PROBES: [AtsType, Probe][] = [
  ["greenhouse", async (f, s) => (await getJson<{ name?: string }>(f, `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(s)}`, {}, quick)).name ?? null],
  [
    "smartrecruiters",
    async (f, s) => {
      const d = await getJson<{ content?: { company?: { name?: string } }[] }>(f, `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(s)}/postings?limit=1`, {}, quick);
      return d.content?.[0]?.company?.name ?? null; // no open posting: nothing to verify, nothing to read
    },
  ],
  ["workable", async (f, s) => (await getJson<{ name?: string }>(f, `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(s)}`, {}, quick)).name ?? null],
];

/** The company's board, if one of the slugs leads to a board with its name; null otherwise. */
export async function discoverAts(fetchImpl: FetchLike, company: string): Promise<{ ats: AtsType; slug: string } | null> {
  for (const slug of slugCandidates(company)) {
    for (const [ats, probe] of PROBES) {
      try {
        const published = await probe(fetchImpl, slug);
        if (published && sameCompany(published, company)) return { ats, slug };
      } catch {
        continue; // 404 (no board under that slug), 403/429 (that host said stop) or network trouble
      }
    }
  }
  return null;
}
