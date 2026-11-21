/**
 * The consent shown next to the email box on /analisi-sito/. The page and /api/lead import the same
 * text, and the stored consent record carries its version: change the text, change the version.
 */
export const CONSENT = {
  version: "2026-11-21",
  text: "Voglio ricevere via email l'anteprima gratuita e i risultati di questa analisi. Ho letto l'informativa privacy.",
  purpose: "Rispondere alla richiesta di anteprima gratuita del sito analizzato. Nessuna newsletter.",
  /** How long a lead is kept, then KV deletes it by itself. */
  keepDays: 365,
} as const;
