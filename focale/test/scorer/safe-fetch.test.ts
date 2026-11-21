import { describe, expect, it } from "vitest";
import { isPrivateIp, normalizeUrl, safeFetch, ScorerError } from "../../src/scorer/safe-fetch";

const html = (body = "<html><body>ok</body></html>", status = 200, headers: Record<string, string> = { "content-type": "text/html; charset=utf-8" }) =>
  new Response(body, { status, headers });
const publicDns = async () => ["93.184.216.34"];

describe("url shape", () => {
  it("accepts what people type", () => {
    expect(normalizeUrl("studio.it").toString()).toBe("https://studio.it/");
    expect(normalizeUrl(" https://www.studio.it/pilates#top ").toString()).toBe("https://www.studio.it/pilates");
  });
  it.each(["ftp://studio.it", "file:///etc/passwd", "http://127.0.0.1", "http://[::1]/", "http://10.0.0.5", "http://2130706433", "http://0x7f000001", "http://localhost:8080", "http://router.local", "http://intranet", "https://studio.it:8443", "https://user:pw@studio.it", "javascript:alert(1)"])(
    "refuses %s",
    (u) => expect(() => normalizeUrl(u)).toThrow(ScorerError),
  );
});

describe("private addresses", () => {
  it.each(["10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "127.0.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:10.0.0.1", "::ffff:127.0.0.1", "64:ff9b::10.0.0.1", "2001:db8::1"])(
    "%s is private",
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  );
  it.each(["93.184.216.34", "8.8.8.8", "172.32.0.1", "2a00:1450:4002:80b::200e", "::ffff:93.184.216.34"])("%s is public", (ip) => expect(isPrivateIp(ip)).toBe(false));
});

describe("safeFetch", () => {
  it("refuses a host that resolves to a private address", async () => {
    await expect(safeFetch("https://evil.example.com", { resolve: async () => ["10.0.0.1"], fetchImpl: async () => html() })).rejects.toMatchObject({ code: "blocked" });
  });
  it("re-checks every redirect, and stops one that points inside", async () => {
    const fetchImpl = async (u: string | URL | Request) => (String(u).includes("start") ? new Response(null, { status: 302, headers: { location: "http://internal.example.com/admin" } }) : html());
    const resolve = async (h: string) => (h === "internal.example.com" ? ["192.168.0.10"] : ["93.184.216.34"]);
    await expect(safeFetch("https://site.example.com/start", { resolve, fetchImpl: fetchImpl as typeof fetch })).rejects.toMatchObject({ code: "blocked" });
  });
  it("stops after too many redirects", async () => {
    const fetchImpl = async (u: string | URL | Request) => new Response(null, { status: 301, headers: { location: `${String(u)}x` } });
    await expect(safeFetch("https://loop.example.com/", { resolve: publicDns, fetchImpl: fetchImpl as typeof fetch })).rejects.toMatchObject({ code: "status" });
  });
  it("follows a normal redirect and returns the final URL", async () => {
    const fetchImpl = async (u: string | URL | Request) => (String(u) === "http://studio.example.com/" ? new Response(null, { status: 301, headers: { location: "https://www.studio.example.com/" } }) : html());
    const r = await safeFetch("http://studio.example.com/", { resolve: publicDns, fetchImpl: fetchImpl as typeof fetch });
    expect(r.finalUrl).toBe("https://www.studio.example.com/");
  });
  it("refuses what is not a web page and caps the size", async () => {
    await expect(safeFetch("https://a.example.com/x.pdf", { resolve: publicDns, fetchImpl: (async () => html("%PDF", 200, { "content-type": "application/pdf" })) as typeof fetch })).rejects.toMatchObject({ code: "not-html" });
    const big = "<p>" + "x".repeat(3_000_000) + "</p>";
    const r = await safeFetch("https://a.example.com/", { resolve: publicDns, maxBytes: 100_000, fetchImpl: (async () => html(big)) as typeof fetch });
    expect(r.truncated).toBe(true);
    expect(r.html.length).toBeLessThanOrEqual(100_000);
  });
  it("gives up on a slow site", async () => {
    const slow = ((_u: unknown, init?: RequestInit) =>
      new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))))) as typeof fetch;
    await expect(safeFetch("https://slow.example.com/", { resolve: publicDns, fetchImpl: slow, timeoutMs: 50 })).rejects.toMatchObject({ code: "too-slow" });
  });
  it("reports error statuses", async () => {
    await expect(safeFetch("https://a.example.com/", { resolve: publicDns, fetchImpl: (async () => html("no", 404)) as typeof fetch })).rejects.toMatchObject({ code: "status" });
  });
});
