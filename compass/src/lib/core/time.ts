// Europe/Rome time helpers without a date library. All storage is UTC; these helpers
// answer "what is the Italian local time of this instant" and the reverse.

export const TZ = "Europe/Rome";

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 1 = Monday ... 7 = Sunday
}

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function romeParts(d: Date): LocalParts {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS[p.weekday as string],
  };
}

/** "2026-10-05" in Rome. Used for daily caps. */
export function romeDateKey(d: Date): string {
  const p = romeParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The UTC instant for a given Rome wall-clock time (handles DST). */
export function romeToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Start from the naive UTC guess, then correct by the observed offset (twice for DST edges).
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 2; i++) {
    const p = romeParts(guess);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const wanted = Date.UTC(year, month - 1, day, hour, minute);
    guess = new Date(guess.getTime() + (wanted - asUtc));
  }
  return guess;
}

export function minutesOfDay(p: LocalParts): number {
  return p.hour * 60 + p.minute;
}

/** "oggi alle 8:00", "ieri alle 18:30", "lunedì 5 ottobre alle 9:15" */
export function formatWhen(d: Date, now = new Date()): string {
  const day = romeDateKey(d);
  const p = romeParts(d);
  const time = `${p.hour}:${String(p.minute).padStart(2, "0")}`;
  if (day === romeDateKey(now)) return `oggi alle ${time}`;
  if (day === romeDateKey(new Date(now.getTime() - 86400000))) return `ieri alle ${time}`;
  if (day === romeDateKey(new Date(now.getTime() + 86400000))) return `domani alle ${time}`;
  const date = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
  return `${date} alle ${time}`;
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** Current time in ms (kept in one place so render code stays pure). */
export function nowMs(): number {
  return Date.now();
}

export function daysAgoLabel(d: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 7) return `${days} giorni fa`;
  if (days < 14) return "una settimana fa";
  if (days < 31) return `${Math.floor(days / 7)} settimane fa`;
  return "più di un mese fa";
}
