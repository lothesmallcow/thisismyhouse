import fs from "node:fs";
import { eq, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { beforeEach, describe, expect, it } from "vitest";
import { schema, type DB } from "@/lib/db";
import { OutboxTransport } from "@/lib/mail/transport";
import { composeDigest, runDigest } from "@/lib/pipeline/digest";
import { runDiscover, usageToday } from "@/lib/pipeline/discover";
import { runIngest } from "@/lib/pipeline/ingest";
import { scanMailbox } from "@/lib/pipeline/mailbox-scan";
import { approveApplication, approveAll, cancelApplication, listDrafts, markAppliedOnSite, prepareEmailApplication, prepareSpontaneous, processQueue, runAutopilot, setKillSwitch } from "@/lib/server/applications";
import { dismissJob, listJobs, setAdjustmentActive } from "@/lib/server/jobs";
import { computeMetrics } from "@/lib/server/metrics";
import { deleteAllMyData } from "@/lib/server/privacy";
import { confirmReply, pendingReplies } from "@/lib/server/replies";
import { getSettings, updateGuardrails } from "@/lib/server/settings";
import { seedAccounts, seedDemo } from "@/lib/seed";
import { demoFetch } from "@/lib/sources/demo-fetch";
import { DemoMailbox } from "@/lib/sources/mail/demo";
import { TavilyProvider } from "@/lib/sources/web/w1";
import { freshDb } from "./helpers/db";

// Monday 5 October 2026, 09:00 Rome
const NOW = new Date("2026-10-05T07:00:00Z");
const noSleep = async () => {};
const rng = () => 0.5;
let db: DB;

beforeEach(async () => {
  db = await freshDb();
  await seedAccounts(db, { userEmail: "u@example.com", userPassword: "x", adminEmail: "a@example.com", adminPassword: "y" });
  await seedDemo(db, NOW);
});

const count = async (t: SQLiteTable) => Number((await db.select({ n: sql<number>`count(*)` }).from(t))[0].n);

describe("ingest (demo mode: real adapters, fixture network)", () => {
  it("reads the demo mailbox, Adzuna, ATS and the approved W2 site; dedupes across sources", async () => {
    const before = await count(schema.jobs);
    const s = await runIngest({ db, fetchImpl: demoFetch(), mailbox: new DemoMailbox(db), demo: true, now: NOW, politeSleep: noSleep });
    expect(s.mailbox!.alerts).toBe(5);
    expect(s.newJobs).toBeGreaterThan(10);
    expect(s.sources["api:adzuna"]).toBeGreaterThan(0);
    expect(s.sources["ats:greenhouse:esempiotech"]).toBe(1); // Berlin job filtered out
    expect(s.sources["ats:lever:esempiolever"]).toBe(1);
    expect(s.sources["w2:careers.esempio-demo.example"]).toBe(1);
    expect(await count(schema.jobs)).toBe(before + s.newJobs);

    // Studio Rinaldi comes from LinkedIn + Indeed + Adzuna: one job, three source links.
    const rinaldi = await db.select().from(schema.jobs).where(eq(schema.jobs.company, "Studio Rinaldi Commercialisti"));
    expect(rinaldi.length).toBe(1);
    const srcs = await db.select().from(schema.jobSources).where(eq(schema.jobSources.jobId, rinaldi[0].id));
    expect(new Set(srcs.map((x) => x.source))).toEqual(new Set(["email:linkedin", "email:indeed", "api:adzuna"]));
    // Enriched from the richer source: application e-mail found in Adzuna text
    expect(rinaldi[0].applicationEmail).toBe("selezione@studio-rinaldi.example");

    // W2 JSON-LD job
    const w2 = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Esempio Demo Spa") });
    expect(w2).toMatchObject({ city: "Nichelino", hours: "part", salaryMin: 21000, applicationEmail: "lavoro@esempio-demo.example" });

    // Health recorded
    const health = await db.select().from(schema.sourceHealth);
    expect(health.find((h) => h.source === "email:linkedin")?.itemsFound).toBe(6);

    // Running again parses nothing twice
    const again = await runIngest({ db, fetchImpl: demoFetch(), mailbox: new DemoMailbox(db), demo: true, now: NOW, politeSleep: noSleep });
    expect(again.mailbox!.alerts).toBe(0);
    expect(again.newJobs).toBe(0);
  });

  it("the scam ad from the Indeed alert is flagged and ranked Poco adatta", async () => {
    await runIngest({ db, fetchImpl: demoFetch(), mailbox: new DemoMailbox(db), demo: true, now: NOW, politeSleep: noSleep });
    const scam = await db.query.jobs.findFirst({ where: eq(schema.jobs.title, "Operatrice data entry da casa - guadagna subito") });
    expect(scam!.scamFlags.map((f) => f.id)).toEqual(expect.arrayContaining(["easy-money"]));
    expect(scam!.level).toBe("poco");
  });

  it("a 403 stops the source for the rest of the day and is recorded", async () => {
    const blocked = async () => new Response("no", { status: 403 });
    await runIngest({ db, fetchImpl: blocked, mailbox: null, demo: true, now: NOW, politeSleep: noSleep });
    const h = await db.query.sourceHealth.findFirst({ where: eq(schema.sourceHealth.source, "api:adzuna") });
    expect(h!.blocks).toBe(1);
    expect(h!.pausedUntil!.getTime()).toBeGreaterThan(NOW.getTime());
    const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.audience, "admin"));
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe("W1 discovery", () => {
  it("stores thin records, skips listing pages, and never exceeds the daily cap", async () => {
    await db.insert(schema.settings).values({ key: "w1DailyCap", value: 3 }).onConflictDoUpdate({ target: schema.settings.key, set: { value: 3 } });
    let calls = 0;
    const counting = (async (u: string, i?: RequestInit) => {
      calls++;
      return demoFetch()(u, i);
    }) as typeof fetch;
    const r = await runDiscover(db, new TavilyProvider(counting, "k"), NOW);
    expect(r.queries).toBe(3);
    expect(calls).toBe(3);
    expect(await usageToday(db, "w1-queries", NOW)).toBe(3);
    const again = await runDiscover(db, new TavilyProvider(counting, "k"), NOW);
    expect(again.capReached).toBe(true);
    expect(calls).toBe(3);
    const bassi = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Studio Bassi") });
    expect(bassi).toMatchObject({ title: "Impiegata amministrativa", thin: true });
    const listing = await db.select().from(schema.jobSources).where(sql`${schema.jobSources.url} like '%offerte-lavoro%'`);
    expect(listing).toHaveLength(0);
  });
});

describe("listing and 'Non mi interessa'", () => {
  it("lists best matches first, 10 at a time, and filters", async () => {
    const page = await listJobs(db, {}, 10, NOW);
    expect(page.jobs).toHaveLength(10);
    expect(page.total).toBeGreaterThan(10);
    const order = page.jobs.map((j) => j.level);
    expect(order.indexOf("poco") === -1 || order.lastIndexOf("molto") < order.indexOf("poco")).toBe(true);
    const part = await listJobs(db, { hours: "part" }, 100, NOW);
    expect(part.jobs.every((j) => j.hours !== "full")).toBe(true);
    const near = await listJobs(db, { maxKm: 10 }, 100, NOW);
    expect(near.jobs.every((j) => j.remote === "remote" || (j.distanceKm ?? 999) <= 10)).toBe(true);
  });

  it("dismissing 'azienda' adds a visible adjustment that can be undone", async () => {
    const job = (await listJobs(db, {}, 1, NOW)).jobs[0];
    const label = await dismissJob(db, job.id, "azienda", NOW);
    expect(label).toMatch(/Evita l'azienda/);
    const adj = await db.select().from(schema.rankAdjustments);
    expect(adj).toHaveLength(1);
    await setAdjustmentActive(db, adj[0].id, false);
    expect((await db.select().from(schema.rankAdjustments))[0].active).toBe(false);
  });
});

describe("applying", () => {
  async function emailJob() {
    const j = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Ferramenta Colombo Srl") });
    return j!;
  }

  it("Lane 1: prepare, approve (queued >= 15 min), send in demo mode -> outbox, never twice", async () => {
    const job = await emailJob();
    const app = (await prepareEmailApplication(db, job.id))!;
    expect(app.subject).toBe("Candidatura per Impiegata amministrativa | Lucia Ferraro");
    expect(app.body).toMatch(/Lucia Ferraro$/);
    expect(app.cvId).not.toBeNull();
    const r = await approveApplication(db, app.id, NOW, rng);
    expect(r.ok).toBe(true);
    expect(r.sendAt!.getTime() - NOW.getTime()).toBeGreaterThanOrEqual(15 * 60000);

    // Not yet due
    expect((await processQueue(db, new OutboxTransport(db), NOW, rng)).sent).toBe(0);
    const later = new Date(r.sendAt!.getTime() + 1000);
    expect((await processQueue(db, new OutboxTransport(db), later, rng)).sent).toBe(1);
    const out = await db.select().from(schema.outbox);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "application", toEmail: "lavoro@ferramentacolombo.example", attachmentName: "CV-Lucia-Ferraro-Amministrazione.pdf" });
    const log = await db.select().from(schema.sendLog).where(eq(schema.sendLog.status, "simulated"));
    expect(log.some((l) => l.company === "Ferramenta Colombo Srl")).toBe(true);
    // Same job again: returns the existing application, never a second e-mail
    const again = await prepareEmailApplication(db, job.id);
    expect(again!.id).toBe(app.id);
  });

  it("Annulla during the undo window brings it back to Da inviare", async () => {
    const job = await emailJob();
    const app = (await prepareEmailApplication(db, job.id))!;
    await approveApplication(db, app.id, NOW, rng);
    expect(await cancelApplication(db, app.id, new Date(NOW.getTime() + 60000))).toBe(true);
    const back = await db.query.applications.findFirst({ where: eq(schema.applications.id, app.id) });
    expect(back!.status).toBe("draft");
  });

  it("kill switch pulls queued e-mails back and blocks the queue", async () => {
    const job = await emailJob();
    const app = (await prepareEmailApplication(db, job.id))!;
    await approveApplication(db, app.id, NOW, rng);
    expect(await setKillSwitch(db, true)).toBe(1);
    expect((await approveApplication(db, app.id, NOW, rng)).ok).toBe(false);
    expect((await processQueue(db, new OutboxTransport(db), new Date(NOW.getTime() + 86400000), rng)).sent).toBe(0);
    await setKillSwitch(db, false);
    expect((await approveApplication(db, app.id, NOW, rng)).ok).toBe(true);
  });

  it("Invia tutte respects the daily cap by moving the rest to the next days", async () => {
    await updateGuardrails(db, { dailyCap: 2 });
    for (const j of await db.select().from(schema.jobs).where(sql`${schema.jobs.applicationEmail} is not null and ${schema.jobs.status} != 'applied'`)) {
      await prepareEmailApplication(db, j.id);
    }
    const drafts = (await listDrafts(db)).length;
    const r = await approveAll(db, NOW, rng);
    expect(r.queued + r.blocked).toBe(drafts);
    const queued = await db.select().from(schema.applications).where(eq(schema.applications.status, "queued"));
    const perDay = new Map<string, number>();
    for (const q of queued) perDay.set(q.sendAt!.toISOString().slice(0, 10), (perDay.get(q.sendAt!.toISOString().slice(0, 10)) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2);
  });

  it("autopilot only queues Molto adatta jobs without scam flags, and only when on", async () => {
    expect((await runAutopilot(db, NOW, rng)).queued).toBe(0);
    await updateGuardrails(db, { autopilot: true });
    await runAutopilot(db, NOW, rng);
    const queued = await db.select({ a: schema.applications, j: schema.jobs }).from(schema.applications).innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId)).where(eq(schema.applications.status, "queued"));
    expect(queued.length).toBeGreaterThan(0);
    expect(queued.every(({ j }) => j.level === "molto" && j.scamFlags.length === 0)).toBe(true);
    expect(queued.every(({ a }) => a.mode === "autopilot")).toBe(true);
  });

  it("spontaneous: one per company per 6 months", async () => {
    const c = await db.query.spontaneousCompanies.findFirst();
    const app = (await prepareSpontaneous(db, c!.id))!;
    expect(app.subject).toMatch(/Candidatura spontanea/);
    const r = await approveApplication(db, app.id, NOW, rng);
    expect(r.ok).toBe(true);
    await processQueue(db, new OutboxTransport(db), new Date(r.sendAt!.getTime() + 1000), rng);
    const second = (await prepareSpontaneous(db, c!.id))!;
    const r2 = await approveApplication(db, second.id, new Date(NOW.getTime() + 30 * 86400000), rng);
    expect(r2.ok).toBe(false);
    expect(r2.blockers![0].code).toBe("repeat-spontaneous");
  });

  it("Lane 3: 'Fatto, mi sono candidata' is logged", async () => {
    const job = (await listJobs(db, {}, 1, NOW)).jobs[0];
    await markAppliedOnSite(db, job.id, NOW);
    const a = await db.query.applications.findFirst({ where: eq(schema.applications.jobId, job.id) });
    expect(a).toMatchObject({ lane: "site", status: "applied_site" });
  });
});

describe("replies", () => {
  it("matches a reply by thread and suggests 'colloquio'", async () => {
    const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.company, "Ferramenta Colombo Srl") });
    const app = (await prepareEmailApplication(db, job!.id))!;
    const r = await approveApplication(db, app.id, NOW, rng);
    await processQueue(db, new OutboxTransport(db), new Date(r.sendAt!.getTime() + 1000), rng);
    const sent = await db.query.applications.findFirst({ where: eq(schema.applications.id, app.id) });
    const raw = fs.readFileSync("fixtures/emails/reply-1.eml", "utf8").replaceAll("<REPLACE_WITH_SENT_MESSAGE_ID>", sent!.messageId!).replace(/^Date: .*$/m, `Date: ${new Date(NOW.getTime() + 86400000).toUTCString()}`);
    await db.insert(schema.demoInbox).values({ messageId: "<reply-5001@studio-rinaldi.example>", raw, receivedAt: new Date(NOW.getTime() + 86400000) });
    const s = await scanMailbox(db, new DemoMailbox(db), new Date(NOW.getTime() + 86400000 + 1000));
    expect(s.replies).toBe(1);
    const pending = await pendingReplies(db);
    const mine = pending.find((p) => p.app.id === app.id)!;
    expect(mine.reply).toMatchObject({ matchedBy: "thread", suggestedStatus: "interview" });
    const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.audience, "user"));
    expect(notes.some((n) => /Hai ricevuto una risposta da Ferramenta Colombo Srl/.test(n.text))).toBe(true);
    await confirmReply(db, mine.reply.id);
    expect((await db.query.applications.findFirst({ where: eq(schema.applications.id, app.id) }))!.status).toBe("interview");
  });
});

