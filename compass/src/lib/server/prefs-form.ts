// Shared by the "Aziende" page and the questionnaire: apply one submitted form of catalog choices.
import type { DB } from "../db";
import { COMPANY_KINDS, type CompanyKind } from "../db/schema";
import { addCustomCompany, addCustomSector, listCompanies, listSectors, setPrefs } from "./catalog";
import { getProfile } from "./profile";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ids = (f: FormData, k: string) => f.getAll(k).map(Number).filter((n) => Number.isInteger(n) && n > 0);
const lines = (s: string) => s.split(/\n|,|;/).map((x) => x.trim()).filter(Boolean);

/**
 * The entries checked (`pick`) get `stance` ("like" or "avoid"); entries shown on the form
 * (`shown`) and not checked lose that stance. "Altro" lines are added (private to this person)
 * with the same stance. Only entries this person can see are touched.
 */
export async function applyPrefsForm(db: DB, userId: number, f: FormData, prefix = ""): Promise<{ added: number }> {
  const p = await getProfile(db, userId);
  const kind = str(f, `${prefix}kind`) === "sector" ? "sector" : "company";
  const stance = str(f, `${prefix}stance`) === "avoid" ? "avoid" : "like";
  const visible = new Set(kind === "sector" ? (await listSectors(db, userId)).map((s) => s.id) : (await listCompanies(db, userId)).map((c) => c.id));
  const shown = ids(f, `${prefix}shown`).filter((id) => visible.has(id));
  const picked = ids(f, `${prefix}pick`).filter((id) => visible.has(id));
  await setPrefs(db, userId, kind, stance, picked, shown);
  let added = 0;
  for (const name of lines(str(f, `${prefix}altro`)).slice(0, 20)) {
    if (kind === "sector") {
      if (await addCustomSector(db, userId, name, p.track, stance)) added++;
    } else {
      const k = str(f, `${prefix}altroKind`) as CompanyKind;
      const sectorId = Number(str(f, `${prefix}altroSector`)) || null;
      if (await addCustomCompany(db, userId, { name, kind: COMPANY_KINDS.includes(k) ? k : "azienda", sectorId, city: str(f, `${prefix}altroCity`) || null }, p.track, stance)) added++;
    }
  }
  return { added };
}
