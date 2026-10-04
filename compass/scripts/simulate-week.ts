// A full demo week, end to end, on a throwaway database with a simulated clock:
// alerts arrive -> ingestion -> ranking -> 3 approvals (1 cancelled with Annulla) -> queue
// sends them spaced inside the window -> a recruiter reply arrives -> status confirmed ->
// morning digest. Every step prints what happened and checks it against the database.
// Usage: npx tsx scripts/simulate-week.ts  (writes docs/audit/demo-week.log)
import fs from "node:fs";
import { eq, sql, type SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { createDb, migrateDb, setDb, schema } from "../src/lib/db";
import { formatWhen } from "../src/lib/core/time";
import { OutboxTransport } from "../src/lib/mail/transport";
import { composeDigest, digestCounts, runDigest } from "../src/lib/pipeline/digest";
import { runIngest } from "../src/lib/pipeline/ingest";
import { scanMailbox } from "../src/lib/pipeline/mailbox-scan";
import { approveApplication, cancelApplication, prepareEmailApplication, processQueue } from "../src/lib/server/applications";
import { listJobs } from "../src/lib/server/jobs";
import { confirmReply, pendingReplies } from "../src/lib/server/replies";
import { seedAccounts, seedDemo } from "../src/lib/seed";
import { demoFetch } from "../src/lib/sources/demo-fetch";
import { DemoMailbox } from "../src/lib/sources/mail/demo";

process.env.DEMO_MODE = "true";
const lines: string[] = [];
const log = (s: string) => {
  lines.push(s);
  console.log(s);
};
const check = (ok: boolean, what: string) => {
  log(`   ${ok ? "OK " : "FAIL"} ${what}`);
  if (!ok) process.exitCode = 1;
};

const handle = createDb(":memory:");
await migrateDb(handle.db);
setDb(handle);
const db = handle.db;
let rngState = 7;
const rng = () => ((rngState = (rngState * 9301 + 49297) % 233280) / 233280);
const t = (iso: string) => new Date(iso);
const count = async (table: SQLiteTable, where?: SQL) =>
  Number((await db.select({ n: sql<number>`count(*)` }).from(table).where(where))[0].n);

// Sunday evening: seed (her profile, CVs, templates, demo mailbox with this week's alerts)
const SUN = t("2026-10-04T18:00:00Z");
await seedAccounts(db, { userEmail: "demo@example.com", userPassword: "x", adminEmail: "admin@example.com", adminPassword: "y" });
await seedDemo(db, SUN);
log(`Domenica 4 ottobre, sera: profilo di prova, ${await count(schema.jobs)} offerte già in archivio, ${await count(schema.demoInbox)} avvisi e-mail in casella.`);

// Monday 06:30 Rome: scheduled ingestion
const MON_INGEST = t("2026-10-05T04:30:00Z");
const ing = await runIngest({ db, fetchImpl: demoFetch(), mailbox: new DemoMailbox(db), demo: true, now: MON_INGEST, politeSleep: async () => {} });
log(`Lunedì 06:30 raccolta: ${ing.mailbox!.alerts} avvisi letti, ${ing.newJobs} offerte nuove, ${ing.mailbox!.jobsMerged} già viste uniti come doppioni.`);
check(ing.mailbox!.alerts === 5, "5 alert e-mails parsed");
const top = (await listJobs(db, {}, 10, MON_INGEST)).jobs;
log(`   Le prime 3: ${top.slice(0, 3).map((j) => `${j.title} (${j.company}, ${j.level}: ${j.reasons.join("; ")})`).join(" | ")}`);
check(top[0].level === "molto", "best offer ranked Molto adatta");

// Monday 09:00: she prepares and approves 3 e-mail applications
const MON9 = t("2026-10-05T07:00:00Z");
const emailJobs = (await db.select().from(schema.jobs).where(sql`${schema.jobs.applicationEmail} is not null and ${schema.jobs.status} != 'applied' and json_array_length(${schema.jobs.scamFlags}) = 0`).orderBy(sql`${schema.jobs.score} desc`)).slice(0, 3);
const apps: { id: number; company: string | null; sendAt: Date }[] = [];
for (const j of emailJobs) {
  const a = (await prepareEmailApplication(db, j.id))!;
  const r = await approveApplication(db, a.id, MON9, rng);
  apps.push({ ...a, sendAt: r.sendAt! });
  log(`Lunedì 9:00 "Invia" a ${a.company}: parte ${formatWhen(r.sendAt!, MON9)}.`);
}
// 1 cancelled with Annulla after 5 minutes
const MON905 = t("2026-10-05T07:05:00Z");
check(await cancelApplication(db, apps[2].id, MON905), `"Annulla" on ${apps[2].company} within the undo window`);
log(`Lunedì 9:05 "Annulla" per ${apps[2].company}: torna in "Da inviare".`);

// The queue runs every 15 minutes in the window
let sent = 0;
for (let m = 15; m <= 600; m += 15) {
  const now = new Date(MON9.getTime() + m * 60000);
  const r = await processQueue(db, new OutboxTransport(db), now, rng);
  if (r.sent) {
    sent += r.sent;
    const last = (await db.select().from(schema.sendLog).orderBy(sql`${schema.sendLog.id} desc`).limit(1))[0];
    log(`   coda ${formatWhen(now, MON9)}: inviata a ${last.company} (simulata, CV "${last.cvLabel}").`);
  }
}
check(sent === 2, "exactly the 2 approved, non-cancelled applications were sent");
check((await count(schema.outbox, eq(schema.outbox.kind, "application"))) === 2, "outbox holds 2 application e-mails, nothing left the machine");
const sentRows = (await db.select().from(schema.applications).where(eq(schema.applications.status, "sent"))).filter((r) => apps.some((a) => a.id === r.id));
const gap = Math.abs(sentRows[1].sentAt!.getTime() - sentRows[0].sentAt!.getTime()) / 60000;
check(gap >= 5, `sends spaced by ${gap} minutes`);
check((await db.query.applications.findFirst({ where: eq(schema.applications.id, apps[2].id) }))!.status === "draft", "the cancelled one never left");

// Wednesday 11:20: a recruiter replies in the same thread
const WED = t("2026-10-07T09:20:00Z");
const target = sentRows[0];
const raw = fs
  .readFileSync("fixtures/emails/reply-1.eml", "utf8")
  .replaceAll("<REPLACE_WITH_SENT_MESSAGE_ID>", target.messageId!)
  .replace(/^From: .*$/m, `From: Ufficio Selezione <${target.toEmail}>`)
  .replace(/^Date: .*$/m, `Date: ${WED.toUTCString()}`);
await db.insert(schema.demoInbox).values({ messageId: "<reply-5001@studio-rinaldi.example>", raw, receivedAt: WED });
const scan = await scanMailbox(db, new DemoMailbox(db), new Date(WED.getTime() + 60000));
log(`Mercoledì 11:20 risposta da ${target.company}: riconosciuta (${scan.replies}).`);
check(scan.replies === 1, "reply matched by Message-ID");
const pending = await pendingReplies(db);
const mine = pending.find((p) => p.app.id === target.id)!;
log(`   Lei vede: "Hai ricevuto una risposta da ${target.company}!" Suggerimento: ${mine.reply.suggestedStatus}.`);
await confirmReply(db, mine.reply.id);
check((await db.query.applications.findFirst({ where: eq(schema.applications.id, target.id) }))!.status === "interview", "one tap: status = Colloquio");

// Thursday 07:00: the morning digest
const THU = t("2026-10-08T05:00:00Z");
await db.insert(schema.jobs).values({ dedupeKey: "x", title: "Impiegata nuova di giovedì", company: "Nuova Srl", firstSeenAt: new Date(THU.getTime() - 3600000), updatedAt: THU, level: "molto" });
const counts = await digestCounts(db, THU);
const d = composeDigest("Lucia Ferraro", counts, "https://compass.example");
await runDigest(db, new OutboxTransport(db), THU);
log(`Giovedì 07:00 e-mail del mattino: "${d.subject}"`);
const since = THU.getTime() - 86400000;
const all = await db.select().from(schema.jobs);
check(counts.newJobs === all.filter((j) => j.firstSeenAt.getTime() >= since && j.level !== "poco" && j.status !== "dismissed").length, "digest 'nuove offerte' = database");
check(counts.ready === (await count(schema.applications, eq(schema.applications.status, "draft"))), "digest 'candidature pronte' = database");
check(counts.replies === (await db.select().from(schema.replies)).filter((r) => r.receivedAt.getTime() >= since).length, "digest 'risposte' = database");
check((await count(schema.outbox, eq(schema.outbox.kind, "digest"))) === 1, "digest delivered once (outbox)");

fs.mkdirSync("docs/audit", { recursive: true });
fs.writeFileSync("docs/audit/demo-week.log", lines.join("\n") + "\n");
log(process.exitCode ? "\nSOME CHECKS FAILED" : "\nAll checks passed.");
