// Demo mailbox: synthetic e-mails stored in the demo_inbox table (seeded from fixtures/).
// Each row belongs to one mailbox key, like the real per-person mailboxes.
import { and, eq, gte } from "drizzle-orm";
import type { DB } from "../../db";
import { schema } from "../../db";
import { parseRawEmail } from "./parse";
import type { InboundEmail, Mailbox } from "./types";

export class DemoMailbox implements Mailbox {
  constructor(
    private db: DB,
    private key = "default",
  ) {}
  async fetchSince(since: Date): Promise<InboundEmail[]> {
    const rows = await this.db
      .select()
      .from(schema.demoInbox)
      .where(and(gte(schema.demoInbox.receivedAt, since), eq(schema.demoInbox.mailboxKey, this.key)));
    return Promise.all(rows.map((r) => parseRawEmail(r.raw)));
  }
}
