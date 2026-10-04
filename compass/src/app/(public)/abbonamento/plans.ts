// Subscription plans. PRICES ARE INVENTED for the product page: no payment system is wired.
export interface Plan {
  id: "essenziale" | "compass" | "famiglia";
  name: string;
  tagline: string;
  monthly: number; // EUR
  yearly: number; // EUR
  highlight?: boolean;
  features: string[];
  limits: string;
}

export const PLANS: Plan[] = [
  {
    id: "essenziale",
    name: "Essenziale",
    tagline: "Per iniziare.",
    monthly: 0,
    yearly: 0,
    limits: "Fino a 3 candidature via e-mail al giorno",
    features: [
      "Offerte dagli avvisi e-mail di LinkedIn, Indeed e InfoJobs",
      "Lavoro o stage: classifica spiegata per ogni offerta",
      "Fino a 10 aziende e brand scelti dal catalogo",
      "Kit candidatura con risposte pronte da copiare",
      "Un CV",
    ],
  },
  {
    id: "compass",
    name: "Compass",
    tagline: "Per una ricerca seria.",
    monthly: 4.9,
    yearly: 49,
    highlight: true,
    limits: "Fino a 10 candidature via e-mail al giorno",
    features: [
      "Tutto quello che c'è in Essenziale",
      "Aziende e brand illimitati, con suggerimenti dal tuo CV",
      "Solo le offerte delle aziende scelte, se vuoi",
      "Ricerca anche sul web e sui siti delle aziende",
      "L'e-mail del mattino con le novità",
      "Riconosce le risposte delle aziende e te le segnala",
      "“Prepara con Claude” per le offerte migliori",
      "Fino a 3 CV, scelti in automatico per ogni offerta",
    ],
  },
  {
    id: "famiglia",
    name: "Famiglia",
    tagline: "Fino a 4 persone, un amministratore.",
    monthly: 8.9,
    yearly: 89,
    limits: "Fino a 20 candidature via e-mail al giorno",
    features: [
      "Tutto quello che c'è in Compass, per 4 account",
      "Area amministratore per seguire chi aiuti",
      "Pilota automatico per le offerte molto adatte",
      "Candidature spontanee alle aziende della tua zona",
    ],
  },
];

export function euro(n: number): string {
  return n === 0 ? "0 €" : `${n.toLocaleString("it-IT", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}
