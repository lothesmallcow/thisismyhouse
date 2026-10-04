// App settings stored as JSON rows. Defaults live here; the DB only stores overrides.
// Global settings (sources, caps, the admin's stop) are one row per key; each person's own
// switches (their stop, autopilot, first-week date, morning e-mail) live under "user:<id>".
import { eq } from "drizzle-orm";
import { DEFAULT_GUARDRAILS, type GuardrailSettings } from "../core/guardrails";
import type { DB } from "../db";
import { schema } from "../db";

export type RegistrationMode = "closed" | "invite" | "open";

export interface AppSettings {
  /** Caps, window, spacing, cooldowns and the admin's stop. Per-person fields are overridden by UserSettings. */
  guardrails: GuardrailSettings;
  /** Admin switch for real e-mail. Effective only when DEMO_MODE=false too. */
  realSending: boolean;
  w1Enabled: boolean;
  w1DailyCap: number;
  /** W3 single-page enrichment. Off by default; enabling is the admin's call after the terms review. */
  w3Enabled: boolean;
  adzunaEnabled: boolean;
  /** Online geocoder fallback (Nominatim) for places outside the offline dataset. Off by default. */
  geocoderEnabled: boolean;
  joobleEnabled: boolean;
  /** Master switch for the morning e-mails (each person can also turn theirs off). */
  digestEnabled: boolean;
  /** Who can create an account: nobody (admin only), people with an invitation code, anyone. */
  registration: RegistrationMode;
  lastIngestAt: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  guardrails: DEFAULT_GUARDRAILS,
  realSending: false,
  w1Enabled: true,
  w1DailyCap: 25,
  w3Enabled: false,
  adzunaEnabled: true,
  geocoderEnabled: false,
  joobleEnabled: false,
  digestEnabled: true,
  registration: "invite",
  lastIngestAt: null,
};

/** One person's own switches. */
export interface UserSettings {
  killSwitch: boolean; // "Ferma tutti gli invii"
  autopilot: boolean;
  goLiveAt: Date | null; // first real send: the "first week at 3 per day" starts here
  digestEnabled: boolean;
  lastDigestDay: string | null;
}

export const DEFAULT_USER_SETTINGS: UserSettings = { killSwitch: false, autopilot: false, goLiveAt: null, digestEnabled: true, lastDigestDay: null };

type Stored = Omit<AppSettings, "guardrails"> & { guardrails: Omit<GuardrailSettings, "goLiveAt"> & { goLiveAt: string | null } };

export async function getSettings(db: DB): Promise<AppSettings> {
  const rows = await db.select().from(schema.settings);
  const stored = Object.fromEntries(rows.filter((r) => !r.key.startsWith("user:")).map((r) => [r.key, r.value])) as Partial<Stored>;
  const g = { ...DEFAULT_GUARDRAILS, ...(stored.guardrails ?? {}) } as GuardrailSettings & { goLiveAt: unknown };
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    guardrails: { ...g, goLiveAt: g.goLiveAt ? new Date(g.goLiveAt as unknown as string) : null },
  } as AppSettings;
}

export async function setSetting<K extends keyof AppSettings>(db: DB, key: K, value: AppSettings[K]): Promise<void> {
  let v: unknown = value;
  if (key === "guardrails") {
    const g = value as GuardrailSettings;
    v = { ...g, goLiveAt: g.goLiveAt ? g.goLiveAt.toISOString() : null };
  }
  await upsert(db, key, v);
}

async function upsert(db: DB, key: string, value: unknown) {
  await db.insert(schema.settings).values({ key, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } });
}

export async function updateGuardrails(db: DB, patch: Partial<GuardrailSettings>): Promise<GuardrailSettings> {
  const s = await getSettings(db);
  const next = { ...s.guardrails, ...patch };
  await setSetting(db, "guardrails", next);
  return next;
}

export async function deleteSetting(db: DB, key: keyof AppSettings): Promise<void> {
  await db.delete(schema.settings).where(eq(schema.settings.key, key));
}

export async function getUserSettings(db: DB, userId: number): Promise<UserSettings> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, `user:${userId}`) });
  const v = { ...DEFAULT_USER_SETTINGS, ...((row?.value as Partial<UserSettings & { goLiveAt: string | null }>) ?? {}) };
  return { ...v, killSwitch: Boolean(v.killSwitch), autopilot: Boolean(v.autopilot), digestEnabled: v.digestEnabled !== false, goLiveAt: v.goLiveAt ? new Date(v.goLiveAt) : null };
}

export async function updateUserSettings(db: DB, userId: number, patch: Partial<UserSettings>): Promise<UserSettings> {
  const next = { ...(await getUserSettings(db, userId)), ...patch };
  await upsert(db, `user:${userId}`, { ...next, goLiveAt: next.goLiveAt ? next.goLiveAt.toISOString() : null });
  return next;
}

export async function deleteUserSettings(db: DB, userId: number): Promise<void> {
  await db.delete(schema.settings).where(eq(schema.settings.key, `user:${userId}`));
}

/** The guardrails that apply to one person: the global rules plus their own stop, autopilot and first week. */
export async function guardrailsFor(db: DB, userId: number, s?: AppSettings): Promise<GuardrailSettings> {
  const g = (s ?? (await getSettings(db))).guardrails;
  const u = await getUserSettings(db, userId);
  return { ...g, killSwitch: u.killSwitch, autopilot: u.autopilot, goLiveAt: u.goLiveAt };
}
