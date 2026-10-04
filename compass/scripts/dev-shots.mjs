import { chromium } from "@playwright/test";
const OUT = process.argv[2];
const pages = process.argv.slice(3);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const vp of [{ name: "phone", width: 390, height: 844 }, { name: "laptop", width: 1366, height: 860 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // sign in as her (skip with ANON=1)
  if (process.env.ANON !== "1") {
  await page.goto("http://localhost:3000/entra");
  await page.fill("#email", "demo@example.com");
  await page.fill("#password", "demo-compass");
  await page.click("button:has-text('Entra')");
  await page.waitForURL(/offerte|benvenuto/);
  }
  for (const p of pages) {
    await page.goto("http://localhost:3000" + p);
    await page.waitForLoadState("networkidle");
    const name = p.replace(/[^\w]+/g, "_") || "root";
    await page.screenshot({ path: `${OUT}/${vp.name}${name}.png`, fullPage: process.env.FULL === "1" });
  }
  await ctx.close();
}
await browser.close();
