// Named folders for saved offers ("Candidarsi presto", "Da tenere d'occhio"...). Each person has their
// own; a few starter folders are created once, then renamed, deleted or added to freely.
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";
import { canSee, type Job } from "./jobs";
import { getUserSettings, updateUserSettings } from "./settings";

export const STARTER_FOLDERS = ["Candidarsi presto", "Da tenere d'occhio", "Per cambiare settore"];
export type Folder = typeof schema.folders.$inferSelect & { count: number };

const clean = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 60);

export async function listFolders(db: DB, userId: number): Promise<Folder[]> {
  const s = await getUserSettings(db, userId);
  if (!s.foldersReady) {
    const have = await db.select({ id: schema.folders.id }).from(schema.folders).where(eq(schema.folders.userId, userId)).limit(1);
    if (have.length === 0) await db.insert(schema.folders).values(STARTER_FOLDERS.map((name, position) => ({ userId, name, position })));
    await updateUserSettings(db, userId, { foldersReady: true });
  }
  const count = sql<number>`(select count(*) from folder_items i where i.folder_id = ${schema.folders.id})`;
  const rows = await db.select({ f: schema.folders, count }).from(schema.folders).where(eq(schema.folders.userId, userId)).orderBy(asc(schema.folders.position), asc(schema.folders.id));
  return rows.map((r) => ({ ...r.f, count: Number(r.count) }));
}

async function own(db: DB, userId: number, folderId: number) {
  return db.query.folders.findFirst({ where: and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId)) });
}

export async function createFolder(db: DB, userId: number, name: string): Promise<number | null> {
  const n = clean(name);
  if (n.length < 1) return null;
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${schema.folders.position}), -1)` }).from(schema.folders).where(eq(schema.folders.userId, userId));
  const [row] = await db.insert(schema.folders).values({ userId, name: n, position: Number(max) + 1 }).returning();
  return row.id;
}

export async function renameFolder(db: DB, userId: number, folderId: number, name: string): Promise<boolean> {
  const n = clean(name);
  if (!n || !(await own(db, userId, folderId))) return false;
  await db.update(schema.folders).set({ name: n }).where(eq(schema.folders.id, folderId));
  return true;
}

export async function deleteFolder(db: DB, userId: number, folderId: number): Promise<boolean> {
  if (!(await own(db, userId, folderId))) return false;
  await db.delete(schema.folders).where(eq(schema.folders.id, folderId)); // items go with it
  return true;
}

/** Save an offer in a folder (only offers this person can see, only their own folders). */
export async function addToFolder(db: DB, userId: number, folderId: number, jobId: number, note?: string): Promise<boolean> {
  if (!(await own(db, userId, folderId)) || !(await canSee(db, userId, jobId))) return false;
  await db
    .insert(schema.folderItems)
    .values({ folderId, jobId, userId, note: note?.slice(0, 200) || null })
    .onConflictDoNothing();
  return true;
}

export async function removeFromFolder(db: DB, userId: number, folderId: number, jobId: number): Promise<void> {
  await db.delete(schema.folderItems).where(and(eq(schema.folderItems.folderId, folderId), eq(schema.folderItems.jobId, jobId), eq(schema.folderItems.userId, userId)));
}

/** The folders an offer is in. */
export async function foldersOf(db: DB, userId: number, jobId: number): Promise<number[]> {
  const rows = await db.select({ id: schema.folderItems.folderId }).from(schema.folderItems).where(and(eq(schema.folderItems.userId, userId), eq(schema.folderItems.jobId, jobId)));
  return rows.map((r) => r.id);
}

/** The offers in one folder, newest first, with the person's score. */
export async function folderJobs(db: DB, userId: number, folderId: number): Promise<{ folder: typeof schema.folders.$inferSelect; jobs: Job[] } | null> {
  const folder = await own(db, userId, folderId);
  if (!folder) return null;
  const items = await db.select().from(schema.folderItems).where(eq(schema.folderItems.folderId, folderId)).orderBy(desc(schema.folderItems.addedAt));
  if (items.length === 0) return { folder, jobs: [] };
  const rows = await db
    .select({ j: schema.jobs, uj: schema.userJobs })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(and(eq(schema.userJobs.userId, userId), inArray(schema.jobs.id, items.map((i) => i.jobId))));
  const byId = new Map(rows.map((r) => [r.j.id, { ...r.j, ...r.uj, id: r.j.id } as Job]));
  return { folder, jobs: items.map((i) => byId.get(i.jobId)).filter((j): j is Job => j != null) };
}
