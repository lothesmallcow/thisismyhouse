// Dates written in job and programme pages, in English, Italian, German and French: "16 October 2026",
// "October 16th, 2026", "16/10/2026", "2026-10-16", "16 ott", "20-22 April 2027". Then the dates that
// matter: when applications close and open, and when the programme runs. No network, no AI: phrases
// near the date decide what it is, and a date that is only probable is never presented as certain.
import { fold } from "./text";

const MONTHS: Record<string, number> = {};
const add = (m: number, ...names: string[]) => names.forEach((n) => (MONTHS[n] = m));
add(1, "january", "jan", "gennaio", "genn", "gen", "januar", "jan", "janvier", "janv");
add(2, "february", "feb", "febbraio", "febr", "februar", "fevrier", "fevr", "fev");
add(3, "march", "mar", "marzo", "marz", "maerz", "mars");
add(4, "april", "apr", "aprile", "avril", "avr");
add(5, "may", "maggio", "magg", "mag", "mai");
add(6, "june", "jun", "giugno", "giu", "juni", "juin");
add(7, "july", "jul", "luglio", "lug", "juli", "juillet", "juil");
add(8, "august", "aug", "agosto", "ago", "aout");
add(9, "september", "sep", "sept", "settembre", "sett", "set", "septembre");
add(10, "october", "oct", "ottobre", "ott", "oktober", "okt", "octobre");
add(11, "november", "nov", "novembre");
add(12, "december", "dec", "dicembre", "dic", "dezember", "dez", "decembre");
const MONTH = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");

export interface FoundDate {
  date: Date;
  /** Position in the folded text. */
  at: number;
  end: number;
  /** The year was not written: guessed as the next one after "now". */
  yearGuessed: boolean;
}

const make = (y: number, m: number, d: number): Date | null => {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.getUTCMonth() === m - 1 ? dt : null; // 31 June is not a date
};
/** A day and month without a year: the next such date, allowing 60 days back (a deadline just passed). */
const guessYear = (m: number, d: number, now: Date): Date | null => {
  const y = now.getUTCFullYear();
  const a = make(y, m, d);
  if (!a) return null;
  return a.getTime() < now.getTime() - 60 * 86_400_000 ? make(y + 1, m, d) : a;
};

/** Every date in the text, in order. `t` must already be folded (lowercase, no accents). */
export function findDates(t: string, now: Date): FoundDate[] {
  const out: FoundDate[] = [];
  const push = (date: Date | null, at: number, len: number, yearGuessed = false) => {
    if (date && !out.some((o) => at >= o.at && at < o.end)) out.push({ date, at, end: at + len, yearGuessed });
  };
  let m: RegExpExecArray | null;
  // 2026-10-16
  const iso = /\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = iso.exec(t))) push(make(+m[1], +m[2], +m[3]), m.index, m[0].length);
  // 16 October 2026, 16th of Oct, 2026, 16. Oktober 2026, le 16 octobre 2026
  const dmy = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th|\\.)?\\s+(?:of\\s+|de\\s+|di\\s+)?(${MONTH})\\.?,?(?:\\s+(20\\d\\d))?\\b`, "g");
  while ((m = dmy.exec(t))) {
    const mo = MONTHS[m[2]];
    push(m[3] ? make(+m[3], mo, +m[1]) : guessYear(mo, +m[1], now), m.index, m[0].length, !m[3]);
  }
  // October 16, 2026 / Oct 16th
  const mdy = new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b,?(?:\\s+(20\\d\\d))?`, "g");
  while ((m = mdy.exec(t))) {
    const mo = MONTHS[m[1]];
    push(m[3] ? make(+m[3], mo, +m[2]) : guessYear(mo, +m[2], now), m.index, m[0].length, !m[3]);
  }
  // 16/10/2026 or 16.10.2026: day first (European pages); month first only when the day is > 12.
  const num = /\b(\d{1,2})[./](\d{1,2})[./](20\d\d)\b/g;
  while ((m = num.exec(t))) {
    const [a, b] = [+m[1], +m[2]];
    push(b > 12 && a <= 12 ? make(+m[3], a, b) : make(+m[3], b, a), m.index, m[0].length);
  }
  return out.sort((x, y) => x.at - y.at);
}

const CLOSE = /deadline|closing date|close[sd]? on|applications? (?:will )?close|applications? (?:are )?due|apply (?:by|before|no later than)|submit (?:your )?application (?:by|before)|last day to apply|scadenza|candidature? entro|entro e non oltre|entro il|termine (?:ultimo )?(?:per (?:l[ae] )?)?(?:candidatur|invio)|chiusura (?:delle )?candidature|bewerbungsschluss|bewerbungsfrist|einsendeschluss|date limite|cloture des candidatures|avant le/g;
const OPEN = /applications? (?:will )?(?:open|launch)|opens? on|open(?:ing)? date|apertura (?:delle )?candidature|candidature (?:aperte )?dal|bewerbungsstart|ouverture des candidatures/g;
const RUNS = /takes? place|will (?:run|take place|be held)|(?:programme|program|event|insight|week) (?:dates?|runs?|is held)|dates? of the (?:programme|program|event)|held (?:on|in|from|between)|runs? (?:from|between|in)|si (?:svolge|svolgera|terra)|date del programma|dal \d|findet (?:vom|am|im) |aura lieu|se deroulera/g;
const ROLLING = /rolling (?:basis|recruitment|process|review|applications?)|on a rolling|as (?:they|applications) (?:are )?(?:received|come in)|first come,? first served|apply (?:as )?early|early applications? (?:are|is) (?:encouraged|advised|recommended)|in ordine di arrivo|valutate (?:man mano|via via)|au fil de l.eau|laufend/;

