// Plans: searches by hand per day and the wait between two, by plan.
import { describe, expect, it, vi } from "vitest";
import { planOf, scanStatus } from "@/lib/core/plans";
import { getPlan, getScanStatus, recordScan, setPlan } from "@/lib/server/plans";
import { freshDb, seedPeople } from "./helpers/db";

vi.mock("server-only", () => ({}));
const NOW = new Date("2026-10-06T09:00:00Z");
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000);

describe("searches by hand", () => {
  it("free: 3 a day, one an hour; the countdown says when", () => {
    const free = planOf("free");
    expect(scanStatus(free, [], NOW)).toEqual({ left: 3, nextAt: null });
    expect(scanStatus(free, [ago(20)], NOW)).toEqual({ left: 2, nextAt: new Date(ago(20).getTime() + 60 * 60_000) });
    expect(scanStatus(free, [ago(90)], NOW).nextAt).toBeNull();
    // All three used: the next one when the oldest is a day old
    const s = scanStatus(free, [ago(600), ago(300), ago(120)], NOW);
    expect(s.left).toBe(0);
    expect(s.nextAt).toEqual(new Date(ago(600).getTime() + 86_400_000));
    // Older than a day: not counted
    expect(scanStatus(free, [ago(2000)], NOW).left).toBe(3);
  });
  it("premium: more searches, shorter wait", () => {
    expect(scanStatus(planOf("premium"), [ago(6)], NOW)).toEqual({ left: 29, nextAt: null });
    expect(planOf("nonsense").key).toBe("free");
  });
  it("a paid plan is a free trial; the searches are counted per person", async () => {
    const db = await freshDb();
    const { L } = await seedPeople(db, NOW);
    expect((await getPlan(db, L)).key).toBe("free");
    await recordScan(db, L, ago(10));
    expect((await getScanStatus(db, L, NOW)).nextAt).not.toBeNull();
    await setPlan(db, L, "premium", NOW);
    const p = await getPlan(db, L);
    expect(p.key).toBe("premium");
    expect(p.trial).toBe(true);
    expect(await getScanStatus(db, L, NOW)).toMatchObject({ left: 29, nextAt: null });
  });
});
