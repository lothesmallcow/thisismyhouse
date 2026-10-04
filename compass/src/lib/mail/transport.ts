// Outgoing e-mail. Two transports with one interface:
//  - OutboxTransport: writes to the outbox table. Used whenever DEMO_MODE=true or the admin
//    has not switched real sending on. Nothing leaves the server.
//  - SmtpTransport: Gmail SMTP with an app password, from one of the configured mailboxes
//    (each person can have their own, see env.mailboxes).
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import type { DB } from "../db";
import { schema } from "../db";
import { env, mailboxConfig, type MailboxConfig } from "../env";

export interface OutgoingEmail {
  kind: "application" | "digest" | "admin-alert" | "account";
  to: string; // exactly one recipient
  subject: string;
  text: string; // plain text first
  html?: string;
  replyTo?: string;
  attachment?: { filename: string; content: Buffer; contentType: string };
}

export interface SendResult {
  messageId: string;
  simulated: boolean;
}

export interface Transport {
  readonly real: boolean;
  send(msg: OutgoingEmail): Promise<SendResult>;
}

export function newMessageId(fromAddress = ""): string {
  const domain = fromAddress.split("@")[1] || env.mailbox.user.split("@")[1] || "compass.local";
  return `<compass.${Date.now().toString(36)}.${randomBytes(6).toString("hex")}@${domain}>`;
}

export class OutboxTransport implements Transport {
  readonly real = false;
  /** `userId`: whose e-mail this is (shown per person in the admin "Posta" page). */
  constructor(
    private db: DB,
    private userId: number | null = null,
  ) {}
  async send(msg: OutgoingEmail): Promise<SendResult> {
    if (/[,;]/.test(msg.to)) throw new Error("one recipient per e-mail");
    const messageId = newMessageId();
    await this.db.insert(schema.outbox).values({
      userId: this.userId,
      kind: msg.kind,
      toEmail: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html ?? null,
      attachmentName: msg.attachment?.filename ?? null,
      messageId,
      at: new Date(),
    });
    return { messageId, simulated: true };
  }
}

export class SmtpTransport implements Transport {
  readonly real = true;
  private t: ReturnType<typeof nodemailer.createTransport>;
  constructor(
    private fromName: string,
    private box: MailboxConfig,
  ) {
    this.t = nodemailer.createTransport({
      host: box.smtpHost,
      port: 465,
      secure: true,
      auth: { user: box.user, pass: box.password },
      logger: false,
    });
  }
  async send(msg: OutgoingEmail): Promise<SendResult> {
    if (/[,;]/.test(msg.to)) throw new Error("one recipient per e-mail");
    const messageId = newMessageId(this.box.user);
    await this.t.sendMail({
      from: { name: this.fromName || this.box.user, address: this.box.user },
      to: msg.to,
      replyTo: msg.replyTo ?? this.box.user,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      messageId,
      attachments: msg.attachment ? [msg.attachment] : undefined,
    });
    return { messageId, simulated: false };
  }
}

/** Real e-mail only when ALL: DEMO_MODE=false, the admin switch is on, and this person's mailbox is configured. */
export function realSendingActive(realSendingSetting: boolean, mailboxKey: string | null = "default"): boolean {
  return !env.demoMode && realSendingSetting && mailboxConfig(mailboxKey) != null;
}

/** The transport for one person's job applications. */
export function getTransport(db: DB, realSendingSetting: boolean, user: { id: number; mailboxKey: string | null }, fromName: string): Transport {
  const box = mailboxConfig(user.mailboxKey);
  return realSendingActive(realSendingSetting, user.mailboxKey) && box ? new SmtpTransport(fromName, box) : new OutboxTransport(db, user.id);
}

/**
 * The transport for Compass's own e-mails (morning e-mail, admin alerts): the person's mailbox if
 * they have one, else the main one. These are part of the interface, so they do not wait for the
 * job-application switch.
 */
export function serviceTransport(db: DB, user: { id: number; mailboxKey: string | null } | null, fromName = "Compass"): Transport {
  if (env.demoMode) return new OutboxTransport(db, user?.id ?? null);
  const box = mailboxConfig(user?.mailboxKey) ?? mailboxConfig("default");
  return box ? new SmtpTransport(fromName, box) : new OutboxTransport(db, user?.id ?? null);
}
