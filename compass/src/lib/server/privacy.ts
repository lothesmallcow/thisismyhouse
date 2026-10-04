// "Cancella tutti i miei dati": one click (plus a confirmation) removes everything about her.
// Accounts stay so she can still sign in; the profile is reset to empty.
import { eq } from "drizzle-orm";
import type { DB } from "../db";
import { schema } from "../db";

export async function deleteAllMyData(db: DB): Promise<void> {
  await db.delete(schema.replies);
  await db.delete(schema.sendLog);
  await db.delete(schema.applications);
  await db.delete(schema.cvs);
  await db.delete(schema.jobSources);
  await db.delete(schema.jobs);
  await db.delete(schema.rankAdjustments);
  await db.delete(schema.processedMessages);
  await db.delete(schema.outbox);
  await db.delete(schema.demoInbox);
  await db.delete(schema.notifications);
  await db.delete(schema.httpCache);
  await db.delete(schema.spontaneousCompanies);
  await db.delete(schema.profile).where(eq(schema.profile.id, 1));
  await db.insert(schema.profile).values({ id: 1 });
}
