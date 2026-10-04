// Per-source health: last success, items found, parse failures, blocks. A broken source
// never breaks the others, and the admin is alerted when a parser starts failing.
import { eq } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { BlockedError } from "../sources/http";
import { romeParts, romeToUtc } from "../core/time";
import { notifyAdmin } from "./notify";

export interface SourceOutcome {
  items: number;
  failures: number;
  /** A known template produced nothing: alert even without an exception. */
  templateBroken?: boolean;
}

/** Errors are stored without personal data: no e-mail addresses, no query strings. */
export function sanitizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[e-mail]")
    .replace(/(https?:\/\/[^\s?]+)\?\S*/g, "$1?…")
    .replace(/(app_key|api_key|key|token|password)=\S+/gi, "$1=…")
    .slice(0, 200);
}

function endOfRomeDay(now: Date): Date {
  const p = romeParts(now);
  return new Date(romeToUtc(p.year, p.month, p.day, 23, 59).getTime());
}

export async function isPaused(db: DB, source: string, now = new Date()): Promise<boolean> {
  const h = await db.query.sourceHealth.findFirst({ where: eq(schema.sourceHealth.source, source) });
  return Boolean(h?.pausedUntil && h.pausedUntil > now);
}

export async function runWithHealth(db: DB, source: string, fn: () => Promise<SourceOutcome>, now = new Date()): Promise<SourceOutcome | null> {
  const prev = await db.query.sourceHealth.findFirst({ where: eq(schema.sourceHealth.source, source) });
  if (prev?.pausedUntil && prev.pausedUntil > now) return null;
  const base = { source, lastRunAt: now };
  try {
    const out = await fn();
    const failed = out.templateBroken || (out.items === 0 && out.failures > 0);
    const consecutive = failed ? (prev?.consecutiveFailures ?? 0) + 1 : 0;
    const row = {
      ...base,
      lastSuccessAt: failed ? (prev?.lastSuccessAt ?? null) : now,
      itemsFound: out.items,
      totalFound: (prev?.totalFound ?? 0) + out.items,
      parseFailures: out.failures,
      consecutiveFailures: consecutive,
      lastError: failed ? "il formato delle e-mail sembra cambiato (nessuna offerta letta)" : null,
    };
    await db.insert(schema.sourceHealth).values(row).onConflictDoUpdate({ target: schema.sourceHealth.source, set: row });
    if (out.templateBroken || (out.failures > 0 && out.failures >= out.items)) {
      await notifyAdmin(db, `Fonte "${source}": il parser non riesce più a leggere le offerte (${out.failures} errori). Serve un controllo.`, "/admin/fonti");
    }
    return out;
  } catch (e) {
    const blocked = e instanceof BlockedError;
    const consecutive = (prev?.consecutiveFailures ?? 0) + 1;
    const row = {
      ...base,
      itemsFound: 0,
      parseFailures: 0,
      consecutiveFailures: consecutive,
      blocks: (prev?.blocks ?? 0) + (blocked ? 1 : 0),
      lastError: blocked ? `bloccato dal sito (${(e as BlockedError).status}): fermo fino a domani` : sanitizeError(e),
      pausedUntil: blocked ? endOfRomeDay(now) : null,
    };
    await db.insert(schema.sourceHealth).values(row).onConflictDoUpdate({ target: schema.sourceHealth.source, set: row });
    if (blocked || consecutive === 3) {
      await notifyAdmin(db, `Fonte "${source}": ${row.lastError}.`, "/admin/fonti");
    }
    return null;
  }
}
