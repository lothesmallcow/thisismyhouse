// Real mailbox: IMAP on a dedicated Gmail account with an app password (see ADR 0002).
// Read-only use: we never delete or move messages; processed Message-IDs live in our DB.
import { ImapFlow } from "imapflow";
import type { MailboxConfig } from "../../env";
import { parseRawEmail } from "./parse";
import type { InboundEmail, Mailbox } from "./types";

export class ImapMailbox implements Mailbox {
  constructor(private box: MailboxConfig) {}
  async fetchSince(since: Date): Promise<InboundEmail[]> {
    const client = new ImapFlow({
      host: this.box.imapHost,
      port: 993,
      secure: true,
      auth: { user: this.box.user, pass: this.box.password },
      logger: false, // never log mailbox content (privacy)
    });
    await client.connect();
    const out: InboundEmail[] = [];
    try {
      // "[Gmail]/All Mail" also sees filtered/archived alerts; fall back to INBOX.
      const boxes = await client.list();
      const all = boxes.find((b) => b.specialUse === "\\All")?.path ?? "INBOX";
      const lock = await client.getMailboxLock(all);
      try {
        const uids = await client.search({ since }, { uid: true });
        if (uids && uids.length) {
          for await (const msg of client.fetch(uids.slice(-500), { source: true }, { uid: true })) {
            if (msg.source) out.push(await parseRawEmail(msg.source));
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }
    return out;
  }
}
