// Small text helpers shared by every rule module. Pure functions, no I/O.

/** Lowercase, strip accents, collapse whitespace. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Split into word tokens after folding. */
export function tokens(s: string): string[] {
  return fold(s)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

const STOPWORDS = new Set([
  "di", "a", "da", "in", "con", "su", "per", "tra", "fra", "il", "lo", "la", "i", "gli", "le", "un", "uno", "una",
  "e", "ed", "o", "del", "della", "dei", "degli", "delle", "al", "alla", "ai", "agli", "alle", "the", "and", "of", "for",
  "m", "f", "mf", "fm", "x",
]);

/** Tokens without stopwords, with Italian gendered endings unified (impiegato/impiegata -> impiegat). */
export function keyTokens(s: string): string[] {
  return tokens(s)
    .filter((t) => !STOPWORDS.has(t))
    .map(stemGender);
}

/** "impiegato", "impiegata", "impiegati", "impiegate" -> "impiegat". Short words are kept. */
export function stemGender(t: string): string {
  if (t.length > 4 && /[aeio]$/.test(t)) return t.slice(0, -1);
  return t;
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Split text into sentences (rough, good enough for evidence snippets). */
export function sentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

/** Escape a string for use inside a RegExp. */
export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
