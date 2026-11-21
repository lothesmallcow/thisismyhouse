/**
 * The consent shown next to the email box on /analisi-sito/. The page and /api/lead import the same
 * text, and the stored consent record carries its version: change the text, change the version.
 */
export const CONSENT = {
  version: "2026-11-21b",
  text: "Acconsento a essere ricontattato da Focus Design per ricevere l'anteprima.",
  purpose: "Rispondere alla richiesta di anteprima gratuita del sito analizzato. Nessuna newsletter.",
  /** How long a lead is kept, then KV deletes it by itself. */
  keepDays: 365,
} as const;
