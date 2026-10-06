// The application dates of an offer, in words: "Scade il 16 ottobre, tra 10 giorni", "Candidature chiuse",
// "Valutano le candidature man mano: candidati subito", "Si svolge 20-22 aprile 2027".
import { runLabel } from "./dates";

type Dated = { closesAt: Date | null; opensAt: Date | null; runsStart: Date | null; runsEnd: Date | null; runsMonthOnly: boolean; rolling: boolean };

const day = (d: Date) => d.toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" });

export function deadlineText(j: Dated, now: Date): { text: string; urgent: boolean } | null {
  if (j.closesAt) {
    const days = Math.ceil((j.closesAt.getTime() - now.getTime()) / 86_400_000);
    if (days < 0) return { text: `Candidature chiuse il ${day(j.closesAt)}`, urgent: false };
    if (days === 0) return { text: "Scade oggi", urgent: true };
    return { text: `Scade il ${day(j.closesAt)}${days <= 30 ? `, tra ${days} ${days === 1 ? "giorno" : "giorni"}` : ""}`, urgent: days <= 7 };
  }
  if (j.opensAt && j.opensAt.getTime() > now.getTime()) return { text: `Le candidature aprono il ${day(j.opensAt)}`, urgent: false };
  return null;
}

export function runsText(j: Dated): string | null {
  return j.runsStart ? `Si svolge ${runLabel({ start: j.runsStart, end: j.runsEnd, monthOnly: j.runsMonthOnly })}` : null;
}

export const ROLLING_TEXT = "Valutano le candidature man mano: meglio candidarsi subito";
