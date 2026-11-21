/**
 * Speed and accessibility data. Real-user data (CrUX, the last 28 days of Chrome users) is used for
 * LCP, INP and CLS whenever Google has it, because it does not move from one run to the next.
 * Otherwise the lab run (Lighthouse, a simulated phone) is used, and the rubric reads it in wide
 * bands so small run-to-run noise rarely changes the points. Page weight and the accessibility
 * score always come from the lab run. A PageSpeed Insights response and a local Lighthouse report
 * (CI) share the same `lighthouseResult` shape, so both go through here.
 */
import type { PerfData } from "./types";

type Metric = { percentile?: number; category?: string };
type Experience = { metrics?: Record<string, Metric>; origin_fallback?: boolean } | undefined;
type Lhr = {
  lighthouseVersion?: string;
  audits?: Record<string, { numericValue?: number }>;
  categories?: Record<string, { score?: number | null }>;
};

export interface PsiLike {
  lighthouseResult?: Lhr;
  loadingExperience?: Experience;
  originLoadingExperience?: Experience;
}

function field(exp: Experience) {
  const m = exp?.metrics;
  const lcp = m?.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  if (lcp == null) return null;
  const cls = m?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  return {
    lcpMs: lcp,
    inpMs: m?.INTERACTION_TO_NEXT_PAINT?.percentile,
    cls: cls == null ? undefined : cls / 100,
  };
}

export function perfFrom(res: PsiLike | null | undefined): PerfData | null {
  if (!res) return null;
  const lhr = res.lighthouseResult;
  const a = lhr?.audits ?? {};
  const lab = {
    lcpMs: a["largest-contentful-paint"]?.numericValue,
    tbtMs: a["total-blocking-time"]?.numericValue,
    cls: a["cumulative-layout-shift"]?.numericValue,
    bytes: a["total-byte-weight"]?.numericValue,
    a11y: lhr?.categories?.accessibility?.score ?? undefined,
  };
  const page = res.loadingExperience?.origin_fallback ? null : field(res.loadingExperience);
  const origin = page ? null : field(res.originLoadingExperience);
  const real = page ?? origin;
  if (!lhr && !real) return null;
  return {
    source: real ? "field" : "lab",
    fieldScope: page ? "url" : origin ? "origin" : undefined,
    lcpMs: real?.lcpMs ?? lab.lcpMs,
    inpMs: real?.inpMs,
    tbtMs: lab.tbtMs,
    cls: real?.cls ?? lab.cls,
    bytes: lab.bytes,
    a11y: lab.a11y,
    lighthouseVersion: lhr?.lighthouseVersion,
  };
}

/** Calls PageSpeed Insights (mobile). The key stays on the server; never in the page. */
export async function runPsi(url: string, key: string | undefined, fetchImpl: typeof fetch = fetch, timeoutMs = 70000): Promise<PsiLike> {
  const q = new URLSearchParams({ url, strategy: "mobile", locale: "it" });
  q.append("category", "performance");
  q.append("category", "accessibility");
  if (key) q.set("key", key);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: ctl.signal });
    if (!r.ok) throw new Error(`PageSpeed Insights ${r.status}`);
    return (await r.json()) as PsiLike;
  } finally {
    clearTimeout(t);
  }
}

/**
 * The few numbers we keep for the day's cache: the same perfFrom() result, nothing else from the
 * PSI answer (no screenshots, no resource lists, no page text).
 */
export function perfCacheable(res: PsiLike): PsiLike {
  const a = res.lighthouseResult?.audits ?? {};
  const pick = (k: string) => (a[k]?.numericValue == null ? undefined : { numericValue: a[k].numericValue });
  const exp = (e: Experience) => {
    if (!e?.metrics) return undefined;
    const m: Record<string, Metric> = {};
    for (const k of ["LARGEST_CONTENTFUL_PAINT_MS", "INTERACTION_TO_NEXT_PAINT", "CUMULATIVE_LAYOUT_SHIFT_SCORE"]) if (e.metrics[k]) m[k] = { percentile: e.metrics[k].percentile };
    return { metrics: m, origin_fallback: e.origin_fallback };
  };
  const audits: Record<string, { numericValue?: number }> = {};
  for (const k of ["largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "total-byte-weight"]) {
    const v = pick(k);
    if (v) audits[k] = v;
  }
  return {
    lighthouseResult: res.lighthouseResult
      ? { lighthouseVersion: res.lighthouseResult.lighthouseVersion, audits, categories: { accessibility: { score: res.lighthouseResult.categories?.accessibility?.score ?? null } } }
      : undefined,
    loadingExperience: exp(res.loadingExperience),
    originLoadingExperience: exp(res.originLoadingExperience),
  };
}
