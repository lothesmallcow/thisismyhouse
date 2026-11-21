/**
 * Browser check of the scorer page without the Cloudflare runtime: /api/score and /api/lead are
 * answered by Playwright with the real engine (fixture page), so the whole client flow runs:
 * submit, progress, report, sector switch, consent refusal, lead sent. Needs `npm run preview`.
 */
import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { fromPartsAll } from "../../src/scorer/analyze";

const base = process.env.BASE ?? "http://localhost:4321";
const html = readFileSync(new URL("../../test/scorer/fixtures/new-studio.html", import.meta.url), "utf8");
const full = fromPartsAll("https://www.studio-esempio.it/", html, null, {});
const exe = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((x) => existsSync(x));
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errors: string[] = [];
p.on("pageerror", (e) => errors.push(e.message));
let leadBody: Record<string, unknown> | null = null;
await p.route("**/api/score", async (r) => {
  await new Promise((res) => setTimeout(res, 1200));
  r.fulfill({ json: full });
});
const leadStatus = Number(process.env.LEAD_STATUS || 200);
await p.route("**/api/lead", (r) => {
  leadBody = r.request().postDataJSON();
  r.fulfill(leadStatus === 200 ? { json: { ok: true } } : { status: leadStatus, json: { error: "x" } });
});
await p.goto(base + "/analisi-sito/", { waitUntil: "networkidle" });
await p.click("button[type=submit]");
const emptyErr = await p.textContent("[data-sc-error]");
await p.fill("#sc-url", "studio-esempio.it");
await p.click("button[type=submit]");
await p.waitForSelector("[data-sc-result]:not([hidden])");
await p.waitForTimeout(1500);
const total = await p.textContent("[data-sc-total]");
const sector = await p.inputValue("[data-sc-sector-now]");
await p.selectOption("[data-sc-sector-now]", "altro");
const totalAltro = await p.textContent("[data-sc-total]");
await p.fill("#sc-email", "test@example.com");
await p.click("[data-sc-lead] button[type=submit]");
const noConsent = await p.textContent("[data-sc-lead-error]");
const sentWithout = leadBody;
await p.check("[data-sc-consent]");
await p.click("[data-sc-lead] button[type=submit]");
if (leadStatus === 200) await p.waitForSelector("[data-sc-lead-ok]:not([hidden])");
else {
  await p.waitForSelector('[data-sc-lead-error] a[href="/anteprima-gratuita/"]');
  console.log("fallback:", await p.textContent("[data-sc-lead-error]"));
}
await p.screenshot({ path: "screenshots/analisi-390-flow.png", fullPage: false });
console.log({ emptyErr, total, sector, totalAltro, noConsent, sentWithout, leadBody, errors, expected: { fitness: full.results.fitness.report.total, altro: full.results.altro.report.total } });
await b.close();
const okAll = emptyErr && Number(total) === full.results.fitness.report.total && sector === "fitness" && Number(totalAltro) === full.results.altro.report.total && noConsent && !sentWithout && leadBody && !errors.length;
process.exit(okAll ? 0 : 1);
