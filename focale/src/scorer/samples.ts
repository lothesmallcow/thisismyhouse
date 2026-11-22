/**
 * The two example reports, computed at build time from INVENTED pages with invented lab numbers.
 * Used by /analisi-sito/ and by the home's teaser card; both label them as examples.
 */
import { fromPartsAll } from "./analyze";
import sampleHtml from "../../test/scorer/fixtures/old-studio.html?raw";
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

export const sample = fromPartsAll("http://www.studio-esempio.it/", sampleHtml, lab(5200, 740, 0.18, 4_600_000, 0.71), { sector: "fitness", measuredAt: "2026-11-21T09:00:00Z" });
export const sampleGood = fromPartsAll("https://www.studio-esempio-due.it/", goodHtml, lab(2900, 120, 0.02, 1_400_000, 0.93), { sector: "fitness", measuredAt: "2026-11-21T09:00:00Z" });
