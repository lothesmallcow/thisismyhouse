import type { DB } from "../db";
import { schema } from "../db";

export async function notifyUser(db: DB, text: string, href?: string): Promise<void> {
  await db.insert(schema.notifications).values({ audience: "user", text, href: href ?? null });
}

export async function notifyAdmin(db: DB, text: string, href?: string): Promise<void> {
  await db.insert(schema.notifications).values({ audience: "admin", text, href: href ?? null });
}
