// HTTP helpers for every outbound request: honest User-Agent, timeout, and a distinct error
// for 403/429 so callers stop immediately (good citizenship, brief section 3).
import { userAgent } from "../env";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class BlockedError extends Error {
  constructor(public status: number, public url: string) {
    super(`blocked (${status})`);
  }
}

export class HttpError extends Error {
  constructor(public status: number, public url: string) {
    super(`http ${status}`);
  }
}

export interface RequestOptions {
  timeoutMs?: number;
  /** Retries for network errors, timeouts and 5xx. Never for 403/429 (we stop instead). */
  retries?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function request(fetchImpl: FetchLike, url: string, init: RequestInit = {}, opts: RequestOptions = {}): Promise<Response> {
  const { timeoutMs = 20000, retries = 2, backoffMs = 2000, sleep = defaultSleep } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1)); // 2 s, 4 s
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        ...init,
        headers: { "User-Agent": userAgent(), Accept: "application/json, text/html;q=0.9, */*;q=0.5", ...(init.headers ?? {}) },
        signal: ctrl.signal,
        redirect: init.redirect ?? "follow",
      });
      if (res.status === 403 || res.status === 429) throw new BlockedError(res.status, url);
      if (res.status >= 500 && attempt < retries) {
        lastError = new HttpError(res.status, url);
        continue;
      }
      return res;
    } catch (e) {
      if (e instanceof BlockedError) throw e;
      lastError = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("network error");
}

export async function getJson<T>(fetchImpl: FetchLike, url: string, init: RequestInit = {}, opts: RequestOptions = {}): Promise<T> {
  const res = await request(fetchImpl, url, init, opts);
  if (!res.ok) throw new HttpError(res.status, url);
  return (await res.json()) as T;
}

/** Strip HTML to readable plain text (descriptions from APIs and JSON-LD). */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}
