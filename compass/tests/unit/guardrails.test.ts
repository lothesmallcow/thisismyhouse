import { describe, expect, it } from "vitest";
import {
  checkSend,
  DEFAULT_GUARDRAILS,
  effectiveDailyCap,
  HARD_MAX_PER_DAY,
  inSendWindow,
  scheduleSend,
  type SendCandidate,
} from "@/lib/core/guardrails";
import { romeParts } from "@/lib/core/time";

const cand: SendCandidate = {
  jobId: 7,
  company: "Rossi Srl",
  title: "Impiegata amministrativa",
  description: "Inviare CV a hr@rossi.it",
  recipient: "hr@rossi.it",
  spontaneous: false,
  level: "molto",
  scamFlags: [],
  attachmentBytes: 200_000,
};
const blocklist = { companies: [], domains: [], keywords: [] };
// Monday 5 Oct 2026, 10:00 in Rome (UTC+2)
const monday10 = new Date("2026-10-05T08:00:00Z");
const ctx = (over: Partial<Parameters<typeof checkSend>[1]> = {}) => ({
  mode: "manual" as const,
  settings: DEFAULT_GUARDRAILS,
  history: [],
  blocklist,
  now: monday10,
  ...over,
});

describe("checkSend", () => {
  it("a clean candidate passes", () => {
    expect(checkSend(cand, ctx())).toEqual({ ok: true, blockers: [], warnings: [] });
  });
  it("kill switch blocks everything", () => {
    expect(checkSend(cand, ctx({ settings: { ...DEFAULT_GUARDRAILS, killSwitch: true } })).blockers[0].code).toBe("kill-switch");
  });
  it("never the same job twice", () => {
    const history = [{ jobId: 7, company: "Altra", recipient: "x@y.it", at: new Date("2026-01-01"), spontaneous: false }];
    expect(checkSend(cand, ctx({ history })).blockers.map((b) => b.code)).toContain("repeat-job");
  });
  it("same company at most once per 60 days", () => {
    const recent = [{ jobId: 1, company: "ROSSI S.R.L.", recipient: "a@rossi.it", at: new Date("2026-09-01"), spontaneous: false }];
    expect(checkSend(cand, ctx({ history: recent })).blockers.map((b) => b.code)).toContain("repeat-company");
    const old = [{ ...recent[0], at: new Date("2026-07-01") }];
    expect(checkSend(cand, ctx({ history: old })).ok).toBe(true);
  });
  it("spontaneous: once per 6 months per company", () => {
    const sp = { ...cand, jobId: null, spontaneous: true };
    const h = [{ jobId: null, company: "Rossi", recipient: "hr@rossi.it", at: new Date("2026-06-01"), spontaneous: true }];
    expect(checkSend(sp, ctx({ history: h })).blockers.map((b) => b.code)).toContain("repeat-spontaneous");
    expect(checkSend(sp, ctx({ history: [{ ...h[0], at: new Date("2026-03-01") }] })).ok).toBe(true);
  });
  it("blocklist by company, domain and keyword", () => {
    expect(checkSend(cand, ctx({ blocklist: { ...blocklist, companies: ["Rossi"] } })).ok).toBe(false);
    expect(checkSend(cand, ctx({ blocklist: { ...blocklist, domains: ["rossi.it"] } })).ok).toBe(false);
    expect(checkSend(cand, ctx({ blocklist: { ...blocklist, keywords: ["amministrativa"] } })).ok).toBe(false);
  });
  it("attachments over 2 MB are refused", () => {
    expect(checkSend({ ...cand, attachmentBytes: 3_000_000 }, ctx()).blockers.map((b) => b.code)).toContain("attachment-too-big");
  });
  it("scam flags: warning when she approves, blocker for autopilot", () => {
    const flagged = { ...cand, scamFlags: [{ id: "asks-payment", warning: "Chiede soldi" }] };
    const manual = checkSend(flagged, ctx());
    expect(manual.ok).toBe(true);
    expect(manual.warnings).toHaveLength(1);
    const auto = checkSend(flagged, ctx({ mode: "autopilot", settings: { ...DEFAULT_GUARDRAILS, autopilot: true } }));
    expect(auto.ok).toBe(false);
  });
  it("autopilot only sends 'Molto adatta' and only when switched on", () => {
    expect(checkSend(cand, ctx({ mode: "autopilot" })).blockers.map((b) => b.code)).toContain("autopilot-off");
    const on = { ...DEFAULT_GUARDRAILS, autopilot: true };
    expect(checkSend(cand, ctx({ mode: "autopilot", settings: on })).ok).toBe(true);
    expect(checkSend({ ...cand, level: "adatta" }, ctx({ mode: "autopilot", settings: on })).ok).toBe(false);
  });
  it("invalid recipient", () => {
    expect(checkSend({ ...cand, recipient: "not-an-email" }, ctx()).ok).toBe(false);
  });
});

