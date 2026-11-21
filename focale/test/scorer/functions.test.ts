import { describe, expect, it } from "vitest";
import { onRequestPost as lead } from "../../functions/api/lead";
import { onRequestPost as score } from "../../functions/api/score";
import { CONSENT } from "../../src/scorer/consent";

function kv() {
  const m = new Map<string, string>();
  return {
    m,
    async get(k: string, t?: "json") {
      const v = m.get(k) ?? null;
      return t === "json" && v ? JSON.parse(v) : v;
    },
    async put(k: string, v: string) {
      m.set(k, v);
    },
  };
}
const req = (path: string, body: unknown, origin = "https://www.focusdesign.it", ip = "203.0.113.7") =>
  new Request(`https://www.focusdesign.it${path}`, { method: "POST", headers: { origin, "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(body) });
const ok = { email: "titolare@studio.it", url: "https://studio.it/", score: 54, sector: "fitness", consent: true, consentVersion: CONSENT.version };

describe("/api/lead", () => {
  it("no consent, no email", async () => {
    const store = kv();
    const r = await lead({ request: req("/api/lead", { ...ok, consent: false }), env: { SCORER_KV: store as never } });
    expect(r.status).toBe(400);
    expect(store.m.size).toBe(1); // only the rate-limit counter
  });
  it("stores only URL, score, sector, email and the consent record", async () => {
    const store = kv();
    const r = await lead({ request: req("/api/lead", { ...ok, note: "extra field", pageText: "should not be stored" }), env: { SCORER_KV: store as never } });
    expect(r.status).toBe(200);
    const [, saved] = [...store.m.entries()].find(([k]) => k.startsWith("lead:"))!;
    const rec = JSON.parse(saved);
    expect(Object.keys(rec).sort()).toEqual(["consent", "email", "score", "sector", "url"]);
    expect(rec.consent).toMatchObject({ given: true, version: CONSENT.version, text: CONSENT.text });
    expect(Date.parse(rec.consent.at)).toBeGreaterThan(0);
  });
  it("refuses other sites, bad emails, and too many requests", async () => {
    expect((await lead({ request: req("/api/lead", ok, "https://evil.example"), env: {} })).status).toBe(403);
    expect((await lead({ request: req("/api/lead", { ...ok, email: "nope" }), env: { SCORER_KV: kv() as never } })).status).toBe(400);
    const store = kv();
    const codes = [];
    for (let i = 0; i < 7; i++) codes.push((await lead({ request: req("/api/lead", ok), env: { SCORER_KV: store as never } })).status);
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes[6]).toBe(429);
  });
});

describe("/api/score", () => {
  it("refuses other sites and private or social addresses before fetching anything", async () => {
    expect((await score({ request: req("/api/score", { url: "studio.it" }, "https://evil.example"), env: {} })).status).toBe(403);
    const priv = await score({ request: req("/api/score", { url: "http://127.0.0.1/admin" }), env: {} });
    expect(priv.status).toBe(400);
    const social = await score({ request: req("/api/score", { url: "instagram.com/studio" }, undefined, "198.51.100.9"), env: {} });
    expect(social.status).toBe(400);
    const body = await social.json();
    expect(body.error).toMatch(/profilo social/);
    expect(body.code).toBe("social");
  });
});
