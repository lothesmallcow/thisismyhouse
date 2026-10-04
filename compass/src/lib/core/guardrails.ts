// Sending guardrails (brief section 7). Pure functions: the caller passes the history,
// settings and clock, so every rule is unit tested without a database or a mailbox.

import { emailDomain, isValidEmail } from "./extract";
import { normalizeCompany } from "./dedupe";
import type { ScamFlag } from "./scam-rules";
import { fold } from "./text";
import { formatDate, isItalianHoliday, minutesOfDay, romeDateKey, romeParts, romeToUtc } from "./time";

export interface GuardrailSettings {
  dailyCap: number; // default 10
  firstWeekCap: number; // default 3
  goLiveAt: Date | null; // first day real sending was switched on
  windowStartMin: number; // 8:30 -> 510
  windowEndMin: number; // 18:00 -> 1080
  spacingMinMinutes: number; // 5
  spacingMaxMinutes: number; // 20
  undoMinutes: number; // 15
  companyCooldownDays: number; // 60
  spontaneousCooldownDays: number; // 182 (6 months)
  killSwitch: boolean; // her "Ferma tutti gli invii"
  adminKillSwitch: boolean; // the admin's stop: only the admin can lift it
  autopilot: boolean;
}

/** Absolute ceiling, whatever the admin sets. */
export const HARD_MAX_PER_DAY = 20;
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export const DEFAULT_GUARDRAILS: GuardrailSettings = {
  dailyCap: 10,
  firstWeekCap: 3,
  goLiveAt: null,
  windowStartMin: 8 * 60 + 30,
  windowEndMin: 18 * 60,
  spacingMinMinutes: 5,
  spacingMaxMinutes: 20,
  undoMinutes: 15,
  companyCooldownDays: 60,
  spontaneousCooldownDays: 182,
  killSwitch: false,
  adminKillSwitch: false,
  autopilot: false,
};

export interface SendHistoryItem {
  jobId: number | null;
  company: string | null;
  recipient: string;
  at: Date; // scheduled time (queued) or actual send time (sent)
  spontaneous: boolean;
}

export interface Blocklist {
  companies: string[];
  domains: string[];
  keywords: string[];
}

export interface SendCandidate {
  jobId: number | null;
  company: string | null;
  title: string;
  description: string;
  recipient: string;
  spontaneous: boolean;
  level: "molto" | "adatta" | "poco" | null;
  scamFlags: ScamFlag[];
  attachmentBytes: number | null;
}

export interface Check {
  code: string;
  message: string; // calm Italian sentence
}

export interface CheckResult {
  ok: boolean;
  blockers: Check[];
  warnings: Check[];
}

/** Either stop (hers or the admin's) blocks every send. */
export function isStopped(s: Pick<GuardrailSettings, "killSwitch" | "adminKillSwitch">): boolean {
  return Boolean(s.killSwitch || s.adminKillSwitch);
}

export function effectiveDailyCap(s: GuardrailSettings, now: Date): number {
  const inFirstWeek = s.goLiveAt != null && now.getTime() - s.goLiveAt.getTime() < 7 * 86400000;
  const cap = inFirstWeek ? Math.min(s.firstWeekCap, s.dailyCap) : s.dailyCap;
  return Math.max(0, Math.min(HARD_MAX_PER_DAY, cap));
}

