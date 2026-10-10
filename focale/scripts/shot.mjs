// Quick screenshot helper: node scripts/shot.mjs <path> <width> <out.png> [--full] [--reduce] [--wait=ms] [--scroll=px] [--height=px]
import { launch } from "./browser.mjs";
const [path = "/", width = "1440", out = "shot.png", ...flags] = process.argv.slice(2);
const opt = (k) => flags.find((f) => f.startsWith(`--${k}`));
const val = (k, d) => (opt(k)?.split("=")[1] ?? d);
const base = process.env.BASE ?? "http://localhost:4321";
const w = Number(width);
const browser = await launch();
const page = await browser.newPage({
  viewport: { width: w, height: Number(val("height", w < 768 ? 844 : 900)) },
  deviceScaleFactor: 1,
  reducedMotion: opt("reduce") ? "reduce" : "no-preference",
});
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(base + path, { waitUntil: "networkidle" });
if (opt("scroll")) {
  await page.evaluate((y) => window.scrollTo(0, y), Number(val("scroll", 0)));
}
await page.waitForTimeout(Number(val("wait", 600)));
await page.screenshot({ path: out, fullPage: !!opt("full") });
if (errors.length) console.log("ERRORS:", errors.join("\n"));
await browser.close();
