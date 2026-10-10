// Launch Chromium via Playwright. Falls back to a preinstalled Chromium when the bundled
// browser is missing (set PW_CHROMIUM to point at one explicitly).
import { chromium } from "playwright";
import { existsSync } from "node:fs";

const CANDIDATES = [process.env.PW_CHROMIUM, "/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].filter(Boolean);

export async function launch(opts = {}) {
  try {
    return await chromium.launch(opts);
  } catch (err) {
    for (const p of CANDIDATES) {
      if (existsSync(p)) return chromium.launch({ ...opts, executablePath: p });
    }
    throw err;
  }
}
