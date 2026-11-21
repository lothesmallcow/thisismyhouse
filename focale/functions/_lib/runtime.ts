/**
 * Small helpers shared by the Pages Functions: the bindings we use, JSON responses, the same-origin
 * check, and a per-IP rate limit. Types are declared here (no @cloudflare/workers-types dependency).
 *
 * Bindings (Cloudflare Pages > Settings > Functions), all optional:
 * - SCORER_KV: a KV namespace. Holds the day's speed numbers per URL (no page content), rate-limit
 *   counters (hashed IP, 1 hour) and the leads (URL, score, email, consent record).
 * - PSI_KEY: a PageSpeed Insights API key (secret). Without it Google answers 429 quickly and the
 *   report comes out "partial" (no speed).
 * - WEB3FORMS_KEY: optional, to email Lorenzo when a lead arrives.
 * Without KV the limit falls back to memory (per Worker instance: weaker) and leads cannot be saved.
 */

export interface KV {
  get(key: string, type: "json"): Promise<unknown>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  SCORER_KV?: KV;
  PSI_KEY?: string;
  WEB3FORMS_KEY?: string;
}

export interface Ctx {
  request: Request;
  env: Env;
  waitUntil?: (p: Promise<unknown>) => void;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });

export const fail = (status: number, error: string, code?: string) => json(code ? { error, code } : { error }, status);

/** Only our own pages may call the API: a browser always sends Origin on a POST. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const memory = new Map<string, { n: number; until: number }>();

/**
 * At most `max` requests per hour per IP for this bucket. The IP is hashed before it is used as a
 * key and the counter expires after an hour: we keep no list of visitors.
 */
export async function rateLimited(request: Request, env: Env, bucket: string, max: number): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${bucket}:${hour}:${(await sha256(`${ip}|${bucket}`)).slice(0, 24)}`;
  if (env.SCORER_KV) {
    const n = Number((await env.SCORER_KV.get(key)) || 0);
    if (n >= max) return true;
    await env.SCORER_KV.put(key, String(n + 1), { expirationTtl: 3700 });
    return false;
  }
  const now = Date.now();
  const m = memory.get(key);
  if (!m || m.until < now) {
    memory.set(key, { n: 1, until: now + 3_600_000 });
    return false;
  }
  m.n += 1;
  return m.n > max;
}
