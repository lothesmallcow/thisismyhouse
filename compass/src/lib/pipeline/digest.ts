// The daily e-mail to her normal inbox. Many days it is the only thing she looks at, so it
// says the three numbers that matter and has ONE big button.
import { and, eq, gte, sql } from "drizzle-orm";
import { romeDateKey } from "../core/time";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import type { Transport } from "../mail/transport";
import { getProfile } from "../server/profile";
import { getSettings, setSetting } from "../server/settings";

export interface DigestContent {
  subject: string;
  text: string;
  html: string;
  counts: { newJobs: number; ready: number; replies: number };
}

export function composeDigest(name: string, counts: DigestContent["counts"], appUrl: string): DigestContent {
  const first = name.split(" ")[0] || "";
  const parts: string[] = [];
  parts.push(counts.newJobs === 1 ? "1 nuova offerta" : `${counts.newJobs} nuove offerte`);
  parts.push(counts.ready === 1 ? "1 candidatura pronta" : `${counts.ready} candidature pronte`);
  parts.push(counts.replies === 1 ? "1 risposta ricevuta" : `${counts.replies} risposte ricevute`);
  const line = parts.join(", ");
  const nothing = counts.newJobs + counts.ready + counts.replies === 0;
  const intro = nothing ? "oggi non ci sono novità. Ricontrollo domani mattina." : `${line}.`;
  const subject = nothing ? "Buongiorno! Oggi nessuna novità" : `Buongiorno! ${line[0].toUpperCase()}${line.slice(1)}`;
  const text = `Buongiorno${first ? " " + first : ""}!\n\n${intro[0].toUpperCase()}${intro.slice(1)}\n\nApri Compass: ${appUrl}\n\nUn abbraccio,\nCompass`;
  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#f6f1e7;font-family:Georgia,serif;color:#1d2a36">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf8;border-radius:20px;padding:36px 28px;border:1px solid #e6dccb">
<tr><td style="font-size:30px;font-weight:bold;padding-bottom:12px">Buongiorno${first ? " " + escapeHtml(first) : ""}!</td></tr>
<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:1.5;padding-bottom:28px">${escapeHtml(intro[0].toUpperCase() + intro.slice(1))}</td></tr>
<tr><td align="center"><a href="${appUrl}" style="display:inline-block;background:#1f3b57;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;padding:18px 36px;border-radius:14px">Apri Compass</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html, counts };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export async function digestCounts(db: DB, now = new Date()) {
  const since = new Date(now.getTime() - 24 * 3600000);
  const [{ n: newJobs }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.jobs)
    .where(and(gte(schema.jobs.firstSeenAt, since), sql`${schema.jobs.level} in ('molto','adatta')`, sql`${schema.jobs.status} != 'dismissed'`));
  const [{ n: ready }] = await db.select({ n: sql<number>`count(*)` }).from(schema.applications).where(eq(schema.applications.status, "draft"));
  const [{ n: replies }] = await db.select({ n: sql<number>`count(*)` }).from(schema.replies).where(gte(schema.replies.receivedAt, since));
  return { newJobs: Number(newJobs), ready: Number(ready), replies: Number(replies) };
}

/** Send at most once per Rome day. */
export async function runDigest(db: DB, transport: Transport, now = new Date()): Promise<"sent" | "already-sent" | "disabled" | "no-recipient"> {
  const settings = await getSettings(db);
  if (!settings.digestEnabled) return "disabled";
  const day = romeDateKey(now);
  if (settings.lastDigestDay === day) return "already-sent";
  const profile = await getProfile(db);
  const to = env.digestTo || (env.demoMode ? profile.email || "lei@example.com" : "");
  if (!to) return "no-recipient";
  const d = composeDigest(profile.name, await digestCounts(db, now), `${env.appUrl}/offerte`);
  await transport.send({ kind: "digest", to, subject: d.subject, text: d.text, html: d.html });
  await setSetting(db, "lastDigestDay", day);
  return "sent";
}
