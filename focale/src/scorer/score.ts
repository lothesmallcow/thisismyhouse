/**
 * Turns check results into the report: total, categories, the five fixes worth the most points,
 * the flags for a professional, and the package that fits the gaps (with the reason shown).
 */
import type { PageSignals, PerfData, Report, SectorRubric } from "./types";
import { runChecks } from "./checks";

export function buildReport(rubric: SectorRubric, url: string, page: PageSignals, perf: PerfData | null, measuredAt = new Date().toISOString()): Report {
  const rule = (id: string) => rubric.checks.find((r) => r.id === id)!;
  const checks = runChecks(rubric, page, perf).map((c) => ({ ...c, title: rule(c.id).title }));
  const scored = checks.filter((c) => !rule(c.id).flag);
  const measured = scored.filter((c) => c.status !== "unmeasured");
  const earned = measured.reduce((t, c) => t + c.earned, 0);
  const measuredMax = measured.reduce((t, c) => t + c.max, 0);
  const partial = measured.length < scored.length;
  const total = measuredMax ? Math.round(partial ? (earned / measuredMax) * 100 : earned) : 0;

  const categories = rubric.categories
    .filter((cat) => cat.weight > 0)
    .map((cat) => {
      const mine = scored.filter((c) => c.category === cat.id);
      const m = mine.filter((c) => c.status !== "unmeasured");
      return {
        id: cat.id,
        label: cat.label,
        earned: Math.round(m.reduce((t, c) => t + c.earned, 0) * 10) / 10,
        max: m.reduce((t, c) => t + c.max, 0),
        measured: m.length === mine.length,
      };
    });

  // Fixes ranked by points to gain; ties by the category's weight, then rubric order.
  const weight = (id: string) => rubric.categories.find((c) => c.id === rule(id).category)?.weight ?? 0;
  const fixes = measured
    .filter((c) => c.earned < c.max)
    .map((c) => ({ c, gain: Math.round((c.max - c.earned) * 10) / 10 }))
    .sort((a, b) => b.gain - a.gain || weight(b.c.id) - weight(a.c.id))
    .slice(0, 5)
    .map(({ c, gain }) => {
      const r = rule(c.id);
      return { id: c.id, title: r.title, why: r.why, fix: r.fix, found: c.found, gain };
    });

  const flags = checks
    .filter((c) => c.status === "flag-ok" || c.status === "flag-warn")
    .map((c) => ({ id: c.id, title: rule(c.id).title, why: rule(c.id).why, status: c.status as "flag-ok" | "flag-warn", found: c.found }));

  return {
    rubricVersion: rubric.version,
    sector: rubric.sector.id,
    sectorLabel: rubric.sector.label,
    url,
    total,
    partial,
    categories,
    checks,
    fixes,
    flags,
    perfSource: perf ? perf.source : "none",
    measuredAt,
  };
}

export interface Recommendation {
  packageId: "essenziale" | "completo" | "su-misura";
  reason: string;
}

/**
 * Good-better-best, decided only from what was found: a site already in more languages needs
 * Su misura (the only package with languages); a site that already scores 75 or more needs only
 * Essenziale; everything else Completo, with the two categories that lose the most points named.
 */
export function recommend(report: Report, page: PageSignals): Recommendation {
  if (page.multilingual) return { packageId: "su-misura", reason: "Il tuo sito è in più lingue: serve il pacchetto che le comprende." };
  const missing = 100 - report.total;
  if (report.total >= 75) return { packageId: "essenziale", reason: `Le basi ci sono: mancano ${missing} punti, che un sito più veloce e chiaro può recuperare.` };
  const worst = [...report.categories]
    .filter((c) => c.max > 0)
    .map((c) => ({ c, lost: c.max - c.earned }))
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 2)
    .map(({ c }) => c.label.toLowerCase());
  const languages = report.checks.find((c) => c.id === "info.languages" && c.status !== "pass");
  const extra = languages ? " Se vuoi anche l'inglese, le lingue sono nel Su misura." : "";
  return { packageId: "completo", reason: `Mancano ${missing} punti, soprattutto in ${worst.join(" e ")}: è quello che il Completo sistema.${extra}` };
}
