/**
 * "Calcola una stima del preventivo": turns a few answers into a price range, delivery days and a
 * breakdown. Shared by the server (first render, no JS) and the browser (live updates).
 * All numbers come from site.estimate and site.prices (config), never from here.
 * It asks about mechanisms, not counts (Lorenzo): what moves time and price is whether the owner
 * wants things to happen by themselves (a panel that makes new pages, bookings inside the site, an
 * automatic indicative price), not whether there are 6 or 9 rooms.
 */
import type { Site } from "../config/site";

export type Activity = "edile" | "serramenti" | "ospitalita" | "eventi" | "altro";
export type Model = "trades" | "hospitality" | "venue";
export type Size = "una" | "completo" | "grande";
/** The one mechanism that matters most for each kind of business ("base" is the included version). */
export type Key = "base" | "link" | "auto";

export interface Answers {
  activity: Activity;
  size: Size;
  selfUpdate: boolean;
  key: Key;
  brochure: boolean;
  languages: 0 | 1 | 2;
  google: boolean;
  blog: boolean;
  vouchers: boolean;
  migration: boolean;
  photos: boolean;
}

export interface Line {
  label: string;
  min: number;
  max: number;
}

export interface Estimate {
  plan: "essenziale" | "professionale";
  planName: string;
  upgraded: string | null;
  min: number;
  max: number;
  daysMin: number;
  daysMax: number;
  lines: Line[];
  apart: string[];
}

export const defaultAnswers: Answers = {
  activity: "edile",
  size: "completo",
  selfUpdate: false,
  key: "base",
  brochure: false,
  languages: 0,
  google: false,
  blog: false,
  vouchers: false,
  migration: false,
  photos: true,
};

export const modelOf = (a: Activity): Model => (a === "ospitalita" ? "hospitality" : a === "eventi" ? "venue" : "trades");

type Costs = Pick<Site, "estimate" | "prices" | "deliveryDays" | "domainCostRange">;
const round10 = (n: number) => Math.round(n / 10) * 10;

/** Something made to measure for one site, priced from site.estimate (a project page's quote). */
export interface Custom {
  label: string;
  min: number;
  max: number;
  days: number;
}

export function estimate(a: Answers, s: Costs, foundersOpen: boolean, custom: Custom[] = []): Estimate {
  const e = s.estimate;
  const model = modelOf(a.activity);
  // "link" only exists for bookings; elsewhere it counts as the included version.
  const key: Key = a.key === "link" && model !== "hospitality" ? "base" : a.key;
  const auto = key === "auto";
  const autoName = { trades: "Il prezzo indicativo automatico", hospitality: "La prenotazione dentro il sito", venue: "Il calendario delle visite" }[model];

  // The one-page site has no room for a panel, a blog or an automatic mechanism: those need Professionale.
  let plan: Estimate["plan"] = a.size === "una" ? "essenziale" : "professionale";
  let upgraded: string | null = null;
  if (plan === "essenziale") {
    if (a.selfUpdate) upgraded = "Aggiungere pagine da solo ha senso su un sito con più pagine.";
    else if (a.blog) upgraded = "Il blog ha bisogno di un sito con più pagine.";
    else if (auto) upgraded = `${autoName} ha bisogno di un sito con più pagine.`;
    if (upgraded) plan = "professionale";
  }
  const size: Size = plan === "professionale" && a.size === "una" ? "completo" : a.size;
  const base = foundersOpen ? s.prices[plan].founders : s.prices[plan].standard;
  const planName = plan === "essenziale" ? "Essenziale" : "Professionale";
  const lines: Line[] = [{ label: `Pacchetto ${planName}`, min: base, max: base }];
  let days = s.deliveryDays[plan];
  const add = (label: string, p: { min: number; max: number; days: number }) => {
    lines.push({ label, min: p.min, max: p.max });
    days += p.days;
  };

  if (size === "grande") add("Sito grande: circa 4-8 pagine in più", e.bigSite);
  if (a.selfUpdate) add("Pannello per aggiungere pagine da solo", e.editor);
  if (auto) {
    if (model === "trades") add("Prezzo indicativo calcolato in automatico", e.quoteCalc);
    if (model === "hospitality") add("Prenotazione dentro il sito", e.bookingWidget);
    if (model === "venue") add("Calendario per prenotare la visita", e.visitCalendar);
  }
  if (model === "venue" && a.brochure) add("Listino o brochure da scaricare", e.brochure);
  if (a.languages > 0) {
    // Each language: set-up (the first costs more), then every page translated and checked.
    const pages = e.pages[size];
    const lang = (setup: { min: number; max: number; days: number }) => ({
      min: setup.min + e.language.perPage.min * pages,
      max: setup.max + e.language.perPage.max * pages,
      days: setup.days + e.language.perPage.days * pages,
    });
    add("Versione in inglese", lang(size === "una" ? e.language.setupOnePage : e.language.setup));
    if (a.languages === 2) add("Una terza lingua", lang(e.language.nextSetup));
  }
  if (a.google) add("Scheda Google sistemata", e.googleProfile);
  if (a.blog) add("Blog o notizie", e.blog);
  if (a.vouchers && model !== "trades") add("Buoni regalo vendibili online", e.vouchers);
  if (a.migration) add("Contenuti recuperati dal vecchio sito", e.migration);
  custom.forEach((c) => add(c.label, c));

  // The safety margin widens only the top end of the extras (the package price is fixed) and of the days.
  // A second language on one page is no moving part: the structure stays the same.
  const complex = (auto && model === "hospitality") || (a.vouchers && model !== "trades") || a.migration || (a.languages > 0 && size !== "una") || !a.photos;
  const kind = complex ? "complex" : "simple";
  const extrasMax = lines.slice(1).reduce((t, l) => t + l.max, 0);
  const min = round10(lines.reduce((t, l) => t + l.min, 0));
  const max = round10(base + extrasMax * (1 + e.margin.price[kind] / 100));
  const daysMin = Math.ceil(days);
  const daysMax = Math.max(daysMin, Math.ceil(days * (1 + e.margin.days[kind] / 100)));

  const apart = [`Il dominio, ${s.domainCostRange}, intestato a te.`];
  if (model === "hospitality" && key !== "base") apart.push(`Il canone del booking engine, che paghi al fornitore: ${e.bookingFeeMonthly}.`);
  if (a.vouchers && model !== "trades") apart.push("Le commissioni del circuito di pagamento su ogni buono venduto.");
  if (!a.photos) apart.push(`Un fotografo, se le foto non ci sono: ${e.photographer}. Te ne consigliamo uno della tua zona.`);

  return { plan, planName, upgraded, min, max, daysMin, daysMax, lines, apart };
}
