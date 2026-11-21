/**
 * POST /api/score  { url: string, sector?: SectorId }
 * Fetches the page with the SSRF guard, measures speed with PageSpeed Insights, scores the page
 * for every sector and returns the report. Private to whoever asked: nothing is published, and
 * the report itself is not stored. What is stored, in KV for two days: the speed numbers for that
 * URL and day (so a second run the same day gives the same score), never the page's content.
 */
import { analyze, rubric } from "../../src/scorer/analyze";
import { dohResolver, normalizeUrl, ScorerError } from "../../src/scorer/safe-fetch";
import { perfCacheable, runPsi, type PsiLike } from "../../src/scorer/perf";
import type { SectorId } from "../../src/scorer/types";
import { fail, json, rateLimited, sameOrigin, sha256, type Ctx } from "../_lib/runtime";

const SECTORS = new Set(rubric.sectors.map((s) => s.id));

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!sameOrigin(request)) return fail(403, "Richiesta non ammessa.");
  if (await rateLimited(request, env, "score", 12)) return fail(429, "Hai fatto molte analisi nell'ultima ora. Riprova più tardi.");

  let body: { url?: unknown; sector?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Richiesta non valida.");
  }
  const sector = typeof body.sector === "string" && SECTORS.has(body.sector as SectorId) ? (body.sector as SectorId) : undefined;

  try {
    const url = normalizeUrl(String(body.url ?? ""));
    const day = new Date().toISOString().slice(0, 10);
    const key = `psi:${rubric.version}:${day}:${(await sha256(url.toString())).slice(0, 32)}`;

    const psi = async (finalUrl: string): Promise<PsiLike | null> => {
      const hit = env.SCORER_KV ? ((await env.SCORER_KV.get(key, "json")) as PsiLike | null) : null;
      if (hit) return hit;
      const res = await runPsi(finalUrl, env.PSI_KEY);
      if (res && env.SCORER_KV) await env.SCORER_KV.put(key, JSON.stringify(perfCacheable(res)), { expirationTtl: 2 * 86400 });
      return res;
    };

    const result = await analyze(url.toString(), { resolve: dohResolver(), psi, sector });
    return json(result);
  } catch (e) {
    if (e instanceof ScorerError) return fail(e.code === "blocked" || e.code === "url" || e.code === "social" ? 400 : 422, e.message);
    return fail(502, "Non siamo riusciti ad analizzare il sito. Riprova tra qualche minuto.");
  }
};

export const onRequest = () => fail(405, "Usa il modulo della pagina.");
