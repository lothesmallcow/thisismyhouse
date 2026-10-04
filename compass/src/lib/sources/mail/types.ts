// Mailbox abstraction. The real mailbox (IMAP on the dedicated Gmail account) and the demo
// mailbox (synthetic e-mails stored in the DB) both produce InboundEmail through the same
// RFC 822 parser, so demo mode exercises the real parsing path.

export interface InboundEmail {
  messageId: string;
  from: { address: string; name: string };
  to: string[];
  subject: string;
  date: Date;
  inReplyTo: string | null;
  references: string[];
  text: string;
  html: string | null;
}

export interface Mailbox {
  /** E-mails received since `since` (inclusive). Callers skip already-processed Message-IDs. */
  fetchSince(since: Date): Promise<InboundEmail[]>;
  close?(): Promise<void>;
}