export function checkSend(
  c: SendCandidate,
  ctx: { mode: "manual" | "autopilot"; settings: GuardrailSettings; history: SendHistoryItem[]; blocklist: Blocklist; now: Date },
): CheckResult {
  const { settings: s, history, blocklist, now, mode } = ctx;
  const blockers: Check[] = [];
  const warnings: Check[] = [];

  if (isStopped(s)) blockers.push({ code: "kill-switch", message: "Gli invii sono fermi. Per ripartire serve riattivarli." });
  if (!isValidEmail(c.recipient)) blockers.push({ code: "no-recipient", message: "Manca un indirizzo e-mail valido a cui scrivere." });

  if (c.jobId != null && history.some((h) => h.jobId === c.jobId)) {
    blockers.push({ code: "repeat-job", message: "Hai già inviato una candidatura per questa offerta." });
  }

  const comp = normalizeCompany(c.company);
  const domain = emailDomain(c.recipient);
  const cooldownDays = c.spontaneous ? s.spontaneousCooldownDays : s.companyCooldownDays;
  const sameCompany = history
    // Any earlier e-mail to the same company counts, job or spontaneous.
    .filter((h) => (comp && normalizeCompany(h.company) === comp) || (!comp && emailDomain(h.recipient) === domain))
    .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  if (sameCompany && now.getTime() - sameCompany.at.getTime() < cooldownDays * 86400000) {
    const again = new Date(sameCompany.at.getTime() + cooldownDays * 86400000);
    blockers.push({
      code: c.spontaneous ? "repeat-spontaneous" : "repeat-company",
      message: `Hai già scritto a ${c.company ?? domain} il ${formatDate(sameCompany.at)}. Potrai riscrivere dal ${formatDate(again)}.`,
    });
  }

  const text = fold(`${c.title} ${c.description}`);
  if (comp && blocklist.companies.some((b) => normalizeCompany(b) === comp)) {
    blockers.push({ code: "blocklist-company", message: "Questa azienda è nella lista da evitare." });
  }
  if (domain && blocklist.domains.some((d) => domain === d.toLowerCase() || domain.endsWith("." + d.toLowerCase()))) {
    blockers.push({ code: "blocklist-domain", message: "Questo indirizzo è nella lista da evitare." });
  }
  const kw = blocklist.keywords.find((k) => k && text.includes(fold(k)));
  if (kw) blockers.push({ code: "blocklist-keyword", message: `L'annuncio contiene "${kw}", che è nella lista da evitare.` });

  if (c.attachmentBytes != null && c.attachmentBytes > MAX_ATTACHMENT_BYTES) {
    blockers.push({ code: "attachment-too-big", message: "Il CV è più grande di 2 MB: serve una versione più leggera." });
  }

  for (const f of c.scamFlags) {
    if (mode === "autopilot") blockers.push({ code: `scam-${f.id}`, message: f.warning });
    else warnings.push({ code: `scam-${f.id}`, message: f.warning });
  }

  if (mode === "autopilot") {
    if (!s.autopilot) blockers.push({ code: "autopilot-off", message: "Il pilota automatico è spento." });
    if (c.level !== "molto" && !c.spontaneous) blockers.push({ code: "autopilot-level", message: "Il pilota automatico invia solo le offerte molto adatte." });
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

/**
 * When should the next e-mail go out? At least `undoMinutes` from now (the "Annulla" window),
 * 5-20 random minutes after the previous scheduled send, inside Mon-Fri 08:30-18:00 Rome time,
 * and never above the daily cap. Returns null if no slot exists in the next 30 days.
 */
export function scheduleSend(
  now: Date,
  settings: GuardrailSettings,
  scheduled: Date[], // queued + sent times
  rng: () => number = Math.random,
  /** Minimum delay from now. New approvals: the undo window. Re-scheduling an already-approved e-mail: 0. */
  minDelayMinutes: number = settings.undoMinutes,
): Date | null {
  const spacing = () =>
    (settings.spacingMinMinutes + rng() * (settings.spacingMaxMinutes - settings.spacingMinMinutes)) * 60000;
  const last = scheduled.reduce<Date | null>((m, d) => (m && m > d ? m : d), null);
  let t = new Date(now.getTime() + minDelayMinutes * 60000);
  const gap = spacing();
  if (last && last.getTime() + gap > t.getTime()) t = new Date(last.getTime() + gap);

  const perDay = new Map<string, number>();
  for (const d of scheduled) perDay.set(romeDateKey(d), (perDay.get(romeDateKey(d)) ?? 0) + 1);

  for (let i = 0; i < 60; i++) {
    const p = romeParts(t);
    const mins = minutesOfDay(p);
    const cap = effectiveDailyCap(settings, t);
    const weekend = p.weekday >= 6 || isItalianHoliday(p);
    const full = (perDay.get(romeDateKey(t)) ?? 0) >= cap;
    if (weekend || mins >= settings.windowEndMin || full) {
      t = nextWindowStart(t, settings, rng);
      continue;
    }
    if (mins < settings.windowStartMin) {
      t = new Date(romeToUtc(p.year, p.month, p.day, 0, 0).getTime() + settings.windowStartMin * 60000 + rng() * 10 * 60000);
      continue;
    }
    return t;
  }
  return null;
}

function nextWindowStart(t: Date, s: GuardrailSettings, rng: () => number): Date {
  const p = romeParts(t);
  // Noon of the next day in Rome, then snap to window start.
  const nextNoon = new Date(romeToUtc(p.year, p.month, p.day, 12, 0).getTime() + 86400000);
  const q = romeParts(nextNoon);
  return new Date(romeToUtc(q.year, q.month, q.day, 0, 0).getTime() + s.windowStartMin * 60000 + rng() * 10 * 60000);
}

/** Is `t` inside the send window (used by the queue runner as a last safety net)? */
export function inSendWindow(t: Date, s: GuardrailSettings): boolean {
  const p = romeParts(t);
  const m = minutesOfDay(p);
  return p.weekday <= 5 && !isItalianHoliday(p) && m >= s.windowStartMin && m < s.windowEndMin;
}
