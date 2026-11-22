/**
 * The two example reports, computed at build time from INVENTED pages with simulated lab numbers.
 * Used by /analisi-sito/ and by the home's teaser card; both label them as examples.
 */
import { fromPartsAll } from "./analyze";
import sampleHtml from "../../public/esempi/respiro/index.html?raw";
import goodHtml from "../../test/scorer/fixtures/new-studio.html?raw";

const lab = (lcp: number, tbt: number, cls: number, bytes: number, a11y: number) => ({
  lighthouseResult: {
    lighthouseVersion: "13.0.0",
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "total-blocking-time": { numericValue: tbt },
      "cumulative-layout-shift": { numericValue: cls },
      "total-byte-weight": { numericValue: bytes },
    },
    categories: { accessibility: { score: a11y } },
  },
});

// "Respiro": an invented studio whose site looks polished but misses what makes people book
// (public/esempi/respiro/, shown as-is in the report). Its speed numbers are simulated, like a site
// with a heavy photo on top and a theme full of scripts.
export const sample = fromPartsAll("https://www.respiro-esempio.it/", sampleHtml, lab(3700, 380, 0.06, 3_400_000, 0.82), { sector: "fitness", measuredAt: "2026-11-21T09:00:00Z" });
export const sampleGood = fromPartsAll("https://www.studio-esempio-due.it/", goodHtml, lab(2900, 120, 0.02, 1_400_000, 0.93), { sector: "fitness", measuredAt: "2026-11-21T09:00:00Z" });
