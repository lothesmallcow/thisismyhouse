// "Non mi interessa" = gone for good for that person, and only that offer: the exact links it was
// found at and the same ad (title, company, city) on another site. Nothing else is touched.
import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { schema } from "@/lib/db";
import { dismissJob, dismissedList, purgeOldJobs, undoDismissal, upsertRawJob } from "@/lib/server/jobs";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");
const ad = (title: string, url: string, city = "Bergamo", company = "Officine Prova Srl") => ({ source: "w1" as const, url, title, company, location: city, description: `Cerchiamo ${title} per la sede di ${city}. Contratto a tempo pieno.`.padEnd(200, ".") });

describe("dismiss", () => {
  it("only that offer, for that person only, never again; it can be undone", async () => {
    const db = await freshDb();
    const { L, M } = await seedPeople(db, NOW);
    const row = (u: number, jobId: number) => db.query.userJobs.findFirst({ where: and(eq(schema.userJobs.userId, u), eq(schema.userJobs.jobId, jobId)) });

    const a = await upsertRawJob(db, ad("Saldatore a filo", "https://annunci.example/saldatore-1"), NOW);
    const otherRole = await upsertRawJob(db, ad("Verniciatore industriale", "https://annunci.example/verniciatore"), NOW);
    const otherCity = await upsertRawJob(db, ad("Saldatore a filo", "https://annunci.example/saldatore-brescia", "Brescia"), NOW);
    expect(await row(L, a.jobId)).toBeTruthy();

    await dismissJob(db, L, a.jobId, "nessuno", NOW);
    expect(await row(L, a.jobId)).toBeUndefined(); // gone from her account
    expect(await row(M, a.jobId)).toBeTruthy(); // still there for Marco
    expect((await dismissedList(db, L)).map((d) => d.title)).toEqual(["Saldatore a filo"]);

    // The same ad on another site, and the same link again: never proposed again to her.
    const elsewhere = await upsertRawJob(db, ad("Saldatore a filo", "https://altrosito.example/job/77"), NOW);
    expect(await row(L, elsewhere.jobId)).toBeUndefined();
    const sameLink = await upsertRawJob(db, { ...ad("Saldatore a filo MIG/MAG", "https://annunci.example/saldatore-1"), company: "Officine Prova" }, NOW);
    expect(await row(L, sameLink.jobId)).toBeUndefined();
    // Another role at the same company, the same role in another city: untouched.
    expect(await row(L, otherRole.jobId)).toBeTruthy();
    expect(await row(L, otherCity.jobId)).toBeTruthy();

    // After 3 days it leaves the "Non mi interessano" list by itself and can no longer be undone, but stays blocked.
    const key = (await dismissedList(db, L, NOW))[0].dedupeKey;
    const WEEK_ON = new Date(NOW.getTime() + 4 * 86_400_000);
    expect(await dismissedList(db, L, WEEK_ON)).toHaveLength(0);
    await undoDismissal(db, L, key, WEEK_ON);
    expect(await row(L, a.jobId)).toBeUndefined();
    // Within the week: undone, the offer comes back.
    await undoDismissal(db, L, key, NOW);
    expect(await row(L, a.jobId)).toBeTruthy();
    expect(await dismissedList(db, L, NOW)).toHaveLength(0);
  });

  it("an offer only they could see (added by hand): back with Annulla, deleted once that is no longer possible", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, NOW);
    const find = (id: number) => db.query.jobs.findFirst({ where: eq(schema.jobs.id, id) });
    const mine = await upsertRawJob(db, { ...ad("Tornitore CNC", "https://annunci.example/tornitore"), source: "manual" }, NOW, { owners: [L] });
    await dismissJob(db, L, mine.jobId, "nessuno", NOW);
    await undoDismissal(db, L, (await dismissedList(db, L, NOW))[0].dedupeKey, NOW);
    expect(await db.query.userJobs.findFirst({ where: and(eq(schema.userJobs.userId, L), eq(schema.userJobs.jobId, mine.jobId)) })).toBeTruthy();
    // Dismissed again and left: the clean-up within the undo days keeps it, after them deletes it.
    await dismissJob(db, L, mine.jobId, "nessuno", NOW);
    await purgeOldJobs(db, new Date(NOW.getTime() + 2 * 86_400_000));
    expect(await find(mine.jobId)).toBeTruthy();
    await purgeOldJobs(db, new Date(NOW.getTime() + 4 * 86_400_000));
    expect(await find(mine.jobId)).toBeUndefined();
  });
});
