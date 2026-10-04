import { describe, expect, it } from "vitest";
import { W3_DAILY_CAP, W3Gate, type W3Response } from "@/lib/sources/web/w3-gate";

const page = "https://www.linkedin.com/jobs/view/4012345601";
const ok: W3Response = { status: 200, finalUrl: page, body: "<html>job</html>" };
function gate(responses: W3Response[] = [ok], enabled = true) {
  let clock = 0;
  const waits: number[] = [];
  let calls = 0;
  const g = new W3Gate(
    { enabled, usedToday: 0, stoppedToday: false, lastFetchAt: null },
    async () => responses[Math.min(calls++, responses.length - 1)],
    { now: () => clock, sleep: async (ms) => void (waits.push(ms), (clock += ms)) },
  );
  return { g, waits, calls: () => calls };
}

describe("W3 gate", () => {
  it("is off by default and never calls the fetcher when off", async () => {
    const { g, calls } = gate([ok], false);
    expect(await g.fetch(page)).toEqual({ ok: false, reason: "disabled" });
    expect(calls()).toBe(0);
  });
  it("only single job pages of the three platforms", async () => {
    const { g, calls } = gate();
    expect((await g.fetch("https://www.linkedin.com/jobs/search?keywords=x")).ok).toBe(false);
    expect((await g.fetch("https://example.com/job")).ok).toBe(false);
    expect(calls()).toBe(0);
  });
  it("caps at 20 per day", async () => {
    const { g, calls } = gate();
    for (let i = 0; i < W3_DAILY_CAP; i++) expect((await g.fetch(page)).ok).toBe(true);
    expect(await g.fetch(page)).toEqual({ ok: false, reason: "cap" });
    expect(calls()).toBe(20);
  });
  it("waits at least 10 seconds between fetches", async () => {
    const { g, waits } = gate();
    await g.fetch(page);
    await g.fetch(page);
    await g.fetch(page);
    expect(waits).toEqual([10_000, 10_000]);
  });
  it.each([
    [{ status: 429, finalUrl: page, body: "" }, "blocked"],
    [{ status: 403, finalUrl: page, body: "" }, "blocked"],
    [{ status: 200, finalUrl: "https://www.linkedin.com/authwall?trk=x", body: "" }, "login-wall"],
    [{ status: 200, finalUrl: page, body: "Please complete this captcha" }, "captcha"],
  ])("stops for the day on %o", async (bad, reason) => {
    const { g, calls } = gate([bad as W3Response, ok]);
    expect(await g.fetch(page)).toEqual({ ok: false, reason });
    expect(await g.fetch(page)).toEqual({ ok: false, reason: "stopped" });
    expect(calls()).toBe(1);
  });
});
