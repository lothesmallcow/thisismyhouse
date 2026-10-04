// Italian salary parsing. Everything is normalized to ANNUAL GROSS (RAL) where possible.
// The original string is always kept, and anything derived from net, monthly, hourly or
// CCNL tables is flagged as an estimate. Gross and net are never mixed silently.

import { fold } from "./text";

export type SalaryBasis =
  | "annual_gross"
  | "annual_unspecified"
  | "monthly_net"
  | "monthly_gross"
  | "monthly_unspecified"
  | "hourly"
  | "ccnl"
  | "unknown";

export interface Salary {
  raw: string;
  minAnnualGross: number | null;
  maxAnnualGross: number | null;
  basis: SalaryBasis;
  isEstimate: boolean;
  /** Short Italian note shown next to estimates, e.g. "stima dal netto mensile". */
  note: string | null;
}

export const UNKNOWN_SALARY = (raw = ""): Salary => ({
  raw,
  minAnnualGross: null,
  maxAnnualGross: null,
  basis: "unknown",
  isEstimate: false,
  note: null,
});

/** Months of pay per year used for monthly -> annual conversion (tredicesima included). */
export const MONTHS_PER_YEAR = 13;
/** Hours per year for a full-time hourly wage (40 h x 52 weeks). */
export const FULL_TIME_HOURS_PER_YEAR = 2080;

/**
 * Rough net -> gross ratio for an Italian employee (IRPEF + INPS, no regional detail).
 * Deliberately simple and labeled "stima" in the UI. Good enough to compare against a floor.
 */
export function netAnnualToGrossAnnual(netAnnual: number): number {
  const ratio = netAnnual < 15000 ? 0.82 : netAnnual < 22000 ? 0.75 : netAnnual < 30000 ? 0.7 : 0.65;
  return Math.round(netAnnual / ratio / 100) * 100;
}

export function grossAnnualToNetMonthly(grossAnnual: number): number {
  // Inverse of the above, solved on the same brackets.
  for (const ratio of [0.82, 0.75, 0.7, 0.65]) {
    const net = grossAnnual * ratio;
    if (Math.abs(netAnnualToGrossAnnual(net) - grossAnnual) <= 100) {
      return Math.round(net / MONTHS_PER_YEAR / 10) * 10;
    }
  }
  return Math.round((grossAnnual * 0.7) / MONTHS_PER_YEAR / 10) * 10;
}

/**
 * Indicative annual gross for a few common CCNL levels (2025 minimum tables, 14 monthly
 * payments for Commercio/Terziario, 13 for others). Approximate on purpose: always an estimate.
 * Extend this table as needed; keys are folded ("commercio", "metalmeccanico", ...).
 */
export const CCNL_TABLE: Record<string, Record<string, number>> = {
  commercio: { "1": 36000, "2": 31500, "3": 28000, "4": 25500, "5": 23500, "6": 22000, "7": 20000, quadri: 44000 },
  terziario: { "1": 36000, "2": 31500, "3": 28000, "4": 25500, "5": 23500, "6": 22000, "7": 20000, quadri: 44000 },
  metalmeccanico: { "1": 22000, "2": 24000, "3": 25500, "4": 26500, "5": 28000, "6": 30500, "7": 33500 },
  "studi professionali": { "1": 30000, "2": 27000, "3": 25000, "4": 23000, "5": 21500 },
  multiservizi: { "1": 18500, "2": 19500, "3": 20500, "4": 21500, "5": 23000, "6": 24500 },
  turismo: { "1": 30000, "2": 27000, "3": 24500, "4": 23000, "5": 21500, "6": 20500, "7": 19000 },
};

/** Parse "28.000", "28000", "1.600,50", "28k", "28 mila", "28,5k" -> number. */
export function parseItalianNumber(s: string): number | null {
  let t = fold(s).replace(/\s/g, "");
  let mult = 1;
  if (/k$/.test(t)) {
    mult = 1000;
    t = t.slice(0, -1);
  } else if (/mila$/.test(t)) {
    mult = 1000;
    t = t.slice(0, -4);
  }
  if (!/^\d[\d.,]*$/.test(t)) return null;
  // "1.600,50" -> 1600.50 ; "28.000" -> 28000 ; "28,5" -> 28.5 ; "1,600" (rare) -> 1600
  if (/,\d{1,2}$/.test(t)) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}(\D|$)/.test(t) || /,\d{3}(\D|$)/.test(t)) {
    t = t.replace(/[.,]/g, "");
  } else {
    t = t.replace(",", ".");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n * mult : null;
}

const NUM = String.raw`\d{1,3}(?:[.,]\d{3})*(?:,\d{1,2})?(?:\s?(?:k|mila))?|\d+(?:[.,]\d+)?(?:\s?(?:k|mila))?`;
const RANGE_RE = new RegExp(String.raw`(?:da\s+)?(?:€\s?)?(${NUM})\s?(?:€|euro|eur)?\s*(?:-|–|—|a|fino a|e)\s*(?:€\s?)?(${NUM})`, "i");
const SINGLE_RE = new RegExp(String.raw`(?:€\s?)?(${NUM})\s?(?:€|euro|eur)?`, "i");

