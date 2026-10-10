// Verification screenshots for the animations (brief section 7) into docs/screens/animations/.
// Needs `npm run preview` running.
import { launch } from "./browser.mjs";
const base = process.env.BASE ?? "http://localhost:4321";
const out = (n) => new URL(`../docs/screens/animations/${n}.png`, import.meta.url).pathname;
const browser = await launch();
const errors = [];
const watch = (page) => {
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
};

// Renovation, desktop: drive the timeline with the ?debug=1 slider.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.goto(`${base}/?debug=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  for (const p of [0, 0.1, 0.25, 0.5, 0.62, 0.68, 0.75, 0.9, 1]) {
    await page.evaluate((v) => {
      const input = document.querySelector(".reno-debug input");
      input.value = String(Math.round(v * 1000));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, p);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: out(`reno-desktop-${String(p).replace(".", "")}`) });
  }
  await page.close();
}

// Renovation, mobile: three scenes, each played once.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  watch(page);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  for (const scene of ["prima", "cantiere", "dopo"]) {
    await page.evaluate((s) => document.querySelector(`[data-scene="${s}"]`).scrollIntoView({ block: "center" }), scene);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: out(`reno-mobile-${scene}`) });
  }
  await page.evaluate(() => document.querySelector("[data-check]").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1400);
  await page.screenshot({ path: out(`reno-mobile-checklist`) });
  await page.close();
}

// Hero entrance at 0, 0.5, 1.2, 2.2 s.
for (const w of [390, 1440]) {
  for (const t of [0, 500, 1200, 2200]) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 768 ? 844 : 900 } });
    watch(page);
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(t);
    await page.screenshot({ path: out(`hero-${w}-${t}ms`) });
    await page.close();
  }
}

// Reduced motion: whole home page.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  watch(page);
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: out("home-reduced-motion-1440"), fullPage: true });
  await page.close();
}
console.log(errors.length ? "Console errors:\n" + errors.join("\n") : "No console errors.");
await browser.close();
