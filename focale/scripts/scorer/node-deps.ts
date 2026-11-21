/**
 * Node-side dependencies of the engine: the OS DNS resolver, and speed data from PageSpeed
 * Insights when PSI_KEY is set, otherwise from Lighthouse run on this computer (same engine, mobile,
 * no key or setup needed: it uses the Chrome already installed; set CHROME_PATH if it is not found).
 */
import { promises as dns } from "node:dns";
import { existsSync } from "node:fs";
import type { Resolver } from "../../src/scorer/safe-fetch";
import { runPsi, type PsiLike } from "../../src/scorer/perf";

export const nodeResolver: Resolver = async (host) => {
  const all = await dns.lookup(host, { all: true, verbatim: true }).catch(() => []);
  return all.map((a) => a.address);
};
export const psiKey = process.env.PSI_KEY;
/**
 * SCORER_VIA_PROXY=1: the machine has no DNS of its own and reaches the web only through an egress
 * proxy (HTTPS_PROXY), which resolves names and reaches only public hosts. Node's fetch is told to
 * use it with NODE_USE_ENV_PROXY=1. The URL checks (no IPs, no local names) still run on every hop.
 */
export const dnsAtProxy = process.env.SCORER_VIA_PROXY === "1";

let chrome: { port: number; kill: () => Promise<void> | void } | null = null;

/** Speed for one URL: PSI with the key, else local Lighthouse. Never throws (null = not measured). */
export async function speed(url: string): Promise<PsiLike | null> {
  if (psiKey) return runPsi(url, psiKey).catch(() => null);
  try {
    const { default: lighthouse } = await import("lighthouse");
    const launcher = await import("chrome-launcher");
    if (!chrome) {
      const chromePath = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium"].find((p) => p && existsSync(p));
      chrome = await launcher.launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox"] });
    }
    const r = await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"] });
    return r ? { lighthouseResult: r.lhr as never } : null;
  } catch {
    return null;
  }
}

export async function closeSpeed() {
  if (chrome) await chrome.kill();
  chrome = null;
}
