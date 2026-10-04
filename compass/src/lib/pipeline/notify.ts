import type { DB } from "../db";
import { schema } from "../db";

/** A note shown at the top of one person's app. */
export async function notifyUser(db: DB, userId: number, text: string, href?: string): Promise<void> {
  await db.insert(schema.notifications).values({ audience: "user", userId, text, href: href ?? null });
}

export async function notifyAdmin(db: DB, text: string, href?: string): Promise<void> {
  await db.insert(schema.notifications).values({ audience: "admin", text, href: href ?? null });
}
