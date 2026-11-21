/**
 * The whole analysis for one URL: fetch the page safely, run PageSpeed Insights, read the signals,
 * score them for every sector, recommend. Used by the Pages Function, the CLI and the self-test.
 * Scoring all sectors costs a few milliseconds and lets the visitor switch sector without a new fetch.
 */
import rubricJson from "./rubric.json";
import { readPage } from "./page";
import { perfFrom, runPsi, type PsiLike } from "./perf";
import { buildReport, recommend, type Recommendation } from "./score";
import { guessSector, resolveRubric, sectorIds } from "./sectors";
import { safeFetch, type Resolver } from "./safe-fetch";
import type { PageSignals, Report, Rubric, SectorId } from "./types";

export const rubric = rubricJson as unknown as Rubric;
export const SECTORS = rubric.sectors.map((s) => ({ id: s.id, label: s.label }));

export interface Analysis {
  report: Report;
  recommendation: Recommendation;
  page: Pick<PageSignals, "finalUrl" | "title">;
}

export interface FullAnalysis {
  rubricVersion: string;
  /** The sector the page looks like, from its own words. */
  guessed: SectorId;
  /** The sector shown first: the visitor's choice, or the guess. */
  chosen: SectorId;
  page: Pick<PageSignals, "finalUrl" | "title">;
  results: Record<SectorId, { report: Report; recommendation: Recommendation }>;
}

export async function analyze(
  rawUrl: string,
  deps: { resolve: Resolver; psiKey?: string; fetchImpl?: typeof fetch; psi?: (url: string) => Promise<PsiLike | null>; sector?: SectorId },
): Promise<FullAnalysis> {
  const fetched = await safeFetch(rawUrl, { resolve: deps.resolve, fetchImpl: deps.fetchImpl });
  // Speed is measured on the final URL (after redirects); its failure never blocks the report.
  const psi = await (deps.psi ? deps.psi(fetched.finalUrl) : runPsi(fetched.finalUrl, deps.psiKey, deps.fetchImpl)).catch(() => null);
  return fromPartsAll(fetched.finalUrl, fetched.html, psi, { sector: deps.sector });
}

/** Scores a page for every sector from its HTML and a PSI or Lighthouse result: no network. */
export function fromPartsAll(finalUrl: string, html: string, psi: PsiLike | null, opts: { sector?: SectorId; measuredAt?: string } = {}): FullAnalysis {
  const page = readPage(html, finalUrl);
  const perf = perfFrom(psi);
  const measuredAt = opts.measuredAt ?? new Date().toISOString();
  const guessed = guessSector(rubric, page);
  const results = {} as FullAnalysis["results"];
  for (const id of sectorIds(rubric)) {
    const report = buildReport(resolveRubric(rubric, id), finalUrl, page, perf, measuredAt);
    results[id] = { report, recommendation: recommend(report, page) };
  }
  const chosen = opts.sector && opts.sector in results ? opts.sector : guessed;
  return { rubricVersion: rubric.version, guessed, chosen, page: { finalUrl, title: page.title }, results };
}

/** One sector only (the guessed one unless given). */
export function fromParts(finalUrl: string, html: string, psi: PsiLike | null, opts: { sector?: SectorId; measuredAt?: string } = {}): Analysis & { guessed: SectorId } {
  const page = readPage(html, finalUrl);
  const guessed = guessSector(rubric, page);
  const report = buildReport(resolveRubric(rubric, opts.sector ?? guessed), finalUrl, page, perfFrom(psi), opts.measuredAt);
  return { report, recommendation: recommend(report, page), page: { finalUrl, title: page.title }, guessed };
}
