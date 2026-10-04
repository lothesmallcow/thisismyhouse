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
  await p.click("button:has-text('Entra')");
  await p.waitForURL(/offerte/);
  await p.close();
}
const admin = await browser.newContext({ viewport: { width: 1280, height: 800 } });
{
  const p = await admin.newPage();
  await p.goto(BASE + "/admin/entra");
  await p.fill("#email", "admin@example.com");
  await p.fill("#password", "admin-compass");
  await p.click("button:has-text('Entra')");
  await p.waitForURL(/admin$/);
  await p.close();
}
await shoot(phone, "/offerte", "phone-offerte");
await shoot(phone, "/offerte/2", "phone-offerta");
await shoot(phone, "/candidature", "phone-candidature");
await shoot(phone, "/benvenuto/3?ritorno=profilo", "phone-onboarding");
await shoot(laptop, "/offerte", "laptop-offerte");
await shoot(admin, "/admin/fonti", "admin-fonti");
await shoot(admin, "/admin/metriche", "admin-metriche");
await browser.close();
console.log(`screenshots in ${OUT}/`);
