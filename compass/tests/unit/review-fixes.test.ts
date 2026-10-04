// Regression tests for the independent review findings.
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { schema, type DB } from "@/lib/db";
import { OutboxTransport } from "@/lib/mail/transport";
import { approveApplication, prepareEmailApplication, prepareSpontaneous, processQueue, recoverStaleSending, runAutopilot, setKillSwitch, skipApplication } from "@/lib/server/applications";
import { looksLikePdf } from "@/lib/core/pdf-check";
import { textPdf } from "@/lib/seed/pdf";
import { setApplicationEmail, upsertRawJob } from "@/lib/server/jobs";
import { deleteAllMyData } from "@/lib/server/privacy";
import { confirmReply } from "@/lib/server/replies";
import { getSettings, updateUserSettings } from "@/lib/server/settings";
import { PlatformNotAllowed, PoliteFetcher } from "@/lib/sources/web/polite-fetch";
import { romeParts } from "@/lib/core/time";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }) }));

const NOW = new Date("2026-10-05T07:00:00Z"); // Monday 09:00 Rome
const rng = () => 0.5;
let db: DB;
let L: number;
let M: number;
beforeEach(async () => {
  db = await freshDb();
  ({ L, M } = await seedPeople(db, NOW));
});
const emailJobs = async () =>
  (
    await db
      .select({ j: schema.jobs })
      .from(schema.userJobs)
      .innerJoin(schema.jobs, eq(schema.jobs.id, schema.userJobs.jobId))
      .where(sql`${schema.userJobs.userId} = ${L} and ${schema.jobs.applicationEmail} is not null and ${schema.userJobs.status} != 'applied' and json_array_length(${schema.jobs.scamFlags}) = 0`)
  ).map((r) => r.j);

describe("kill switch: her stop vs the admin's stop", () => {
  it("she cannot lift the admin's stop", async () => {
    await setKillSwitch(db, null, true, "admin");
    await setKillSwitch(db, L, false, "user"); // her "Riattiva"
    const g = (await getSettings(db)).guardrails;
    expect(g.adminKillSwitch).toBe(true);
    const app = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    expect((await approveApplication(db, L, app.id, NOW, rng)).ok).toBe(false);
    await setKillSwitch(db, null, false, "admin");
    expect((await approveApplication(db, L, app.id, NOW, rng)).ok).toBe(true);
  });
});

describe("scam flags are recomputed at check time", () => {
  it("a free-mail address added by hand later is caught, and autopilot will not send it", async () => {
    const { jobId } = await upsertRawJob(db, { source: "manual", url: null, title: "Impiegata amministrativa", company: "Rossi Srl", location: "Torino", description: "Cerchiamo impiegata amministrativa, tempo indeterminato." }, NOW, { owners: [L] });
    await setApplicationEmail(db, L, jobId, "guadagni.esempio@gmail.com", "a mano");
    const job = await db.query.jobs.findFirst({ where: eq(schema.jobs.id, jobId) });
    expect(job!.scamFlags.map((f) => f.id)).toContain("freemail-mismatch");
    await updateUserSettings(db, L, { autopilot: true });
    await db.update(schema.userJobs).set({ level: "molto" }).where(eq(schema.userJobs.jobId, jobId)); // even if ranked high
    await runAutopilot(db, NOW, rng);
    const app = await db.query.applications.findFirst({ where: eq(schema.applications.jobId, jobId) });
    expect(app!.status).toBe("draft"); // held for her, with the warning
    expect(app!.warnings.map((w) => w.code)).toContain("scam-freemail-mismatch");
  });
  it("spontaneous applications are checked too", async () => {
    const [c] = await db.insert(schema.spontaneousCompanies).values({ userId: L, name: "Ditta Esempio", email: "soldi.facili.demo@gmail.com", sourceUrl: "https://ditta.example/lavora", status: "approved" }).returning();
    const app = (await prepareSpontaneous(db, L, c.id))!;
    const stored = await db.query.applications.findFirst({ where: eq(schema.applications.id, app.id) });
    expect(stored!.warnings.map((w) => w.code)).toContain("scam-freemail-mismatch");
  });
});

