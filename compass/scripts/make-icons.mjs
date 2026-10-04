// Renders the Compass mark to PNG icons for the PWA (run once; output is committed).
import { chromium } from "@playwright/test";
const mark = (pad, bg) => `<html><body style="margin:0;background:${bg}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${64 + 2 * pad} ${64 + 2 * pad}" width="100%" height="100%">
<circle cx="32" cy="32" r="30" fill="#1f3b57"/><circle cx="32" cy="32" r="25" fill="none" stroke="#f7f2e9" stroke-opacity=".35" stroke-width="1.5"/>
<path d="M32 10 38 32H26L32 10Z" fill="#e9644c"/><path d="M32 54 26 32h12L32 54Z" fill="#f7f2e9"/>
<path d="M10 32 32 28v8L10 32ZM54 32 32 36v-8l22 4Z" fill="#f7f2e9" fill-opacity=".55"/>
<circle cx="32" cy="32" r="3.2" fill="#1f3b57" stroke="#f7f2e9" stroke-width="1.6"/></svg></body></html>`;
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const [name, size, pad, bg] of [
  ["icon-192", 192, 2, "#f7f2e9"],
  ["icon-512", 512, 2, "#f7f2e9"],
  ["icon-maskable-512", 512, 16, "#f7f2e9"],
  ["apple-touch-icon", 180, 6, "#f7f2e9"],
]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(mark(pad, bg));
  await p.screenshot({ path: `public/icons/${name}.png` });
  await p.close();
}
await b.close();
console.log("icons written to public/icons/");
