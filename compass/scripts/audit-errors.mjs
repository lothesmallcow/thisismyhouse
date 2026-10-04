// Forces error states and checks PWA + sessions. Writes docs/audit/errors/*.jpg and prints JSON.
// Needs: the demo server on :3000 and a second server on :3300 whose database is unreachable.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const OUT = "docs/audit/errors";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});
const out = {};
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/entra");
await p.fill("#email", "demo@example.com");
await p.fill("#password", "demo-compass");
await p.click("button:has-text('Entra')");
await p.waitForURL(/offerte/);

// PWA: manifest, service worker, long session
const manifest = await (await p.request.get("http://localhost:3000/manifest.webmanifest")).json();
await p.waitForFunction(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready.then(() => true), null, { timeout: 15000 });
await p.reload();
out.serviceWorker = await p.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  return { registered: Boolean(r), scope: r?.scope ?? null, controlling: Boolean(navigator.serviceWorker.controller) };
});
out.manifest = { name: manifest.name, start_url: manifest.start_url, display: manifest.display, icons: manifest.icons.map((i) => i.sizes + (i.purpose ? " " + i.purpose : "")) };
const cookie = (await ctx.cookies()).find((c) => c.name === "compass_session");
out.session = { httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, daysValid: Math.round((cookie.expires * 1000 - Date.now()) / 86400000) };

// 1. No internet. Playwright's offline mode does not reach service-worker fetches, so we check the
// two halves separately: the offline page is in the SW cache, and the page itself.
out.offlineCached = await p.evaluate(async () => Boolean(await caches.match("/offline.html")));
await p.goto("http://localhost:3000/offline.html");
out.offline = (await p.locator("body").innerText()).replace(/\s+/g, " ");
await p.screenshot({ path: `${OUT}/1-senza-internet.jpg`, type: "jpeg", quality: 60 });

// 2. Empty results
await p.goto("http://localhost:3000/offerte?giorni=3&paga=32000&orario=part&casa=1&settore=Informatica");
out.empty = await p.locator("main").innerText().then((t) => t.split("\n").filter((l) => /Nessuna|Appena|Prova/.test(l)).join(" | "));
await p.screenshot({ path: `${OUT}/2-nessun-risultato.jpg`, type: "jpeg", quality: 60, fullPage: true });

// 3. Server/database failure (second server with an unreachable database, same session cookie)
const broken = await b.newContext({ viewport: { width: 390, height: 844 } });
await broken.addCookies([{ ...cookie, domain: "localhost", path: "/" }].map((c) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, httpOnly: true, sameSite: "Lax" })));
const q = await broken.newPage();
const res = await q.goto("http://localhost:3300/offerte");
out.serverError = { status: res.status(), text: (await q.locator("body").innerText()).slice(0, 200) };
await q.screenshot({ path: `${OUT}/3-errore-server.jpg`, type: "jpeg", quality: 60 });

// 4. Mailbox password rejected: what the admin sees
const admin = await b.newContext({ viewport: { width: 1280, height: 900 } });
const a = await admin.newPage();
await a.goto("http://localhost:3000/admin/entra");
await a.fill("#email", "admin@example.com");
await a.fill("#password", "admin-compass");
await a.click("button:has-text('Entra')");
await a.waitForURL(/admin$/);
out.adminAlert = (await a.locator("main").innerText()).split("\n").filter((l) => /accesso rifiutato/.test(l)).slice(0, 1);
await a.screenshot({ path: `${OUT}/4-casella-password-admin.jpg`, type: "jpeg", quality: 60 });
await a.goto("http://localhost:3000/admin/fonti");
out.health = (await a.locator("table").first().innerText()).split("\n").filter((l) => /^mailbox/.test(l));
await a.screenshot({ path: `${OUT}/5-casella-password-fonti.jpg`, type: "jpeg", quality: 60, fullPage: true });
// what she sees meanwhile: her app keeps working, with the last update time
await p.goto("http://localhost:3000/offerte");
out.herViewDuringMailboxFailure = (await p.locator("header").first().innerText()).replace(/\s+/g, " ");
await b.close();
console.log(JSON.stringify(out, null, 2));
fs.writeFileSync("docs/audit/errors/result.json", JSON.stringify(out, null, 2));
