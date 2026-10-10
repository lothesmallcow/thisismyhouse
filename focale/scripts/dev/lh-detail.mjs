import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
const path = process.argv[2] ?? "/";
const chrome = await chromeLauncher.launch({ chromePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", chromeFlags: ["--headless=new", "--no-sandbox"] });
const res = await lighthouse("http://localhost:4321" + path, { port: chrome.port, output: "json", logLevel: "error" });
const a = res.lhr.audits;
for (const k of ["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "interactive"]) console.log(k, a[k].displayValue);
const m = a.metrics.details.items[0]; console.log("observed FCP", m.observedFirstContentfulPaint, "observed LCP", m.observedLargestContentfulPaint, "load", m.observedLoad); console.log(JSON.stringify(a["lcp-breakdown-insight"].details.items[1]?.nodeLabel));
await chrome.kill();
