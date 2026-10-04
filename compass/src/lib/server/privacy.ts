// "Cancella tutti i miei dati": one click (plus a confirmation) removes everything about her,
// in one transaction. Kept on purpose: the two accounts (so she can sign in again), the admin's
// own lists (company watchlist, W2 sites, spontaneous-company list, blocklist, settings) and the
// list of already-processed Message-IDs (so the next run does not re-import the same e-mails).
import { DEFAULT_TEMPLATES } from "../core/templates";
import type { DB } from "../db";
import { schema } from "../db";

export async function deleteAllMyData(db: DB): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(schema.replies);
    await tx.delete(schema.sendLog);
    await tx.delete(schema.applications);
    await tx.delete(schema.cvs);
    await tx.delete(schema.jobSources);
    await tx.delete(schema.jobs);
    await tx.delete(schema.rankAdjustments);
    await tx.delete(schema.outbox);
    await tx.delete(schema.demoInbox);
    await tx.delete(schema.notifications);
    await tx.delete(schema.httpCache);
    // Letter templates may contain her name or phone after editing: back to the defaults.
    await tx.delete(schema.templates);
    await tx.insert(schema.templates).values(DEFAULT_TEMPLATES.map((t, i) => ({ ...t, isDefault: i === 0 || t.kind === "spontaneous" })));
    await tx.delete(schema.profile);
    await tx.insert(schema.profile).values({ id: 1 });
  });
}
