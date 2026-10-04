// Outgoing e-mail. Two transports with one interface:
//  - OutboxTransport: writes to the outbox table. Used whenever DEMO_MODE=true or the admin
//    has not switched real sending on. Nothing leaves the server.
//  - SmtpTransport: Gmail SMTP with an app password, from the dedicated account.
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";

export interface OutgoingEmail {
  kind: "application" | "digest" | "admin-alert";
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

export function newMessageId(): string {
  const domain = env.mailbox.user.split("@")[1] || "compass.local";
  return `<compass.${Date.now().toString(36)}.${randomBytes(6).toString("hex")}@${domain}>`;
}

export class OutboxTransport implements Transport {
  readonly real = false;
  constructor(private db: DB) {}
  async send(msg: OutgoingEmail): Promise<SendResult> {
    if (/[,;]/.test(msg.to)) throw new Error("one recipient per e-mail");
    const messageId = newMessageId();
    await this.db.insert(schema.outbox).values({
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
  private t = nodemailer.createTransport({
    host: env.mailbox.smtpHost,
    port: 465,
    secure: true,
    auth: { user: env.mailbox.user, pass: env.mailbox.password },
    logger: false,
  });
  constructor(private fromName: string) {}
  async send(msg: OutgoingEmail): Promise<SendResult> {
    if (/[,;]/.test(msg.to)) throw new Error("one recipient per e-mail");
    const messageId = newMessageId();
    await this.t.sendMail({
      from: { name: this.fromName || env.mailbox.user, address: env.mailbox.user },
      to: msg.to,
      replyTo: msg.replyTo ?? env.mailbox.user,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      messageId,
      attachments: msg.attachment ? [msg.attachment] : undefined,
    });
    return { messageId, simulated: false };
  }
}

/** Real e-mail only when BOTH: DEMO_MODE=false and the admin switch is on, and the mailbox is configured. */
export function realSendingActive(realSendingSetting: boolean): boolean {
  return !env.demoMode && realSendingSetting && env.mailbox.configured;
}

export function getTransport(db: DB, realSendingSetting: boolean, fromName: string): Transport {
  return realSendingActive(realSendingSetting) ? new SmtpTransport(fromName) : new OutboxTransport(db);
}
