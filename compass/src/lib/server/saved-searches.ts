// Saved searches: a person keeps a search from "Offerte" (its address), sees how many offers are new
// for it, and gets an e-mail when new ones arrive (checked after every hourly sweep, at most one
// e-mail an hour with every search's new offers).
import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import type { Transport } from "../mail/transport";
import { filtersFromParams, type SP } from "./offer-filters";
import { listJobs, type JobFilters } from "./jobs";
import { getProfile } from "./profile";
import { jobsByIds, runSearch } from "./search";

export const MAX_SAVED = 20;
/** Alerts at most this often. */
const ALERT_EVERY_MS = 55 * 60_000;

const toSP = (query: string): SP => {
  const sp: SP = {};
  for (const [k, v] of new URLSearchParams(query)) sp[k] = sp[k] === undefined ? v : [...(Array.isArray(sp[k]) ? (sp[k] as string[]) : [sp[k] as string]), v];
  return sp;
};

/** A short name for a search: what was typed, or its filters in words. */
export function labelOf(query: string): string {
  const p = new URLSearchParams(query);
  const q = p.get("q")?.trim();
  if (q) return q.slice(0, 60);
  const bits = [p.get("azienda"), ...p.getAll("tipo"), p.getAll("luogo").filter((x) => x !== "-").map((x) => x.split("|").pop()).join(", ")].filter(Boolean);
  return (bits.join(" · ") || "Tutte le offerte").slice(0, 60);
}

/** Run a saved address for one person: offer ids in order, and how many. `extra` narrows it (e.g. since). */
export async function runAddress(db: DB, userId: number, query: string, extra: Partial<JobFilters>, limit: number, now = new Date()) {
  const profile = await getProfile(db, userId);
  const { filters } = filtersFromParams(toSP(query), profile);
  const f = { ...filters, ...extra };
  if (f.q) {
    const r = await runSearch(db, userId, f.q, f, limit, now);
    return { ids: r.ids, total: r.total };
  }
  const r = await listJobs(db, userId, f, limit, now);
  return { ids: r.jobs.map((j) => j.id), total: r.total };
}

export async function saveSearch(db: DB, userId: number, query: string, label?: string, now = new Date()): Promise<number | null> {
  const mine = await db.select().from(schema.savedSearches).where(eq(schema.savedSearches.userId, userId));
  const same = mine.find((s) => s.query === query);
  if (same) return same.id;
  if (mine.length >= MAX_SAVED) return null;
  const [row] = await db
    .insert(schema.savedSearches)
    .values({ userId, query, label: (label?.trim() || labelOf(query)).slice(0, 60), alert: true, seenAt: now, alertedAt: now })
    .returning({ id: schema.savedSearches.id });
  return row.id;
}

export async function deleteSearch(db: DB, userId: number, id: number) {
  await db.delete(schema.savedSearches).where(and(eq(schema.savedSearches.id, id), eq(schema.savedSearches.userId, userId)));
}

export async function setSearchAlert(db: DB, userId: number, id: number, alert: boolean) {
  await db.update(schema.savedSearches).set({ alert }).where(and(eq(schema.savedSearches.id, id), eq(schema.savedSearches.userId, userId)));
}

/** Opened: its offers count as seen. */
export async function markSearchSeen(db: DB, userId: number, id: number, now = new Date()) {
  await db.update(schema.savedSearches).set({ seenAt: now }).where(and(eq(schema.savedSearches.id, id), eq(schema.savedSearches.userId, userId)));
}

/** A person's saved searches, newest first, each with how many offers arrived since they last opened it. */
export async function listSaved(db: DB, userId: number, now = new Date()) {
  const rows = await db.select().from(schema.savedSearches).where(eq(schema.savedSearches.userId, userId)).orderBy(desc(schema.savedSearches.id));
  const out = [];
  for (const s of rows) out.push({ ...s, fresh: (await runAddress(db, userId, s.query, { since: s.seenAt }, 0, now)).total });
  return out;
}

/**
 * New offers for everyone's saved searches with an alert: one e-mail per person (every search's new
 * offers, at most 5 each), a notification, and the searches marked as alerted. At most once an hour.
 */
export async function runSearchAlerts(db: DB, transportFor: (u: { id: number; mailboxKey: string | null }) => Transport, now = new Date()) {
  const rows = await db.select().from(schema.savedSearches).where(eq(schema.savedSearches.alert, true));
  const byUser = new Map<number, typeof rows>();
  for (const s of rows) if (now.getTime() - s.alertedAt.getTime() >= ALERT_EVERY_MS) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]);
  let sent = 0;
  for (const [userId, searches] of byUser) {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!user?.active) continue;
    const parts: { label: string; id: number; total: number; titles: string[] }[] = [];
    for (const s of searches) {
      const r = await runAddress(db, userId, s.query, { since: s.alertedAt }, 5, now);
      if (r.total) parts.push({ label: s.label, id: s.id, total: r.total, titles: (await jobsByIds(db, userId, r.ids)).map((j) => `${j.title}${j.company ? ` · ${j.company}` : ""}${j.city ? ` · ${j.city}` : ""}`) });
      await db.update(schema.savedSearches).set({ alertedAt: now }).where(eq(schema.savedSearches.id, s.id));
    }
    if (!parts.length) continue;
    const n = parts.reduce((a, p) => a + p.total, 0);
    const subject = n === 1 ? "1 offerta nuova per le tue ricerche" : `${n} offerte nuove per le tue ricerche`;
    const link = (id: number) => `${env.appUrl}/offerte/ricerche/${id}`;
    const text = parts.map((p) => `${p.label}: ${p.total} nuove\n${p.titles.map((t) => `  - ${t}`).join("\n")}\n  ${link(p.id)}`).join("\n\n");
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const html = parts
      .map((p) => `<h3 style="margin:16px 0 4px">${esc(p.label)}: ${p.total} nuove</h3><ul>${p.titles.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p><a href="${link(p.id)}">Vedile su Compass</a></p>`)
      .join("");
    await db.insert(schema.notifications).values({ audience: "user", userId, text: subject, href: `/offerte/ricerche/${parts[0].id}` });
    const to = user.digestEmail || user.email;
    if (to) {
      await transportFor(user).send({ kind: "digest", to, subject, text: `${text}\n\nCompass`, html });
      sent++;
    }
  }
  return { people: byUser.size, sent };
}
