/**
 * Single source of truth for business data.
 * Every "[DA COMPILARE: ...]" value is a placeholder Lorenzo must fill before launch.
 * `npm run check:placeholders` lists the ones still missing; `npm run predeploy` fails while any remain.
 */
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const site = {
  brand: "Focus Design",
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
  },
  previewHours: 72,
  deliveryDays: { essenziale: 7, professionale: 10 },
  depositPercent: 30,
  revisionRounds: 2,
  domainCostRange: "tra 10 e 20 € l'anno",
  /**
   * "Calcola una stima" (components/Estimator.astro, lib/estimate.ts). Add-on prices are ranges in
   * euro, days are working days added to the package's delivery. From the price table in
   * reports/Stima preventivo siti web.md (about 30-35 €/hour of real work, checked against Italian
   * list prices). Each unit-priced item says how many units the package already includes.
   */
  estimate: {
    // Pages in each size: one page, a complete site (Professionale), a big site (Professionale + bigSite).
    pages: { una: 1, completo: 6, grande: 12 },
    // A big site: the extra pages (about 4-8 more services, rooms or spaces) on top of the Professionale.
    bigSite: { min: 350, max: 700, days: 4 },
    language: {
      setup: { min: 120, max: 200, days: 1 },
      nextSetup: { min: 40, max: 60, days: 0.3 },
      perPage: { min: 35, max: 50, days: 0.35 },
    },
    bookingWidget: { min: 120, max: 220, days: 1 },
    // Trades: a quote form that also shows the customer an indicative price, worked out automatically.
    quoteCalc: { min: 280, max: 550, days: 2 },
    // Venues: a calendar where couples pick the day and time of their visit.
    visitCalendar: { min: 80, max: 150, days: 0.5 },
    bookingFeeMonthly: "di solito tra 15 e 80 € al mese",
    brochure: { min: 70, max: 130, days: 0.5 },
    googleProfile: { min: 80, max: 140, days: 0.5 },
    blog: { min: 150, max: 250, days: 1 },
    // A simple panel to add rooms, works or events: new pages appear by themselves.
    editor: { min: 300, max: 500, days: 2 },
    vouchers: { min: 100, max: 150, days: 0.5 },
    migration: { min: 80, max: 140, days: 0.5 },
    photographer: "di solito tra 350 e 950 €, a seconda di quante foto servono",
    // Safety margin (%) on the top end of the extras' price and of the days: more when there are
    // moving parts (booking, vouchers, old content, languages) or the photos are missing.
    margin: { price: { simple: 10, complex: 15 }, days: { simple: 15, complex: 25 } },
  },
  reviews: [] as { author: string; text: string; source: string; url: string }[],
  web3formsKey: env.PUBLIC_WEB3FORMS_KEY ?? "",
  sheetsEndpoint: env.PUBLIC_SHEETS_ENDPOINT ?? "",
  cfBeaconToken: env.PUBLIC_CF_BEACON_TOKEN ?? "",
  legalLastUpdated: "[DA COMPILARE: data ultimo aggiornamento dei documenti legali]",
};

export type Site = typeof site;
