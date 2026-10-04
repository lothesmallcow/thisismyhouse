// Scam and junk filter. ALL rules live in this one file so they are easy to extend.
// A flagged job is never sent by autopilot and shows a warning in approval mode.
//
// To add a rule: append an object to SCAM_RULES with a stable `id`, a calm Italian
// `warning` (shown to her) and a `test` that receives the ad and returns true when it fires.

import { normalizeCompany } from "./dedupe";
import { emailDomain } from "./extract";
import { fold } from "./text";

export interface ScamInput {
  title: string;
  company: string | null;
  description: string;
  applicationEmail: string | null;
  /** Annual gross upper bound if known. */
  maxAnnualGross: number | null;
}

export interface ScamRule {
  id: string;
  warning: string;
  test: (ad: ScamInput, text: string) => boolean;
}

export const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.it", "outlook.com", "outlook.it", "live.com", "live.it",
  "yahoo.com", "yahoo.it", "libero.it", "virgilio.it", "tiscali.it", "alice.it", "tim.it", "icloud.com", "me.com",
  "aol.com", "gmx.com", "gmx.it", "email.it", "inwind.it", "fastwebnet.it", "proton.me", "protonmail.com",
]);

const LOW_SKILL = /addett|operai|magazzin|commess|pulizi|data entry|imbustament|assemblaggio|volantin|operatore/;

export const SCAM_RULES: ScamRule[] = [
  {
    id: "asks-payment",
    warning: "Chiede soldi (quota, corso o investimento): un vero lavoro non si paga.",
    test: (_ad, t) =>
      /(quota|costo|pagamento|versamento|contributo|tassa)\s+(?:di\s+|d')?(iscrizione|attivazione|adesione|ingresso|formazione|registrazione)/.test(t) ||
      /(acquist|compra|paga)\w*\s+(?:il |un |del |dei )?(corso|kit|materiale|starter|pacchetto)/.test(t) ||
      /investimento iniziale|piccolo investimento|\binvestimento\b.{0,30}(richiest|minimo|euro|€)/.test(t) ||
      /anticipo (?:spese|di)|deposito cauzionale/.test(t),
  },
  {
    id: "chat-only",
    warning: "Chiede di scrivere solo su WhatsApp o Telegram: di solito non è un annuncio serio.",
    test: (ad, t) =>
      /(whatsapp|telegram)/.test(t) &&
      !ad.applicationEmail &&
      /(contatt|scriv|invia|mand|messaggi|solo|esclusivamente)\w*.{0,50}(whatsapp|telegram)|(whatsapp|telegram).{0,30}(al numero|\+39|3\d{2}\s?\d)/.test(t),
  },
  {
    id: "unrealistic-pay",
    warning: "Promette guadagni troppo alti per questo lavoro.",
    test: (ad, t) =>
      /guadagn\w*\s+(?:fino a|oltre|anche)\s+\d|\d+\s*(?:€|euro)\s*(?:al|a)\s*giorno.{0,40}(casa|subito)|guadagni (?:garantiti|elevatissimi|illimitati)/.test(t) ||
      (ad.maxAnnualGross != null && ad.maxAnnualGross > 60000 && LOW_SKILL.test(fold(ad.title))),
  },
  {
    id: "easy-money",
    warning: "Sembra uno di quegli annunci \"lavoro da casa, guadagna subito\".",
    test: (_ad, t) =>
      /guadagna subito|soldi facili|guadagni facili|lavoro da casa.{0,60}guadagn|guadagn.{0,60}lavoro da casa|senza esperienza.{0,40}(alti guadagni|guadagni elevati)|imbustament|assemblaggio a domicilio|diventa (?:tuo|il tuo) capo/.test(t),
  },
  {
    id: "freemail-mismatch",
    warning: "L'indirizzo e-mail è personale (es. Gmail) e non c'entra con il nome dell'azienda.",
    test: (ad) => {
      if (!ad.applicationEmail) return false;
      const domain = emailDomain(ad.applicationEmail);
      if (!FREE_MAIL_DOMAINS.has(domain)) return false;
      const local = fold(ad.applicationEmail.split("@")[0]).replace(/[^a-z0-9]/g, "");
      const words = normalizeCompany(ad.company).split(" ").filter((w) => w.length >= 3);
      if (words.length === 0) return true; // no company name at all + free mail = suspicious
      return !words.some((w) => local.includes(w));
    },
  },
];

export interface ScamFlag {
  id: string;
  warning: string;
}

export function scamFlags(ad: ScamInput): ScamFlag[] {
  const text = fold(`${ad.title}\n${ad.description}`);
  return SCAM_RULES.filter((r) => r.test(ad, text)).map(({ id, warning }) => ({ id, warning }));
}
