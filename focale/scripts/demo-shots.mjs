// Screenshots of the demo sites for /lavori and the case pages, plus the example pitch page images.
// Needs the built site served locally: `npm run build && npm run preview` in another terminal.
import { launch } from "./browser.mjs";

const base = process.env.BASE ?? "http://localhost:4321";
const demos = ["arcadi-ristrutturazioni", "cascina-rovere", "villa-ortensia"];
const out = (p) => new URL(`../src/assets/${p}`, import.meta.url).pathname;
const hideBanner = ".demo-banner{display:none!important} body.demo{padding-top:0!important} .ar-sticky{display:none!important}";

const browser = await launch();
for (const slug of demos) {
  for (const [w, h, name] of [
    [390, 844, "phone"],
    [1440, 900, "desktop"],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, reducedMotion: "reduce" });
    await page.goto(`${base}/lavori/${slug}/demo/`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: hideBanner });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: out(`lavori/${slug}-${name}.png`) });
    if (slug === "arcadi-ristrutturazioni" && name === "phone") {
      await page.screenshot({ path: out("anteprime/arcadi-ristrutturazioni-k7q2-dopo.png") });
    }
    await page.close();
    console.log(slug, name);
  }
}
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: "reduce" });
await page.goto(`${base}/styleguide/`, { waitUntil: "networkidle" });
await page.locator("#old-site").screenshot({ path: out("anteprime/arcadi-ristrutturazioni-k7q2-prima.png") });
console.log("old site");
await browser.close();