describe("queue: spacing at send time, no bursts", () => {
  it("six e-mails due at the same moment leave one per run, spaced 5-20 minutes", async () => {
    const jobs = (await emailJobs()).slice(0, 6);
    for (const j of jobs) {
      const a = (await prepareEmailApplication(db, L, j.id))!;
      await approveApplication(db, L, a.id, NOW, rng);
    }
    await db.update(schema.applications).set({ sendAt: NOW }).where(eq(schema.applications.status, "queued"));
    const at = new Date(NOW.getTime() + 60000);
    const r = await processQueue(db, new OutboxTransport(db), at, rng);
    expect(r.sent).toBe(1);
    const next = (await db.select().from(schema.applications).where(eq(schema.applications.status, "queued"))).map((q) => q.sendAt!.getTime()).sort();
    expect(next).toHaveLength(5);
    const gaps = [next[0] - at.getTime(), ...next.slice(1).map((t, i) => t - next[i])].map((ms) => ms / 60000);
    expect(gaps.every((g) => g >= 5 && g <= 20)).toBe(true);
  });
  it("late items are rescheduled after the real history, not all at 08:30", async () => {
    const jobs = (await emailJobs()).slice(0, 3);
    for (const j of jobs) {
      const a = (await prepareEmailApplication(db, L, j.id))!;
      await approveApplication(db, L, a.id, NOW, rng);
    }
    const evening = new Date("2026-10-07T16:30:00Z"); // Wednesday 18:30 Rome
    await db.update(schema.applications).set({ sendAt: new Date(evening.getTime() - 60000) }).where(eq(schema.applications.status, "queued"));
    await processQueue(db, new OutboxTransport(db), evening, rng);
    const times = (await db.select().from(schema.applications).where(eq(schema.applications.status, "queued"))).map((q) => q.sendAt!.getTime()).sort();
    expect(new Set(times).size).toBe(3);
    expect(romeParts(new Date(times[0])).day).toBe(8);
    expect((times[2] - times[0]) / 60000).toBeGreaterThanOrEqual(10);
  });
  it("a row stuck in 'sending' becomes 'failed' and the admin is told", async () => {
    const a = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    await db.update(schema.applications).set({ status: "sending", updatedAt: new Date(NOW.getTime() - 30 * 60000) }).where(eq(schema.applications.id, a.id));
    expect(await recoverStaleSending(db, NOW)).toBe(1);
    expect((await db.query.applications.findFirst({ where: eq(schema.applications.id, a.id) }))!.status).toBe("failed");
    const notes = await db.select().from(schema.notifications).where(eq(schema.notifications.audience, "admin"));
    expect(notes.some((n) => /interrotto/.test(n.text))).toBe(true);
  });
  it("real mode with real sending off: nothing is pretended, the queue just waits", async () => {
    const a = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    const r = await approveApplication(db, L, a.id, NOW, rng);
    const out = await processQueue(db, new OutboxTransport(db), new Date(r.sendAt!.getTime() + 1000), rng, { allowSimulated: false });
    expect(out.sent).toBe(0);
    expect((await db.query.applications.findFirst({ where: eq(schema.applications.id, a.id) }))!.status).toBe("queued");
    expect(await db.select().from(schema.outbox)).toHaveLength(0);
  });
});

