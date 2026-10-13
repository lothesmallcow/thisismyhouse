/**
 * "Calcola una stima del preventivo": turns a few answers into a price range, delivery days and a
 * breakdown. Shared by the server (first render, no JS) and the browser (live updates).
 * All numbers come from site.estimate and site.prices (config), never from here.
 */
import type { Site } from "../config/site";

export type Activity = "edile" | "serramenti" | "ospitalita" | "eventi" | "altro";
export type Model = "trades" | "hospitality" | "venue";
export type Size = "una" | "piu";
export type Booking = "richiesta" | "link" | "widget";

export interface Answers {
  activity: Activity;
  size: Size;
  units: number;
  booking: Booking;
  brochure: boolean;
  languages: 0 | 1 | 2;
  google: boolean;
  blog: boolean;
  editor: boolean;
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
  size: "piu",
  units: 4,
  booking: "richiesta",
  brochure: false,
  languages: 0,
  google: false,
  blog: false,
  editor: false,
  vouchers: false,
  migration: false,
  photos: true,
};

export const modelOf = (a: Activity): Model => (a === "ospitalita" ? "hospitality" : a === "eventi" ? "venue" : "trades");

/** What the units are called for each kind of business (singular, plural). */
export const unitNames: Record<Model, [string, string]> = {
  trades: ["servizio", "servizi"],
  hospitality: ["camera o appartamento", "camere o appartamenti"],
  venue: ["spazio o tipo di evento", "spazi o tipi di evento"],
};

const round10 = (n: number) => Math.round(n / 10) * 10;

export function estimate(a: Answers, s: Pick<Site, "estimate" | "prices" | "deliveryDays" | "domainCostRange">, foundersOpen: boolean): Estimate {
  const e = s.estimate;
  const model = modelOf(a.activity);
  const units = Math.max(1, Math.min(40, Math.round(a.units) || 1));
  const bookingWidget = model === "hospitality" && a.booking === "widget";

  // The one-page site fits a few services or rooms and no blog, panel or booking: past that, Professionale.
  let plan: Estimate["plan"] = a.size === "una" ? "essenziale" : "professionale";
  let upgraded: string | null = null;
  if (plan === "essenziale") {
    const [, plural] = unitNames[model];
    if (units > e.onePageMaxUnits) upgraded = `Con più di ${e.onePageMaxUnits} ${plural} serve un sito con più pagine.`;
    else if (a.blog) upgraded = "Il blog ha bisogno di un sito con più pagine.";
    else if (a.editor) upgraded = "Il pannello per modificare il sito ha senso su un sito con più pagine.";
    else if (bookingWidget) upgraded = "Le prenotazioni dal sito hanno bisogno di un sito con più pagine.";
    if (upgraded) plan = "professionale";
  }
  const base = foundersOpen ? s.prices[plan].founders : s.prices[plan].standard;
  const planName = plan === "essenziale" ? "Essenziale" : "Professionale";
  const lines: Line[] = [{ label: `Pacchetto ${planName}`, min: base, max: base }];
  let days = s.deliveryDays[plan];
  const add = (label: string, p: { min: number; max: number; days: number }, times = 1) => {
    lines.push({ label, min: p.min * times, max: p.max * times });
    days += p.days * times;
  };

  // Pages beyond those the package includes.
  const extra = plan === "professionale" ? Math.max(0, units - e.includedUnits) : 0;
  if (extra > 0) {
    const [one, many] = unitNames[model];
    const label = `${extra} ${extra === 1 ? one : many} in più, con la sua pagina`;
    add(label, model === "hospitality" ? e.extraRoom : e.extraPage, extra);
  }
  if (bookingWidget) add("Prenotazione direttamente dal sito", e.bookingWidget);
  if (model === "venue" && a.brochure) add("Listino o brochure da scaricare", e.brochure);
  if (a.languages > 0) {
    // Each language: set-up (the first costs more), then every page translated and checked.
    const pages = plan === "professionale" ? e.professionalePages + extra : 1;
    const lang = (setup: { min: number; max: number; days: number }) => ({
      min: setup.min + e.language.perPage.min * pages,
      max: setup.max + e.language.perPage.max * pages,
      days: setup.days + e.language.perPage.days * pages,
    });
    add("Versione in inglese", lang(e.language.setup));
    if (a.languages === 2) add("Una terza lingua", lang(e.language.nextSetup));
  }
  if (a.google) add("Scheda Google sistemata", e.googleProfile);
  if (a.blog) add("Blog o notizie", e.blog);
  if (a.editor) add("Pannello per modificare testi e foto da solo", e.editor);
  if (a.vouchers && model !== "trades") add("Buoni regalo vendibili online", e.vouchers);
  if (a.migration) add("Contenuti recuperati dal vecchio sito", e.migration);

  // The safety margin widens only the top end of the extras (the package price is fixed) and of the days.
  const complex = bookingWidget || (a.vouchers && model !== "trades") || a.migration || a.languages > 0 || !a.photos;
  const kind = complex ? "complex" : "simple";
  const extrasMax = lines.slice(1).reduce((t, l) => t + l.max, 0);
  const min = round10(lines.reduce((t, l) => t + l.min, 0));
  const max = round10(base + extrasMax * (1 + e.margin.price[kind] / 100));
  const daysMin = Math.ceil(days);
  const daysMax = Math.max(daysMin, Math.ceil(days * (1 + e.margin.days[kind] / 100)));

  const apart = [`Il dominio, ${s.domainCostRange}, intestato a te.`];
  if (bookingWidget || (model === "hospitality" && a.booking === "link"))
    apart.push(`Il canone del booking engine, che paghi al fornitore: ${e.bookingFeeMonthly}.`);
  if (a.vouchers && model !== "trades") apart.push("Le commissioni del circuito di pagamento su ogni buono venduto.");
  if (!a.photos) apart.push(`Un fotografo, se le foto non ci sono: ${e.photographer}. Te ne consigliamo uno della tua zona.`);

  return { plan, planName, upgraded, min, max, daysMin, daysMax, lines, apart };
}
