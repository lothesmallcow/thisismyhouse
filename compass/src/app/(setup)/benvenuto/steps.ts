// The questionnaire, per track. CV comes before the company step so suggestions can use it.
import type { Track } from "@/lib/db/schema";

export type StepId = "nome" | "ruolo" | "esperienza" | "studi" | "attivita" | "dove" | "quando" | "contratto" | "paga" | "lingue" | "cv" | "settori" | "gusti" | "aziende" | "evitare" | "focus";

export const STEPS: Record<Track, StepId[]> = {
  lavoro: ["nome", "ruolo", "esperienza", "dove", "contratto", "paga", "lingue", "cv", "settori", "gusti", "aziende", "evitare", "focus"],
  stage: ["nome", "studi", "dove", "quando", "paga", "lingue", "cv", "attivita", "settori", "gusti", "aziende", "evitare", "focus"],
};

/** The quick version: only what the search needs to start (the rest can be added later). */
export const QUICK_STEPS: Record<Track, StepId[]> = {
  lavoro: ["nome", "ruolo", "esperienza", "dove", "paga", "cv"],
  stage: ["nome", "studi", "dove", "settori", "cv"],
};

export type Mode = "veloce" | "completo";
export function stepsFor(track: Track, mode: Mode | null | undefined): StepId[] {
  return mode === "veloce" ? QUICK_STEPS[track] : STEPS[track];
}

export function stepIndex(track: Track, id: StepId | string): number {
  const i = STEPS[track].indexOf(id as StepId);
  return i < 0 ? 1 : i + 1;
}

export function stepAt(track: Track, n: number): StepId | null {
  return STEPS[track][n - 1] ?? null;
}

export const TITLES: Record<StepId, (t: Track) => string> = {
  nome: () => "Come ti chiami?",
  ruolo: () => "Che lavoro cerchi?",
  esperienza: () => "La tua esperienza",
  studi: () => "Cosa studi?",
  attivita: () => "Cosa fai oltre allo studio?",
  dove: (t) => (t === "stage" ? "Dove vuoi fare lo stage?" : "Dove vuoi lavorare?"),
  quando: () => "Quando sei disponibile?",
  contratto: () => "Orario e contratto",
  paga: (t) => (t === "stage" ? "Rimborso minimo" : "Stipendio minimo"),
  lingue: () => "Che lingue parli?",
  cv: () => "Carica il tuo CV",
  settori: () => "Quali settori ti interessano?",
  gusti: () => "Cosa ti appassiona?",
  aziende: (t) => (t === "stage" ? "Boutique, fondi, brand: quali ti interessano?" : "Quali aziende o brand ti interessano?"),
  evitare: () => "C'è qualcosa da evitare?",
  focus: () => "Come scegliere le offerte?",
};

export const HELP: Record<StepId, (t: Track) => string> = {
  nome: () => "Servono per le candidature: li vedono solo le aziende a cui scrivi.",
  ruolo: () => "Il nome del ruolo come lo scriveresti in un annuncio. Fino a tre.",
  esperienza: () => "Serve a proporti offerte del tuo livello: né troppo in basso né fuori portata.",
  studi: () => "Serve a capire a quali programmi e stage puoi accedere: molti chiedono un anno di corso o un anno di laurea preciso.",
  attivita: () => "Con un CV ancora corto contano molto: dicono cosa sai fare e dove potresti andare. Scegli tutto quello che fai o hai fatto.",
  dove: () => "Le città, le regioni o i paesi dove vuoi lavorare, anche all'estero. E dove puoi lavorare senza visto: molti annunci lo chiedono.",
  quando: () => "I periodi in cui puoi fare uno stage.",
  contratto: () => "Se va bene tutto, lascia com'è.",
  paga: (t) => (t === "stage" ? "Netto al mese. Facoltativo: molti stage indicano solo un rimborso spese." : "Netto al mese, quello che arriva sul conto. Le offerte sotto finiscono più in basso, o spariscono se scegli di nasconderle."),
  lingue: () => "L'italiano si dà per scontato.",
  cv: () => "Fino a 3 PDF. Il testo del CV serve anche a suggerirti aziende adatte.",
  settori: () => "Le offerte di questi settori salgono in cima. Se il tuo non c'è, scrivilo in “Altro”.",
  gusti: () => "Serve a suggerirti aziende e brand che potrebbero piacerti.",
  aziende: () => "Scegli dal catalogo o dai suggerimenti; se manca, aggiungila in “Altro”. Puoi cambiare tutto in qualsiasi momento.",
  evitare: () => "Aziende o parole che non vuoi vedere negli annunci.",
  focus: () => "Puoi cambiarlo quando vuoi dalla pagina Offerte o da Aziende.",
};
