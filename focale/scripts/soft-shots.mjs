// Out-of-focus copies for the "messa a fuoco" signature (FocusShot.astro and the hero phone): the soft copy
// sits over the sharp picture and fades out (opacity only: a CSS blur is never animated). Baked with sharp,
// small and light, committed in src/assets.
//   node scripts/soft-shots.mjs                       project shots (src/assets/lavori/*-desktop.png)
//   BASE=http://localhost:4321 node scripts/soft-shots.mjs --hero
//                                                     the hero phone's screen, shot from the built site
// Re-run whenever a desktop shot or the hero phone's site (demo/ArcadiHero.astro) changes.
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

if (process.argv.includes("--hero")) {
  const { launch } = await import("./browser.mjs");
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await page.goto((process.env.BASE ?? "http://localhost:4321") + "/", { waitUntil: "networkidle" });
  // The screen as the film starts: no banners, no soft copy, the site at its top.
  await page.addStyleTag({ content: ".film__banners,.film__soft,.vf{display:none!important}" });
  const shot = await page.locator(".film [data-site]").screenshot();
  await browser.close();
  mkdirSync("src/assets/focus", { recursive: true });
  const out = "src/assets/focus/hero-screen-soft.jpg";
  // Tiny on purpose (it is blurred anyway): it never competes with the headline for the largest paint.
  await sharp(shot).resize(96).blur(2.2).jpeg({ quality: 70, mozjpeg: true }).toFile(out);
  console.log("wrote", out);
} else {
  const dir = "src/assets/lavori";
  for (const f of readdirSync(dir).filter((f) => f.endsWith("-desktop.png"))) {
    const out = `${dir}/${f.replace("-desktop.png", "-desktop-soft.jpg")}`;
    // Drawn at 720 px wide (half the shot): the blur hides the scaling, and the file stays tiny.
    await sharp(`${dir}/${f}`).resize(720).blur(9).modulate({ brightness: 1.02 }).jpeg({ quality: 70, mozjpeg: true }).toFile(out);
    console.log("wrote", out);
  }
}
