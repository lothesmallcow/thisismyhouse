import { simpleParser, type AddressObject } from "mailparser";
import type { InboundEmail } from "./types";

function firstAddress(a: AddressObject | AddressObject[] | undefined): { address: string; name: string } {
  const obj = Array.isArray(a) ? a[0] : a;
  const v = obj?.value?.[0];
  return { address: (v?.address ?? "").toLowerCase(), name: v?.name ?? "" };
}

function allAddresses(a: AddressObject | AddressObject[] | undefined): string[] {
  const list = Array.isArray(a) ? a : a ? [a] : [];
  return list.flatMap((o) => o.value.map((v) => (v.address ?? "").toLowerCase())).filter(Boolean);
}

export async function parseRawEmail(source: string | Buffer): Promise<InboundEmail> {
  const m = await simpleParser(source);
  const refs = m.references ? (Array.isArray(m.references) ? m.references : [m.references]) : [];
  return {
    messageId: m.messageId ?? `<no-id-${m.date?.getTime() ?? Date.now()}@compass.local>`,
    from: firstAddress(m.from),
    to: allAddresses(m.to),
    deliveredTo: ["delivered-to", "x-forwarded-to", "x-original-to"].flatMap((h) => {
      const v = m.headers.get(h);
      return (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(typeof x === "object" && x && "text" in x ? (x as { text: string }).text : x).toLowerCase().trim());
    }),
    subject: m.subject ?? "",
    date: m.date ?? new Date(),
    inReplyTo: m.inReplyTo ?? null,
    references: refs,
    text: m.text ?? "",
    html: typeof m.html === "string" ? m.html : null,
  };
}