describe("daily cap", () => {
  it("defaults to 10, 3 in the first week, never above 20", () => {
    expect(effectiveDailyCap(DEFAULT_GUARDRAILS, monday10)).toBe(10);
    expect(effectiveDailyCap({ ...DEFAULT_GUARDRAILS, goLiveAt: new Date("2026-10-03") }, monday10)).toBe(3);
    expect(effectiveDailyCap({ ...DEFAULT_GUARDRAILS, dailyCap: 99 }, monday10)).toBe(HARD_MAX_PER_DAY);
  });
});

describe("scheduleSend", () => {
  const rng = () => 0.5;
  it("waits at least the 15-minute undo window", () => {
    const t = scheduleSend(monday10, DEFAULT_GUARDRAILS, [], rng)!;
    expect(t.getTime() - monday10.getTime()).toBeGreaterThanOrEqual(15 * 60000);
    expect(inSendWindow(t, DEFAULT_GUARDRAILS)).toBe(true);
  });
  it("spaces sends by 5-20 minutes", () => {
    const prev = new Date(monday10.getTime() + 30 * 60000);
    const t = scheduleSend(monday10, DEFAULT_GUARDRAILS, [prev], rng)!;
    const gap = (t.getTime() - prev.getTime()) / 60000;
    expect(gap).toBeGreaterThanOrEqual(5);
    expect(gap).toBeLessThanOrEqual(20);
  });
  it("evening requests go to the next morning 08:30-08:40", () => {
    const evening = new Date("2026-10-05T17:30:00Z"); // 19:30 Rome
    const t = scheduleSend(evening, DEFAULT_GUARDRAILS, [], rng)!;
    const p = romeParts(t);
    expect(p.day).toBe(6);
    expect(p.hour).toBe(8);
    expect(p.minute).toBeGreaterThanOrEqual(30);
  });
  it("Friday evening goes to Monday", () => {
    const fri = new Date("2026-10-09T17:00:00Z"); // 19:00 Rome, Friday
    const p = romeParts(scheduleSend(fri, DEFAULT_GUARDRAILS, [], rng)!);
    expect(p.weekday).toBe(1);
    expect(p.day).toBe(12);
  });
  it("a full day moves to the next working day", () => {
    const sentToday = Array.from({ length: 10 }, (_, i) => new Date(monday10.getTime() - i * 60000));
    const p = romeParts(scheduleSend(monday10, DEFAULT_GUARDRAILS, sentToday, rng)!);
    expect(p.day).toBe(6);
  });
  it("works across the DST change (25 Oct 2026)", () => {
    const sat = new Date("2026-10-24T10:00:00Z");
    const p = romeParts(scheduleSend(sat, DEFAULT_GUARDRAILS, [], rng)!);
    expect(p.weekday).toBe(1);
    expect(p.hour).toBe(8);
  });
});
