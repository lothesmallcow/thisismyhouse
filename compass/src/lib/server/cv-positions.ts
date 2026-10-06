// The inputs of the CV recommendations, read for one person.
import { eq } from "drizzle-orm";
import { recommendPositions, type CvPosition } from "../core/cv-positions";
import { workYears } from "../core/requirements";
import type { DB } from "../db";
import { schema } from "../db";
import { getPrefs, listSectors } from "./catalog";
import { listExperiences } from "./experiences";
import { getProfile } from "./profile";
import { ACTIVITIES } from "../core/situation";

export async function cvPositionsFor(db: DB, userId: number): Promise<{ roles: string[]; recommended: CvPosition[]; hasCv: boolean }> {
  const [p, exps, cvs, prefs, sectors] = await Promise.all([
    getProfile(db, userId),
    listExperiences(db, userId),
    db.select({ text: schema.cvs.text }).from(schema.cvs).where(eq(schema.cvs.userId, userId)),
    getPrefs(db, userId),
    listSectors(db, userId),
  ]);
  const liked = sectors.filter((s) => prefs.sectors.get(s.id) === "like").map((s) => s.slug);
  const recommended = recommendPositions({
    track: p.track,
    experiences: exps,
    // Activities they ticked ("club di finanza", "startup") point to directions like CV lines do.
    cvText: [...cvs.map((c) => c.text ?? ""), ...ACTIVITIES.filter((a) => p.activities.includes(a.key)).map((a) => a.words)].join("\n"),
    years: workYears(exps) ?? p.yearsExperience,
    sectors: liked,
    roles: p.roles,
    priority: p.priority,
  });
  return { roles: p.roles, recommended, hasCv: cvs.length > 0 || exps.length > 0 };
}
