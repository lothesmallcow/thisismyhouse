/**
 * Single source of truth for business data.
 * Every "[DA COMPILARE: ...]" value is a placeholder Lorenzo must fill before launch.
 * `npm run check:placeholders` lists the ones still missing; `npm run predeploy` fails while any remain.
 */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const site = {
  brand: "Focale",
  url: "[DA COMPILARE: dominio definitivo, es. https://www.focalestudio.it]",
  ownerFirstName: "[DA COMPILARE: nome]",
  ownerFullName: "[DA COMPILARE: nome e cognome]",
  ownerAge: "[DA COMPILARE: età]",
  legalName: "[DA COMPILARE: nome e cognome o ragione sociale]",
  vatNumber: "[DA COMPILARE: partita IVA]",
  taxCode: "[DA COMPILARE: codice fiscale]",
  registeredAddress: "[DA COMPILARE: indirizzo della sede]",
  email: "[DA COMPILARE: email di contatto]",
  phoneDisplay: "[DA COMPILARE: telefono, es. 333 123 4567]",
  phoneE164: "[DA COMPILARE: telefono in formato +39...]",
  whatsappNumber: "[DA COMPILARE: numero WhatsApp senza + e spazi, es. 393331234567]",
  pec: "[DA COMPILARE: PEC, se presente]",
  photo: null as null | string, // "[DA COMPILARE: foto in src/assets/chi-sono.jpg]"
  vatNote: "[DA COMPILARE: nota IVA concordata con il commercialista]",
  jurisdiction: "Milano",
  foundersSpotsTotal: 5,
  foundersSpotsLeft: 5,
  prices: {
    essenziale: { founders: 390, standard: 590 },
    professionale: { founders: 690, standard: 990 },
    suMisura: { founders: 1190, standard: 1690 },
    cura: 35,
  },
  previewHours: 72,
  deliveryDays: { essenziale: 7, professionale: 10 },
  depositPercent: 30,
  revisionRounds: 2,
  careResponseHours: 48,
  domainCostRange: "tra 10 e 20 € l'anno",
  reviews: [] as { author: string; text: string; source: string; url: string }[],
  web3formsKey: env.PUBLIC_WEB3FORMS_KEY ?? "",
  sheetsEndpoint: env.PUBLIC_SHEETS_ENDPOINT ?? "",
  cfBeaconToken: env.PUBLIC_CF_BEACON_TOKEN ?? "",
  legalLastUpdated: "[DA COMPILARE: data ultimo aggiornamento dei documenti legali]",
};

export type Site = typeof site;