describe("digest, metrics, privacy", () => {
  it("composes a warm digest with one button", () => {
    const d = composeDigest("Lucia Ferraro", { newJobs: 6, ready: 3, replies: 1 }, "https://compass.example");
    expect(d.subject).toBe("Buongiorno! 6 nuove offerte, 3 candidature pronte, 1 risposta ricevuta");
    expect(d.text).toMatch(/^Buongiorno Lucia!/);
    expect(d.html.match(/<a /g)).toHaveLength(1);
    expect(composeDigest("", { newJobs: 0, ready: 0, replies: 0 }, "x").text).toMatch(/Ricontrollo domani mattina/);
  });

  it("sends the digest once per day (demo -> outbox)", async () => {
    expect(await runDigest(db, new OutboxTransport(db), NOW)).toBe("sent");
    expect(await runDigest(db, new OutboxTransport(db), NOW)).toBe("already-sent");
    expect((await db.select().from(schema.outbox).where(eq(schema.outbox.kind, "digest")))).toHaveLength(1);
  });

  it("computes metrics from raw rows", async () => {
    const m = await computeMetrics(db);
    expect(m.jobsTotal).toBeGreaterThan(20);
    expect(m.applicationsByLane.find((l) => l.lane === "email")?.total).toBe(2);
    expect(m.replies).toBe(1);
    expect(m.replyRate).toBeCloseTo(0.5);
    expect(m.emailSent).toBe(0); // demo sends are simulated, never counted as real
    expect(m.emailSimulated).toBe(2);
  });

  it("deletes all her data", async () => {
    await deleteAllMyData(db);
    expect(await count(schema.jobs)).toBe(0);
    expect(await count(schema.cvs)).toBe(0);
    expect(await count(schema.applications)).toBe(0);
    const p = await db.query.profile.findFirst();
    expect(p!.name).toBe("");
    expect(await count(schema.users)).toBe(2); // accounts stay
    expect((await getSettings(db)).realSending).toBe(false);
  });
});