function findAmounts(text: string): { min: number; max: number } | null {
  const r = text.match(RANGE_RE);
  if (r) {
    let a = parseItalianNumber(r[1]);
    let b = parseItalianNumber(r[2]);
    if (a != null && b != null) {
      // "RAL 28-32k": the k on the second number applies to the first too.
      if (/k|mila/i.test(r[2]) && !/k|mila/i.test(r[1]) && a < 1000 && b >= 1000) a *= 1000;
      if (a > b) [a, b] = [b, a];
      return { min: a, max: b };
    }
  }
  // Prefer a number near a currency/salary word over random numbers (e.g. "4° livello").
  const all = [...text.matchAll(new RegExp(SINGLE_RE, "gi"))]
    .map((m) => ({ n: parseItalianNumber(m[1]), raw: m[0] }))
    .filter((x): x is { n: number; raw: string } => x.n != null && x.n >= 5);
  if (all.length === 0) return null;
  const best = all.find((x) => /€|euro|eur|k|mila/i.test(x.raw)) ?? all.reduce((p, c) => (c.n > p.n ? c : p));
  return { min: best.n, max: best.n };
}

/**
 * Parse an Italian salary string. Returns UNKNOWN when nothing reliable is found
 * ("unknown" is neutral in ranking, never a fail).
 */
export function parseSalary(raw: string | null | undefined): Salary {
  if (!raw || !raw.trim()) return UNKNOWN_SALARY("");
  const text = fold(raw);

  // CCNL level: "CCNL Commercio 4° livello", "CCNL metalmeccanico livello C3" (only numeric levels supported)
  const ccnl = text.match(/ccnl\s+([a-z ]+?)\s*(?:,\s*)?(?:(\d)\s*(?:°|o|º)?\s*livello|livello\s*(\d)|(quadri))/);
  if (ccnl) {
    const name = ccnl[1].trim();
    const level = ccnl[2] ?? ccnl[3] ?? ccnl[4];
    const table = Object.entries(CCNL_TABLE).find(([k]) => name.includes(k))?.[1];
    const value = table?.[level];
    if (value) {
      return { raw, minAnnualGross: value, maxAnnualGross: value, basis: "ccnl", isEstimate: true, note: "stima dal contratto nazionale" };
    }
    return { ...UNKNOWN_SALARY(raw), basis: "ccnl", note: "contratto nazionale indicato, cifra non nota" };
  }

  const amounts = findAmounts(text);
  if (!amounts) return UNKNOWN_SALARY(raw);
  let { min, max } = amounts;

  const isNet = /nett[oi]|\bnet\b/.test(text);
  const isGross = /lord[oi]|\bral\b|\bgross\b/.test(text);
  const hourly = /(?:\/\s?h\b|\/\s?ora|all'ora|orari[oa]|l'ora|per ora|\bhour)/.test(text);
  const monthly = /mese|mensil|\/\s?m\b|month/.test(text);
  const annual = /\bral\b|annu[oi]|anno|annual|\/\s?a\b|\byear/.test(text);

  if (hourly || (max <= 60 && !monthly && !annual)) {
    if (max > 200) return UNKNOWN_SALARY(raw);
    return {
      raw,
      minAnnualGross: Math.round((min * FULL_TIME_HOURS_PER_YEAR) / 100) * 100,
      maxAnnualGross: Math.round((max * FULL_TIME_HOURS_PER_YEAR) / 100) * 100,
      basis: "hourly",
      isEstimate: true,
      note: isNet ? "stima dalla paga oraria netta, a tempo pieno" : "stima dalla paga oraria, a tempo pieno",
    };
  }

  const looksMonthly = monthly || (!annual && max < 6000);
  if (looksMonthly) {
    if (isNet) {
      return {
        raw,
        minAnnualGross: netAnnualToGrossAnnual(min * MONTHS_PER_YEAR),
        maxAnnualGross: netAnnualToGrossAnnual(max * MONTHS_PER_YEAR),
        basis: "monthly_net",
        isEstimate: true,
        note: "stima dal netto mensile",
      };
    }
    return {
      raw,
      minAnnualGross: Math.round((min * MONTHS_PER_YEAR) / 100) * 100,
      maxAnnualGross: Math.round((max * MONTHS_PER_YEAR) / 100) * 100,
      basis: isGross ? "monthly_gross" : "monthly_unspecified",
      isEstimate: true,
      note: isGross ? "stima dal lordo mensile" : "stima: non è chiaro se netto o lordo",
    };
  }

  // Annual
  if (min < 1000) {
    min *= 1000;
    max *= 1000;
  }
  if (isNet) {
    return {
      raw,
      minAnnualGross: netAnnualToGrossAnnual(min),
      maxAnnualGross: netAnnualToGrossAnnual(max),
      basis: "annual_unspecified",
      isEstimate: true,
      note: "stima dal netto annuo",
    };
  }
  return {
    raw,
    minAnnualGross: min,
    maxAnnualGross: max,
    basis: isGross ? "annual_gross" : "annual_unspecified",
    isEstimate: !isGross,
    note: isGross ? null : "si presume lordo annuo",
  };
}

/** Find the most salary-looking line in a longer text (for ads without a salary field). */
export function findSalaryText(text: string): string | null {
  const lines = text.split(/\n|(?<=\.)\s/);
  const hit = lines.find((l) =>
    /(\bral\b|retribuzion|stipendio|compenso|salario|€|euro\b|ccnl\s+\w+\s*\d|paga oraria|lordi|netti)/i.test(l) &&
    /\d/.test(l),
  );
  return hit ? hit.trim() : null;
}

/** Human Italian label: "28.000-32.000 € lordi l'anno (stima)". */
export function formatSalary(s: Salary): string {
  if (s.minAnnualGross == null || s.maxAnnualGross == null) return "Stipendio non indicato";
  const f = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 0 });
  const range = s.minAnnualGross === s.maxAnnualGross ? `${f(s.minAnnualGross)} €` : `${f(s.minAnnualGross)}–${f(s.maxAnnualGross)} €`;
  return `${range} lordi l'anno${s.isEstimate ? " (stima)" : ""}`;
}
