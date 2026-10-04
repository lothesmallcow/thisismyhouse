// The morning e-mail, one per person. It says the three numbers that matter and has one button.
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { romeDateKey } from "../core/time";
import type { DB } from "../db";
import { schema } from "../db";
import { env } from "../env";
import type { Transport } from "../mail/transport";
import { defaultFilters, filterWhere } from "../server/jobs";
import { getProfile } from "../server/profile";
import { getSettings, getUserSettings, updateUserSettings } from "../server/settings";

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
  const subject = nothing ? "Compass: nessuna novità oggi" : `Compass: ${line}`;
  const text = `Buongiorno${first ? " " + first : ""},\n\n${intro[0].toUpperCase()}${intro.slice(1)}\n\nApri Compass: ${appUrl}\n\nCompass`;
  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px 28px;border:1px solid #e4e4e7">
<tr><td style="font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#1f5f53;padding-bottom:16px">Compass</td></tr>
<tr><td style="font-size:22px;font-weight:600;padding-bottom:8px">Buongiorno${first ? " " + escapeHtml(first) : ""}</td></tr>
<tr><td style="font-size:16px;line-height:1.55;color:#3f3f46;padding-bottom:24px">${escapeHtml(intro[0].toUpperCase() + intro.slice(1))}</td></tr>
<tr><td><a href="${appUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:8px">Apri Compass</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html, counts };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** The person's numbers, with their default filters and focus (what they would see on "Offerte"). */
export async function digestCounts(db: DB, userId: number, now = new Date()) {
  const since = new Date(now.getTime() - 24 * 3600000);
  const profile = await getProfile(db, userId);
  const where = and(filterWhere(userId, defaultFilters(profile), now), gte(schema.jobs.firstSeenAt, since), inArray(schema.userJobs.level, ["molto", "adatta"]));
  const [{ n: newJobs }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.userJobs)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
    .where(where);
  const [{ n: ready }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.applications)
    .where(and(eq(schema.applications.userId, userId), eq(schema.applications.status, "draft")));
  const [{ n: replies }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.replies)
    .where(and(eq(schema.replies.userId, userId), gte(schema.replies.receivedAt, since)));
  return { newJobs: Number(newJobs), ready: Number(ready), replies: Number(replies) };
}

export type DigestResult = "sent" | "already-sent" | "disabled" | "no-recipient";

/** One morning e-mail per person who wants it, at most once per Rome day each. */
export async function runDigest(db: DB, transportFor: Transport | ((u: { id: number; mailboxKey: string | null }) => Transport), now = new Date()): Promise<Record<number, DigestResult>> {
  const out: Record<number, DigestResult> = {};
  const settings = await getSettings(db);
  const users = await db.select().from(schema.users).where(and(eq(schema.users.role, "user"), eq(schema.users.active, true)));
  for (const u of users) {
    const us = await getUserSettings(db, u.id);
    if (!settings.digestEnabled || !us.digestEnabled) {
      out[u.id] = "disabled";
      continue;
    }
    const profile = await getProfile(db, u.id);
    if (!profile.onboardedAt) continue;
    const day = romeDateKey(now);
    if (us.lastDigestDay === day) {
      out[u.id] = "already-sent";
      continue;
    }
    const to = u.digestEmail || u.email;
    if (!to) {
      out[u.id] = "no-recipient";
      continue;
    }
    const d = composeDigest(profile.name || u.name, await digestCounts(db, u.id, now), `${env.appUrl}/offerte`);
    const transport = typeof transportFor === "function" ? transportFor(u) : transportFor;
    await transport.send({ kind: "digest", to, subject: d.subject, text: d.text, html: d.html });
    await updateUserSettings(db, u.id, { lastDigestDay: day });
    out[u.id] = "sent";
  }
  return out;
}
