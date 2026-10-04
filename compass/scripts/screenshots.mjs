// Captures the README screenshots from a running demo instance (npm run demo).
// Usage: node scripts/screenshots.mjs [baseUrl]
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = "docs/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {});

async function shoot(ctx, path, name, opts = {}) {
  const page = await ctx.newPage();
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: Boolean(opts.full) });
  await page.close();
}

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const laptop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await shoot(laptop, "/", "landing");
await shoot(laptop, "/abbonamento", "abbonamento");
for (const ctx of [phone, laptop]) {
  const p = await ctx.newPage();
  await p.goto(BASE + "/entra");
  await p.fill("#email", "demo@example.com");
  await p.fill("#password", "demo-compass");
  await p.getByRole("button", { name: "Entra", exact: true }).click();
  await p.waitForURL(/offerte|benvenuto/);
  await p.close();
}
const admin = await browser.newContext({ viewport: { width: 1280, height: 800 } });
{
  const p = await admin.newPage();
  await p.goto(BASE + "/admin/entra");
  await p.fill("#email", "admin@example.com");
  await p.fill("#password", "admin-compass");
  await p.getByRole("button", { name: "Entra", exact: true }).click();
  await p.waitForURL(/admin$/);
  await p.close();
}
const firstJob = await (async () => {
  const p = await phone.newPage();
  await p.goto(BASE + "/offerte");
  const href = await p.locator('a[href^="/offerte/"]').filter({ hasNotText: "Aggiungi" }).first().getAttribute("href");
  await p.close();
  return href.replace(/[?#].*$/, "");
})();
await shoot(phone, "/offerte", "phone-offerte");
await shoot(phone, firstJob, "phone-offerta");
await shoot(phone, "/candidature", "phone-candidature");
await shoot(phone, "/benvenuto/3?ritorno=profilo", "phone-onboarding");
await shoot(laptop, "/offerte", "laptop-offerte");
// The student account: career paths by year of study, timeline, chosen companies.
const student = await browser.newContext({ viewport: { width: 1280, height: 800 } });
{
  const p = await student.newPage();
  await p.goto(BASE + "/entra");
  await p.fill("#email", "studente@example.com");
  await p.fill("#password", "demo-compass");
  await p.getByRole("button", { name: "Entra", exact: true }).click();
  await p.waitForURL(/offerte|benvenuto/);
  await p.close();
}
await shoot(student, "/offerte", "student-offerte");
await shoot(student, "/percorsi", "student-percorsi");
await shoot(student, "/aziende", "student-aziende");
await shoot(laptop, "/profilo/esperienze", "laptop-esperienze");
await shoot(admin, "/admin/fonti", "admin-fonti");
await shoot(admin, "/admin/metriche", "admin-metriche");
// Images for the printable Italian guide (docs/come-si-usa.md), phone size, top of the screen only.
fs.mkdirSync("docs/guida", { recursive: true });
const guide = async (path, name) => {
  const page = await phone.newPage();
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `docs/guida/${name}.png` });
  await page.close();
};
await guide("/offerte", "1-offerte");
await guide(firstJob, "2-offerta");
await guide(firstJob + "/kit", "3-kit");
await guide("/da-inviare", "4-da-inviare");
await guide("/candidature", "5-candidature");
await browser.close();
console.log(`screenshots in ${OUT}/ and docs/guida/`);
