/**
 * The example reports, computed at build time from three INVENTED sites in public/esempi/ (each says so
 * in a banner and is noindex). Their speed numbers are simulated, and the report says so:
 *  - vecchio: an old theme made for computers (Centro Sport);
 *  - curato: a polished site that misses what makes people book (Respiro);
 *  - fatto-bene: the same studio, same style, fixed (Respiro rifatto).
 * Spots for the pinned phone view come from `node scripts/example-shot.mjs` (src/scorer/spots/<key>.json).
 */
import { fromPartsAll, type FullAnalysis } from "./analyze";
import vecchioHtml from "../../public/esempi/centro-sport/index.html?raw";
import curatoHtml from "../../public/esempi/respiro/index.html?raw";
import beneHtml from "../../public/esempi/respiro-rifatto/index.html?raw";

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
const at = { sector: "fitness" as const, measuredAt: "2026-11-21T09:00:00Z" };

export type ExampleKey = "vecchio" | "curato" | "fatto-bene";
export interface Example {
  key: ExampleKey;
  /** Tab label. */
  label: string;
  /** Headline first half ("Bello da vedere."), the score follows. */
  say: string;
  /** One line under the headline. */
  line: string;
  /** Where the invented site is served. */
  path: string;
  /** Pins show the points lost, or (for the good one) the points won. */
  pins: "lost" | "won";
  full: FullAnalysis;
}

export const examples: Example[] = [
  {
    key: "vecchio",
    label: "Brutto",
    say: "Vecchio e fatto per il computer.",
    line: "Dal telefono si vede rimpicciolito, è lento e per sapere orari e prezzi bisogna chiamare.",
    path: "/esempi/centro-sport/",
    pins: "lost",
    full: fromPartsAll("http://www.centrosport-esempio.it/", vecchioHtml, lab(6400, 920, 0.31, 5_800_000, 0.66), at),
  },
  {
    key: "curato",
    label: "Curato, con difetti",
    say: "Bello da vedere.",
    line: "Sembra curato, ma perde punti in cose che a colpo d'occhio non si notano.",
    path: "/esempi/respiro/",
    pins: "lost",
    full: fromPartsAll("https://www.respiro-esempio.it/", curatoHtml, lab(3700, 380, 0.06, 3_400_000, 0.82), at),
  },
  {
    key: "fatto-bene",
    label: "Fatto bene",
    say: "Stesso stile, fatto bene.",
    line: "Lo stesso studio: si prenota dall'alto, orari e prezzi in vista, il numero si chiama con un tocco.",
    path: "/esempi/respiro-rifatto/",
    pins: "won",
    full: fromPartsAll("https://www.respiro-esempio.it/", beneHtml, lab(2700, 90, 0.02, 850_000, 0.97), at),
  },
];
export const exampleOf = (k: ExampleKey) => examples.find((e) => e.key === k)!;
/** Kept for older callers: the polished-but-flawed one and the good one. */
export const sample = exampleOf("curato").full;
export const sampleGood = exampleOf("fatto-bene").full;
