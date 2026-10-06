// Deleting data, per person.
//  - deleteAllMyData: "Cancella tutti i miei dati". Removes everything about one person in one
//    transaction and keeps their account (so they can sign in and start again).
//  - deleteAccount: the admin removes a person entirely.
// Kept on purpose: shared jobs found by APIs and sites (other people may see them), the admin's
// lists (watchlist, W2 sites, blocklist, settings) and the processed Message-IDs (so the next run
// does not re-import the same e-mails).
import { and, eq, inArray, isNull, notExists, sql } from "drizzle-orm";
import { templatesFor } from "../core/templates";
import type { DB } from "../db";
import { schema } from "../db";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

async function wipe(tx: Tx, userId: number): Promise<void> {
  // Their connected Gmail: the stored access goes too (Google forgets it within days; Scollega revokes it at once).
  await tx.delete(schema.mailConnections).where(eq(schema.mailConnections.userId, userId));
  await tx.delete(schema.replies).where(eq(schema.replies.userId, userId));
  await tx.delete(schema.sendLog).where(eq(schema.sendLog.userId, userId));
  await tx.delete(schema.applications).where(eq(schema.applications.userId, userId));
  await tx.delete(schema.cvs).where(eq(schema.cvs.userId, userId));
  await tx.delete(schema.spontaneousCompanies).where(eq(schema.spontaneousCompanies.userId, userId));
  await tx.delete(schema.rankAdjustments).where(eq(schema.rankAdjustments.userId, userId));
  await tx.delete(schema.outbox).where(eq(schema.outbox.userId, userId));
  await tx.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
  await tx.delete(schema.userPrefs).where(eq(schema.userPrefs.userId, userId));
  await tx.delete(schema.experiences).where(eq(schema.experiences.userId, userId));
  await tx.delete(schema.folderItems).where(eq(schema.folderItems.userId, userId));
  await tx.delete(schema.folders).where(eq(schema.folders.userId, userId));
  await tx.delete(schema.userJobs).where(eq(schema.userJobs.userId, userId));
  await tx.delete(schema.dismissedJobs).where(eq(schema.dismissedJobs.userId, userId));
  // Their private sources (own alerts, manual additions), then jobs nobody can see any more.
  await tx.delete(schema.jobSources).where(eq(schema.jobSources.userId, userId));
  const orphans = tx
    .select({ id: schema.jobs.id })
    .from(schema.jobs)
    .where(notExists(tx.select({ one: sql`1` }).from(schema.jobSources).where(eq(schema.jobSources.jobId, schema.jobs.id))));
  await tx.delete(schema.jobs).where(inArray(schema.jobs.id, orphans));
  // "Altro" entries they added and nobody else uses.
  const unused = (kind: "sector" | "company", id: typeof schema.catalogSectors.id | typeof schema.catalogCompanies.id) =>
    notExists(tx.select({ one: sql`1` }).from(schema.userPrefs).where(and(eq(schema.userPrefs.kind, kind), eq(schema.userPrefs.refId, id))));
  await tx.delete(schema.catalogCompanies).where(and(eq(schema.catalogCompanies.createdByUserId, userId), eq(schema.catalogCompanies.shared, false), unused("company", schema.catalogCompanies.id)));
  await tx.delete(schema.catalogSectors).where(and(eq(schema.catalogSectors.createdByUserId, userId), eq(schema.catalogSectors.shared, false), unused("sector", schema.catalogSectors.id)));
  await tx.update(schema.catalogSectors).set({ createdByUserId: null }).where(eq(schema.catalogSectors.createdByUserId, userId));
  await tx.update(schema.catalogCompanies).set({ createdByUserId: null }).where(eq(schema.catalogCompanies.createdByUserId, userId));
  await tx.delete(schema.templates).where(eq(schema.templates.userId, userId));
  // Everything kept per person in settings: their own settings, Collega le fonti progress, the alerts
  // they marked, Gmail's forwarding code, their last web scraping and its result.
  const keys = ["user:", "collega_", "alerts_done_", "forwarding_", "quick_search_", "quick_search_result_"].map((k) => `${k}${userId}`);
  await tx.delete(schema.settings).where(inArray(schema.settings.key, keys));
}

export async function deleteAllMyData(db: DB, userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const old = await tx.query.profile.findFirst({ where: eq(schema.profile.userId, userId) });
    const track = old?.track ?? "lavoro";
    await wipe(tx, userId);
    // Letter templates may contain their name or phone after editing: back to the defaults.
    await tx.insert(schema.templates).values(templatesFor(track).map((t, i) => ({ ...t, userId, isDefault: i === 0 || t.kind === "spontaneous" })));
    await tx.delete(schema.profile).where(eq(schema.profile.userId, userId));
    await tx.insert(schema.profile).values({ userId, track });
  });
}

export async function deleteAccount(db: DB, userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await wipe(tx, userId);
    await tx.delete(schema.profile).where(eq(schema.profile.userId, userId));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await tx.update(schema.invites).set({ usedByUserId: null }).where(eq(schema.invites.usedByUserId, userId));
    await tx.delete(schema.users).where(and(eq(schema.users.id, userId), eq(schema.users.role, "user")));
  });
}

/** Jobs with no source left (kept for tests and the admin). */
export async function countOrphanJobs(db: DB): Promise<number> {
  const rows = await db.select({ id: schema.jobs.id }).from(schema.jobs).leftJoin(schema.jobSources, eq(schema.jobSources.jobId, schema.jobs.id)).where(isNull(schema.jobSources.id));
  return rows.length;
}