/** The first date that follows one of the phrases, within `reach` characters. */
function dateAfter(t: string, re: RegExp, dates: FoundDate[], reach = 90): FoundDate | null {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const from = m.index + m[0].length;
    const d = dates.find((x) => x.at >= from - 2 && x.at <= from + reach);
    if (d) return d;
  }
  return null;
}

export interface RunWindow {
  start: Date;
  end: Date | null;
  /** Only the month is known ("in April 2027"). */
  monthOnly: boolean;
}

const RANGE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|–|to|until|al|a|bis|au)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})\\.?,?(?:\\s+(20\\d\\d))?`, "g");
const MONTH_RANGE = new RegExp(`\\b(${MONTH})\\s*(?:-|–|/|to|and|e|bis|ou)\\s*(${MONTH})\\s+(20\\d\\d)\\b`, "g");
const MONTH_YEAR = new RegExp(`\\b(?:in|during|nel mese di|a|ad|im|en)\\s+(${MONTH})\\s+(20\\d\\d)\\b`, "g");

/** When the programme itself happens: a range ("20-22 April 2027"), a date, or a month near "takes place". */
function runWindow(t: string, dates: FoundDate[], now: Date): RunWindow | null {
  RUNS.lastIndex = 0;
  let m: RegExpExecArray | null;
  const near = (from: number) => t.slice(from, from + 120);
  while ((m = RUNS.exec(t))) {
    const from = m.index + m[0].length - 4;
    const slice = near(from);
    RANGE.lastIndex = 0;
    const r = RANGE.exec(slice);
    if (r) {
      const mo = MONTHS[r[3]];
      const y = r[4] ? +r[4] : (guessYear(mo, +r[1], now)?.getUTCFullYear() ?? now.getUTCFullYear());
      const start = make(y, mo, +r[1]);
      const end = make(y, mo, +r[2]);
      if (start) return { start, end, monthOnly: false };
    }
    MONTH_RANGE.lastIndex = 0;
    const mr = MONTH_RANGE.exec(slice);
    if (mr) {
      const start = make(+mr[3], MONTHS[mr[1]], 1);
      const last = make(+mr[3], MONTHS[mr[2]], 1);
      if (start && last) return { start, end: new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0, 12)), monthOnly: true };
    }
    MONTH_YEAR.lastIndex = 0;
    const my = MONTH_YEAR.exec(` ${slice}`);
    const d = dates.find((x) => x.at >= from && x.at <= from + 120);
    if (d) return { start: d.date, end: null, monthOnly: false };
    if (my) {
      const start = make(+my[2], MONTHS[my[1]], 1);
      if (start) return { start, end: null, monthOnly: true };
    }
  }
  // A bare range anywhere ("Spring Week 20-22 April 2027") is the run, not a deadline.
  RANGE.lastIndex = 0;
  const r = RANGE.exec(t);
  if (r && r[4]) {
    const mo = MONTHS[r[3]];
    const start = make(+r[4], mo, +r[1]);
    if (start) return { start, end: make(+r[4], mo, +r[2]), monthOnly: false };
  }
  return null;
}

export interface KeyDates {
  closesAt: Date | null;
  opensAt: Date | null;
  runs: RunWindow | null;
  /** Applications reviewed as they arrive: apply now. */
  rolling: boolean;
}

/** The dates that matter in a page or an ad (`text` as written; folded here). */
export function keyDates(text: string, now: Date): KeyDates {
  const t = fold(text).replace(/\s+/g, " ");
  const dates = findDates(t, now);
  const close = dateAfter(t, CLOSE, dates);
  const open = dateAfter(t, OPEN, dates);
  const runs = runWindow(t, dates, now);
  // A closing date after the programme starts is not the closing date (it was the run's end).
  const closesAt = close && !(runs && close.date.getTime() > runs.start.getTime()) ? close.date : null;
  return { closesAt, opensAt: open && open !== close ? open.date : null, runs, rolling: ROLLING.test(t) };
}

/** "20-22 aprile 2027", "aprile 2027", "15 marzo 2027" (for people, in Italian). */
export function runLabel(r: RunWindow): string {
  const mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const s = r.start;
  if (r.monthOnly) return r.end && r.end.getUTCMonth() !== s.getUTCMonth() ? `${mesi[s.getUTCMonth()]}-${mesi[r.end.getUTCMonth()]} ${r.end.getUTCFullYear()}` : `${mesi[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  if (r.end && r.end.getTime() !== s.getTime()) {
    return r.end.getUTCMonth() === s.getUTCMonth()
      ? `${s.getUTCDate()}-${r.end.getUTCDate()} ${mesi[s.getUTCMonth()]} ${s.getUTCFullYear()}`
      : `${s.getUTCDate()} ${mesi[s.getUTCMonth()]} - ${r.end.getUTCDate()} ${mesi[r.end.getUTCMonth()]} ${r.end.getUTCFullYear()}`;
  }
  return `${s.getUTCDate()} ${mesi[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
}