describe("Salta and CV files", () => {
  it("'Salta' puts it aside: never sent by the queue, not in Da inviare", async () => {
    const a = (await prepareEmailApplication(db, L, (await emailJobs())[0].id))!;
    await skipApplication(db, M, a.id); // not his: nothing happens
    expect((await db.query.applications.findFirst({ where: eq(schema.applications.id, a.id) }))!.status).toBe("draft");
    await skipApplication(db, L, a.id);
    expect((await db.query.applications.findFirst({ where: eq(schema.applications.id, a.id) }))!.status).toBe("skipped");
    expect((await processQueue(db, new OutboxTransport(db), new Date(NOW.getTime() + 86400000), rng)).sent).toBe(0);
    expect(await approveApplication(db, L, a.id, NOW, rng)).toMatchObject({ ok: false });
  });
  it("only real-looking PDFs are accepted as CVs", () => {
    expect(looksLikePdf(textPdf(["CV"]))).toBe(true);
    expect(looksLikePdf(Buffer.from("%PDF-1.4 but then nothing"))).toBe(false); // truncated / fake
    expect(looksLikePdf(Buffer.from("PK\u0003\u0004 word document..........................."))).toBe(false); // .docx renamed
    expect(looksLikePdf(Buffer.from(""))).toBe(false);
  });
});

describe("other fixes", () => {
  it("W2 never fetches job platforms, even through a redirect", async () => {
    const asked: string[] = [];
    const f = (async (u: string) => {
      asked.push(u);
      if (u.endsWith("robots.txt")) return new Response("");
      return new Response(null, { status: 301, headers: { Location: "https://www.linkedin.com/jobs/view/123" } });
    }) as typeof fetch;
    const p = new PoliteFetcher(db, f, { sleep: async () => {} });
    await expect(p.get("https://site.example/lavora")).rejects.toBeInstanceOf(PlatformNotAllowed);
    expect(asked.some((u) => u.includes("linkedin"))).toBe(false);
  });
  it("a reply can only set a reply outcome, never e.g. 'queued'", async () => {
    const [app] = await db.insert(schema.applications).values({ userId: L, lane: "email", status: "sent", company: "X", toEmail: "a@x.example" }).returning();
    const [rep] = await db.insert(schema.replies).values({ userId: L, applicationId: app.id, fromEmail: "a@x.example", subject: "Re", matchedBy: "thread", receivedAt: NOW }).returning();
    await confirmReply(db, L, rep.id, "queued");
    expect((await db.query.applications.findFirst({ where: eq(schema.applications.id, app.id) }))!.status).toBe("replied");
  });
  it("delete-all removes her rows, keeps the admin's lists and processed e-mails, resets letters", async () => {
    await db.update(schema.templates).set({ body: "Lucia Ferraro 333 000 0000" }).where(eq(schema.templates.userId, L));
    await db.insert(schema.processedMessages).values({ messageId: "<x@y>", kind: "alert", processedAt: NOW });
    await deleteAllMyData(db, L);
    expect((await db.select().from(schema.companyWatchlist)).length).toBeGreaterThan(0);
    expect((await db.select().from(schema.blocklist)).length).toBeGreaterThan(0);
    expect((await db.select().from(schema.processedMessages)).length).toBe(1);
    expect((await db.select().from(schema.templates).where(eq(schema.templates.userId, L))).some((t) => t.body.includes("333"))).toBe(false);
    for (const t of [schema.cvs, schema.applications, schema.sendLog, schema.outbox, schema.replies, schema.notifications, schema.spontaneousCompanies, schema.userJobs, schema.userPrefs, schema.rankAdjustments]) {
      expect(await db.select().from(t).where(eq(t.userId, L))).toHaveLength(0);
    }
    expect((await db.select().from(schema.cvs).where(eq(schema.cvs.userId, M))).length).toBe(1); // his stay
    expect((await db.select().from(schema.userPrefs).where(eq(schema.userPrefs.userId, M))).length).toBeGreaterThan(0);
  });
  it("sign-in: 5 wrong passwords lock the account for 15 minutes", async () => {
    const { signIn } = await import("@/lib/server/auth");
    for (let i = 0; i < 4; i++) expect(await signIn("u@example.com", "wrong", "user")).toBe("wrong");
    expect(await signIn("u@example.com", "wrong", "user")).toBe("locked");
    expect(await signIn("u@example.com", "x", "user")).toBe("locked"); // even the right password, for now
  });
});
