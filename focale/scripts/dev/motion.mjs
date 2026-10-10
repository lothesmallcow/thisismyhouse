// Frames of the home motion at 1440: hero sequence and the pinned reel.
import { launch } from "../browser.mjs";
const base = process.env.BASE ?? "http://localhost:4321";
const b = await launch();
const errors = [];
for (const t of []) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(base + "/", { waitUntil: "domcontentloaded" });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => window.scrollTo(0, 420));
  await p.waitForTimeout(t);
  await p.screenshot({ path: `/tmp/claude-0/mo-hero-${t}.png` });
  await p.close();
}
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", (e) => errors.push(String(e)));
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(5000);
for (const [i, d] of [0, 500, 1000, 1500].entries()) {
  const top = await p.evaluate(() => {
    const el = document.querySelector("[data-reel]");
    const spacer = el.parentElement.classList.contains("pin-spacer") ? el.parentElement : el;
    return spacer.getBoundingClientRect().top + window.scrollY;
  });
  if (i === 0) console.log("reel top", top, await p.evaluate(() => document.querySelector("[data-reel]").className));
  await p.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), top + d);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/tmp/claude-0/mo-reel-${i}.png` });
}
console.log(errors.join("\n") || "no errors");
await b.close();
