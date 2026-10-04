// Demo mailbox: synthetic e-mails stored in the demo_inbox table (seeded from fixtures/).
import { gte } from "drizzle-orm";
import type { DB } from "../../db";
import { schema } from "../../db";
import { parseRawEmail } from "./parse";
import type { InboundEmail, Mailbox } from "./types";

export class DemoMailbox implements Mailbox {
  constructor(private db: DB) {}
  async fetchSince(since: Date): Promise<InboundEmail[]> {
    const rows = await this.db.select().from(schema.demoInbox).where(gte(schema.demoInbox.receivedAt, since));
    return Promise.all(rows.map((r) => parseRawEmail(r.raw)));
  }
}
