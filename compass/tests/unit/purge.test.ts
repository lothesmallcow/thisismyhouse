// A week without being seen: offers go, except those someone keeps. Dismissed ads stay dismissed even
// when the same ad is found again after the clean-up.
import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { schema } from "@/lib/db";
import { addToFolder, createFolder } from "@/lib/server/folders";
import { dismissJob, purgeOldJobs, upsertRawJob } from "@/lib/server/jobs";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));

const T0 = new Date("2026-10-01T09:00:00Z");
const LATER = new Date("2026-10-09T09:00:00Z"); // 8 days on
const ad = (title: string, extra = "") => ({ source: "w1" as const, url: `https://annunci.example/${encodeURIComponent(title)}`, title, company: "Purga Prova Srl", location: "Bergamo", description: `Annuncio di prova per ${title}. ${extra}`.padEnd(200, ".") });

describe("one week, then gone", () => {
  it("unseen offers are deleted; folders, applications, hand-added and open deadlines stay; dismissed ones do not come back", async () => {
    const db = await freshDb();
    const { L, M } = await seedPeople(db, T0);
    const before = (await db.select().from(schema.jobs)).length;
    const dismissed = await upsertRawJob(db, ad("Saldatore a filo"), T0);
    const saved = await upsertRawJob(db, ad("Giardiniere esperto"), T0);
    const open = await upsertRawJob(db, ad("Stage di contabilità analitica", "Scadenza candidature: 30 novembre 2026."), T0);
    const manual = await upsertRawJob(db, { ...ad("Autista patente C"), source: "manual" }, T0, { owners: [L] });
    const plain = await upsertRawJob(db, ad("Pasticcere notturno"), T0);

    await dismissJob(db, L, dismissed.jobId, "nessuno", T0);
    const folder = (await createFolder(db, L, "Da riguardare"))!;
    expect(await addToFolder(db, L, folder, saved.jobId)).toBe(true);

    // Still seen within the week: nothing goes.
    await purgeOldJobs(db, new Date("2026-10-05T09:00:00Z"));
    const mine = [dismissed, saved, open, manual, plain].map((x) => x.jobId);
    expect((await db.select({ id: schema.jobs.id }).from(schema.jobs)).filter((r) => mine.includes(r.id))).toHaveLength(5);
    const removed = await purgeOldJobs(db, LATER);
    const left = new Set((await db.select({ id: schema.jobs.id }).from(schema.jobs)).map((r) => r.id));
    expect(left.has(dismissed.jobId)).toBe(false);
    expect(left.has(plain.jobId)).toBe(false);
    expect(left.has(saved.jobId)).toBe(true); // in a folder
    expect(left.has(open.jobId)).toBe(true); // applications still open
    expect(left.has(manual.jobId)).toBe(true); // added by hand
    expect(removed).toBeGreaterThanOrEqual(2);
    expect(left.size).toBeLessThan(before + 5);
    // Scores and sources of deleted offers went with them.
    expect(await db.select().from(schema.userJobs).where(eq(schema.userJobs.jobId, plain.jobId))).toHaveLength(0);

    // The same ad comes back: dismissed for Lucia (she said no), new for Marco.
    const again = await upsertRawJob(db, ad("Saldatore a filo"), LATER);
    expect(again.created).toBe(true);
    const row = (u: number) => db.query.userJobs.findFirst({ where: and(eq(schema.userJobs.userId, u), eq(schema.userJobs.jobId, again.jobId)) });
    expect((await row(L))?.status).toBe("dismissed");
    expect((await row(M))?.status ?? "new").toBe("new");
  });
});
