// Polite fetcher for W2 (approved sites only): robots.txt respected, at most one request
// every 5 seconds per domain (or the site's Crawl-delay if longer), conditional GETs with a
// cache, and a hard stop on 403/429.
import { eq } from "drizzle-orm";
import type { DB } from "../../db";
import { schema } from "../../db";
import { BlockedError, HttpError, request, type FetchLike } from "../http";
import { isAllowed, parseRobots, type RobotsRules } from "./robots";

export class RobotsDisallowed extends Error {
  constructor(public url: string) {
    super("disallowed by robots.txt");
  }
}

export interface PoliteOptions {
  minIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export class PoliteFetcher {
  private robots = new Map<string, RobotsRules>();
  private last = new Map<string, number>();
  private blocked = new Set<string>();
  private minInterval: number;
  private sleep: (ms: number) => Promise<void>;
  private now: () => number;

  constructor(private db: DB, private fetchImpl: FetchLike, opts: PoliteOptions = {}) {
    this.minInterval = opts.minIntervalMs ?? 5000;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = opts.now ?? (() => Date.now());
  }

  isBlocked(host: string): boolean {
    return this.blocked.has(host);
  }

  private async wait(host: string, delayMs: number) {
    const prev = this.last.get(host);
    if (prev != null) {
      const gap = this.now() - prev;
      if (gap < delayMs) await this.sleep(delayMs - gap);
    }
    this.last.set(host, this.now());
  }

  private async rules(origin: string, host: string): Promise<RobotsRules> {
    const cached = this.robots.get(origin);
    if (cached) return cached;
    await this.wait(host, this.minInterval);
    let rules: RobotsRules = { allow: [], disallow: [], crawlDelay: null };
    try {
      const res = await request(this.fetchImpl, `${origin}/robots.txt`, { headers: { Accept: "text/plain" } });
      if (res.ok) rules = parseRobots(await res.text());
      else if (res.status >= 500) rules = { allow: [], disallow: ["/"], crawlDelay: null }; // server error: assume disallowed
    } catch (e) {
      if (e instanceof BlockedError) {
        this.blocked.add(host);
        throw e;
      }
      rules = { allow: [], disallow: ["/"], crawlDelay: null }; // unreachable robots: be safe
    }
    this.robots.set(origin, rules);
    return rules;
  }

  /** GET a page as text. Returns null when unchanged since last time (304). */
  async get(url: string): Promise<{ body: string; fromCache: boolean }> {
    const u = new URL(url);
    if (this.blocked.has(u.host)) throw new BlockedError(0, url);
    const rules = await this.rules(u.origin, u.host);
    if (!isAllowed(rules, u.pathname + u.search)) throw new RobotsDisallowed(url);
    await this.wait(u.host, Math.max(this.minInterval, (rules.crawlDelay ?? 0) * 1000));

    const cached = await this.db.query.httpCache.findFirst({ where: eq(schema.httpCache.url, url) });
    const headers: Record<string, string> = { Accept: "text/html,application/xhtml+xml" };
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;
    let res: Response;
    try {
      res = await request(this.fetchImpl, url, { headers });
    } catch (e) {
      if (e instanceof BlockedError) this.blocked.add(u.host);
      throw e;
    }
    if (res.status === 304 && cached?.body != null) return { body: cached.body, fromCache: true };
    if (!res.ok) throw new HttpError(res.status, url);
    const body = await res.text();
    const row = { url, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified"), body, status: res.status, fetchedAt: new Date() };
    await this.db.insert(schema.httpCache).values(row).onConflictDoUpdate({ target: schema.httpCache.url, set: row });
    return { body, fromCache: false };
  }
}
