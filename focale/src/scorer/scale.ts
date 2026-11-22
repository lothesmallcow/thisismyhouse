/**
 * How to read the score (Lorenzo, 22 Nov 2026: our own sites need not be 100; from 90 up a site is
 * practically perfect). One source for the report page, the home examples and the verdict word.
 */
export interface Band {
  min: number;
  max: number;
  word: string;
  line: string;
}
/** Low to high. */
export const BANDS: Band[] = [
  { min: 0, max: 49, word: "Da sistemare", line: "Il sito fa perdere clienti: conviene sistemarlo a fondo." },
  { min: 50, max: 74, word: "Discreto", line: "Lavora a metà: in punti precisi perde chi voleva contattarti." },
  { min: 75, max: 89, word: "Buono", line: "Funziona bene: qualche ritocco porta altre richieste." },
  { min: 90, max: 100, word: "Ottimo", line: "Praticamente perfetto: i punti che mancano contano poco." },
];
export const bandOf = (v: number) => BANDS.find((b) => v >= b.min && v <= b.max) ?? BANDS[0];
export const verdict = (v: number) => bandOf(v).word;
/** From this score up, chasing the last points is not worth it. */
export const PRACTICALLY_PERFECT = 90;

/** Shown in small print wherever a score appears (Lorenzo, 22 Nov 2026): the score is an estimate. */
export const SCORE_DISCLAIMER =
  "Il voto è indicativo: viene da un elenco fisso di controlli automatici sulla pagina analizzata. Non giudica la qualità di foto, testi o servizio e può sbagliare: prendilo come una prima lettura, non come un giudizio definitivo.";
