import { site } from "../config/site";

export type PlanKey = "essenziale" | "professionale" | "suMisura";

export interface Plan {
  key: PlanKey;
  slug: string;
  name: string;
  forWhom: string;
  founders: number;
  standard: number;
  from: boolean;
  recommended: boolean;
  intro?: string;
  features: string[];
}

export const plans: Plan[] = [
  {
    key: "essenziale",
    slug: "essenziale",
    name: "Essenziale",
    forWhom: "Per chi oggi ha solo Instagram o Google Maps.",
    founders: site.prices.essenziale.founders,
    standard: site.prices.essenziale.standard,
    from: false,
    recommended: false,
    features: [
      "Sito a pagina unica, fino a 6 sezioni",
      "Testi scritti da me",
      "Pulsanti per chiamarti e scriverti su WhatsApp",
      "Modulo contatti che ti scrive su WhatsApp e via email",
      "Mappa e collegamento alla tua scheda Google",
      "Privacy e cookie in regola",
      `Online in ${site.deliveryDays.essenziale} giorni lavorativi`,
    ],
  },
  {
    key: "professionale",
    slug: "professionale",
    name: "Professionale",
    forWhom: "Il sito completo per farti scegliere.",
    founders: site.prices.professionale.founders,
    standard: site.prices.professionale.standard,
    from: false,
    recommended: true,
    intro: "Tutto l'Essenziale, più:",
    features: [
      "Fino a 6 pagine",
      "Una pagina per ogni servizio, scritta per le ricerche della tua zona",
      "Galleria dei lavori con prima e dopo",
      "Modulo preventivo guidato in 3 passi",
      "Richieste salvate anche in un foglio Google",
      "Le tue recensioni Google mostrate sul sito",
      `Online in ${site.deliveryDays.professionale} giorni lavorativi`,
    ],
  },
  {
    key: "suMisura",
    slug: "su-misura",
    name: "Su misura",
    forWhom: "Per chi ha esigenze in più.",
    founders: site.prices.suMisura.founders,
    standard: site.prices.suMisura.standard,
    from: true,
    recommended: false,
    intro: "Tutto il Professionale, più:",
    features: [
      "Richieste di disponibilità o prenotazioni",
      "Più lingue",
      "Un pannello per modificare testi e foto da solo",
      "Pagine in più",
      "Tempi concordati insieme",
    ],
  },
];

export const cura = {
  name: "Cura",
  forWhom: "Il sito sempre in ordine, senza pensarci.",
  price: site.prices.cura,
  features: [
    "Dominio e hosting gestiti da me",
    `Fino a 2 modifiche al mese entro ${site.careResponseHours} ore lavorative`,
    "Un controllo ogni mese che tutto funzioni",
    "Copie di sicurezza",
    "Disdici quando vuoi, con un messaggio",
  ],
};

export const planLabel: Record<string, string> = {
  essenziale: "Essenziale",
  professionale: "Professionale",
  "su-misura": "Su misura",
};
