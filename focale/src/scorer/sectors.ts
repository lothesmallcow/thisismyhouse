/**
 * Sector profiles: resolve one against the check library (points, wording, category weights),
 * and guess the sector of a page from its words and structured data when the visitor did not pick one.
 */
import type { PageSignals, Rubric, RubricCheck, SectorId, SectorRubric } from "./types";

export function sectorIds(rubric: Rubric): SectorId[] {
  return rubric.sectors.map((s) => s.id);
}

export function resolveRubric(rubric: Rubric, sectorId: SectorId): SectorRubric {
  const sector = rubric.sectors.find((s) => s.id === sectorId);
  if (!sector) throw new Error(`Unknown sector ${sectorId}`);
  const points: Record<string, number> = { ...rubric.common, ...sector.points };
  const checks: RubricCheck[] = rubric.checks
    .filter((c) => c.id in points && (points[c.id] > 0 || c.flag))
    .map((c) => ({ ...c, ...(sector.texts[c.id] || {}), points: c.flag ? 0 : points[c.id] }));
  const categories = rubric.categories.map((cat) => ({
    id: cat.id,
    label: cat.id === "conversion" ? sector.conversionLabel : cat.label,
    weight: checks.filter((c) => c.category === cat.id).reduce((t, c) => t + c.points, 0),
  }));
  return { version: rubric.version, sector, categories, checks };
}

/**
 * Picks the sector whose words appear most in the title, the main heading, the description and the
 * first lines, plus a strong bonus for a matching schema.org type. No match means "altro".
 */
export function guessSector(rubric: Rubric, page: PageSignals): SectorId {
  const top = `${page.title} ${page.h1.join(" ")} ${page.description} ${page.lead}`;
  let best: { id: SectorId; score: number } = { id: "altro", score: 0 };
  for (const s of rubric.sectors) {
    if (!s.vocab.activity) continue;
    const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(${s.vocab.activity})(?![\\p{L}])`, "giu");
    const hits = new Set([...top.matchAll(re)].map((m) => m[1].toLowerCase())).size;
    const schema = s.vocab.schema ? new RegExp(`^(${s.vocab.schema})$`, "i") : null;
    const typed = schema && page.jsonLdTypes.some((t) => schema.test(t)) ? 5 : 0;
    const score = hits * 2 + typed;
    if (score > best.score) best = { id: s.id, score };
  }
  return best.id;
}
