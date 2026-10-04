// App settings stored as JSON rows. Defaults live here; the DB only stores overrides.
import { eq } from "drizzle-orm";
import { DEFAULT_GUARDRAILS, type GuardrailSettings } from "../core/guardrails";
import type { DB } from "../db";
import { schema } from "../db";

export interface AppSettings {
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
  /** Daily e-mail to her normal inbox. */
  digestEnabled: boolean;
  lastIngestAt: string | null;
  lastDigestDay: string | null;
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
  lastIngestAt: null,
  lastDigestDay: null,
};

type Stored = Omit<AppSettings, "guardrails"> & { guardrails: Omit<GuardrailSettings, "goLiveAt"> & { goLiveAt: string | null } };

export async function getSettings(db: DB): Promise<AppSettings> {
  const rows = await db.select().from(schema.settings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Stored>;
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
  await db
    .insert(schema.settings)
    .values({ key, value: v })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: v } });
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
