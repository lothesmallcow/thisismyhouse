// Personal Compass addresses: the Compass mailbox with a "+tag" (name+cmp-k3x9qz@example.com). Gmail and
// Outlook deliver plus-addressed mail to the same inbox and keep the full address in Delivered-To,
// so each person's forwarded job alerts are recognised as theirs, with no password shared.
import { randomBytes } from "node:crypto";
import type { InboundEmail } from "../sources/mail/types";

const PREFIX = "cmp-";

export function newAlertTag(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("");
}

/** "name@example.com" + "k3x9qz" → "name+cmp-k3x9qz@example.com". */
export function personalAddress(base: string, tag: string): string {
  const [local, domain] = base.toLowerCase().split("@");
  return `${local.split("+")[0]}+${PREFIX}${tag}@${domain}`;
}

/** The tag of the personal address an e-mail was delivered to, if any. */
export function tagOf(e: Pick<InboundEmail, "to"> & { deliveredTo?: string[] }): string | null {
  for (const a of [...(e.deliveredTo ?? []), ...e.to]) {
    const m = a.toLowerCase().match(/\+cmp-([a-z0-9]{4,12})@/);
    if (m) return m[1];
  }
  return null;
}

export interface ForwardingConfirmation {
  code: string | null;
  link: string | null;
  /** The Gmail address that asked to forward here. */
  requester: string | null;
}

/** Gmail's "Forwarding Confirmation" e-mail: the code and link the person needs to finish the setup. */
export function forwardingConfirmation(e: InboundEmail): ForwardingConfirmation | null {
  if (!/forwarding-noreply@google\.com$/i.test(e.from.address)) return null;
  const body = `${e.subject}\n${e.text}`;
  return {
    code: body.match(/(?:confirmation code|codice di conferma)[^0-9]{0,20}(\d{6,12})/i)?.[1] ?? body.match(/\(#(\d{6,12})\)/)?.[1] ?? null,
    link: body.match(/https:\/\/(?:mail-settings\.google\.com|mail\.google\.com)\/\S+/)?.[0]?.replace(/[)>.,]+$/, "") ?? null,
    requester: body.match(/(?:from|da)\s+([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase() ?? null,
  };
}
