// Plans: how many "Fai web scraping" a person can start, and what each plan adds. Payments are not
// live yet: choosing a paid plan is a free trial (see /piano), features marked `soon` do not
// exist yet and say so.

export type PlanKey = "free" | "plus" | "premium";

export interface PlanFeature {
  text: string;
  /** Not built yet: shown as "In arrivo". */
  soon?: boolean;
}

export interface Plan {
  key: PlanKey;
  name: string;
  /** Euro a month. */
  price: number;
  tagline: string;
  /** Searches started by hand in any 24 hours. */
  scansPerDay: number;
  /** Minutes between two searches started by hand. */
  gapMin: number;
  features: PlanFeature[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free",
    price: 0,
    tagline: "Per iniziare: le offerte giuste, ogni mattina.",
    scansPerDay: 3,
    gapMin: 60,
    features: [
      { text: "Offerte ordinate per te, con il perché" },
      { text: "Ricerca automatica ogni mattina" },
      { text: "3 ricerche a mano al giorno, una ogni ora" },
      { text: "Avvisi di LinkedIn, Indeed e altri in un posto solo" },
      { text: "Cartelle e scadenze" },
    ],
  },
  {
    key: "plus",
    name: "Plus",
    price: 4.99,
    tagline: "Per chi cerca sul serio: più ricerche, più spesso.",
    scansPerDay: 10,
    gapMin: 15,
    highlight: true,
    features: [
      { text: "Tutto di Free" },
      { text: "10 ricerche a mano al giorno, una ogni 15 minuti" },
      { text: "Avviso delle offerte che stanno per scadere", soon: true },
      { text: "Statistiche delle tue candidature", soon: true },
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: 9.99,
    tagline: "Con un assistente AI che lavora per te.",
    scansPerDay: 30,
    gapMin: 5,
    features: [
      { text: "Tutto di Plus" },
      { text: "30 ricerche a mano al giorno, una ogni 5 minuti" },
      { text: "Assistente AI: ti dice dove candidarti e perché", soon: true },
      { text: "Lettere di presentazione scritte dall'AI per ogni offerta", soon: true },
      { text: "Preparazione ai colloqui con l'AI", soon: true },
    ],
  },
];

export const planOf = (key: string | null | undefined): Plan => PLANS.find((p) => p.key === key) ?? PLANS[0];

export interface ScanStatus {
  /** Searches left in the last 24 hours. */
  left: number;
  /** When the next one can start (null: now). */
  nextAt: Date | null;
}

/** What is left of the plan's searches, given when the last ones started. */
export function scanStatus(plan: Plan, history: Date[], now: Date): ScanStatus {
  const day = 86_400_000;
  const recent = history.filter((d) => now.getTime() - d.getTime() < day).sort((a, b) => a.getTime() - b.getTime());
  const left = Math.max(0, plan.scansPerDay - recent.length);
  const last = recent[recent.length - 1];
  const gapEnd = last ? last.getTime() + plan.gapMin * 60_000 : 0;
  const windowEnd = left === 0 && recent.length ? recent[recent.length - plan.scansPerDay].getTime() + day : 0;
  const next = Math.max(gapEnd, windowEnd);
  return { left, nextAt: next > now.getTime() ? new Date(next) : null };
}

/** "4,99 €" */
export const priceLabel = (p: Plan) => (p.price ? `${p.price.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €` : "0 €");
