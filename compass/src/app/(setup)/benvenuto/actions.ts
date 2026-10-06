"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { quickSearchFor } from "@/lib/pipeline/jobs";
import { redirect } from "next/navigation";
import { TASTES } from "@/lib/catalog/data";
import { getDb } from "@/lib/db";
import { parsePlaceValue, profileFromPlaces } from "@/lib/core/where";
import { requireUser } from "@/lib/server/auth";
import { rerankUser } from "@/lib/server/jobs";
import { applyPrefsForm } from "@/lib/server/prefs-form";
import { getProfile, suggestSynonyms, updateProfile, type ProfilePatch } from "@/lib/server/profile";
import { STEPS, stepsFor, type Mode, type StepId } from "./steps";
import { ACTIVITIES, NOTICE, situationOf, workRightsOf } from "@/lib/core/situation";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lines = (s: string) => s.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
const int = (s: string) => (Number.isInteger(Number(s)) && s !== "" ? Number(s) : null);

/** Save one questionnaire step, then go to the next one (or back to the profile). */
const priorityOf = (f: FormData, fallback: "alta" | "media" | "bassa") => {
  const v = str(f, "priority");
  return v === "alta" || v === "media" || v === "bassa" ? v : fallback;
};

export async function saveStepAction(f: FormData) {
  const user = await requireUser();
  const db = getDb();
  const step = str(f, "step") as StepId | "risposte";
  const skip = str(f, "skip") === "1";
  const back = str(f, "ritorno") === "profilo";
  const current = await getProfile(db, user.id);
  // Editing from the profile uses the full list (its links point there); otherwise the chosen version.
  const steps = back ? STEPS[current.track] : stepsFor(current.track, current.onboardingMode);
  const n = Number(str(f, "n")) || steps.indexOf(step as StepId) + 1;
  const patch: ProfilePatch = {};

  if (!skip) {
    switch (step) {
      case "nome":
        Object.assign(patch, { name: str(f, "name"), phone: str(f, "phone"), email: str(f, "email") });
        break;
      case "ruolo": {
        if (str(f, "fase") === "sinonimi") {
          patch.synonyms = [...f.getAll("synonym").map(String), ...lines(str(f, "extra"))];
        } else {
          const roles = [1, 2, 3, 4, 5].map((k) => str(f, `role${k}`)).filter(Boolean);
          await updateProfile(db, user.id, { roles, priority: priorityOf(f, current.priority) });
          if (roles.length > 0 && suggestSynonyms(roles).length + current.synonyms.length > 0) {
            redirect(`/benvenuto/${n}?fase=sinonimi${back ? "&ritorno=profilo" : ""}`);
          }
        }
        break;
      }
      case "esperienza": {
        const years = int(str(f, "yearsExperience"));
        const notice = str(f, "noticePeriod");
        Object.assign(patch, {
          yearsExperience: years != null && years >= 0 && years <= 60 ? years : null,
          currentRole: str(f, "currentRole").slice(0, 120),
          ...(NOTICE.some((x) => x.key === notice) ? { noticePeriod: notice } : {}),
        });
        // The "available from" answer for job sites, when they have not written one.
        const label = NOTICE.find((x) => x.key === notice)?.label;
        if (label && !current.availability) patch.availability = label;
        break;
      }
      case "attivita":
        patch.activities = f.getAll("activity").map(String).filter((a) => ACTIVITIES.some((x) => x.key === a));
        break;
      case "studi": {
        const year = int(str(f, "studyYear"));
        const total = int(str(f, "degreeYears"));
        Object.assign(patch, {
          university: str(f, "university").slice(0, 120),
          degree: str(f, "degree").slice(0, 120),
          studyYear: year && year >= 1 && year <= 6 ? year : null,
          degreeYears: total && [2, 3, 5, 6].includes(total) ? total : null,
          graduationYear: int(str(f, "graduationYear")),
          priority: priorityOf(f, current.priority),
        });
        break;
      }
      case "dove": {
        // Cities, regions or whole countries (no distances).
        const places = f.getAll("place").map(String).map(parsePlaceValue).filter((x): x is NonNullable<typeof x> => x != null);
        const fields = profileFromPlaces(places);
        Object.assign(patch, { ...fields, countries: fields.countries, remoteOk: str(f, "remote") === "1", ...workRightsOf(f) });
        break;
      }
      case "quando":
        Object.assign(patch, { periods: f.getAll("period").map(String), paidOnly: str(f, "paidOnly") === "1" });
        break;
      case "contratto":
        Object.assign(patch, { hours: (str(f, "hours") || "any") as "full" | "part" | "any", contracts: f.getAll("contract").map(String) });
        break;
      case "paga": {
        const v = Number(str(f, "net").replace(/[^\d]/g, ""));
        patch.minNetMonthly = v > 0 ? v : null;
        patch.hideBelowMin = v > 0 && str(f, "hideBelowMin") === "1";
        break;
      }
      case "lingue":
        patch.languages = ["inglese", "francese", "tedesco", "spagnolo"]
          .map((l) => ({ language: l, level: str(f, `lang-${l}`) }))
          .filter((l) => ["base", "buono", "fluente"].includes(l.level)) as { language: string; level: "base" | "buono" | "fluente" }[];
        break;
      case "settori":
      case "aziende":
        await applyPrefsForm(db, user.id, f);
        break;
      case "gusti":
        patch.tastes = f.getAll("taste").map(String).filter((t) => TASTES.some((x) => x.key === t));
        break;
      case "evitare":
        Object.assign(patch, { avoidCompanies: lines(str(f, "companies")), avoidKeywords: lines(str(f, "keywords")) });
        break;
      case "focus": {
        const focus = str(f, "focus");
        Object.assign(patch, { focus: focus === "tutte" ? "tutte" : "preferite", focusCompaniesOnly: focus === "aziende" });
        break;
      }
      case "risposte":
        Object.assign(patch, {
          presentation: str(f, "presentation"),
          availability: str(f, "availability"),
          salaryExpectation: str(f, "salaryExpectation"),
          linkedinUrl: str(f, "linkedinUrl"),
        });
        break;
    }
  }

  const last = n >= steps.length && step !== "risposte";
  if (!back && step !== "risposte" && n + 1 > current.onboardingStep) patch.onboardingStep = Math.min(n + 1, steps.length);
  if (last && !current.onboardedAt) {
    patch.onboardedAt = new Date();
    // The first offers now, not tomorrow morning: a search in the background after the reply.
    after(() => quickSearchFor(getDb(), user.id));
  }
  await updateProfile(db, user.id, patch);
  if (!["nome", "risposte", "cv"].includes(step)) await rerankUser(db, user.id);
  revalidatePath("/", "layout");

  if (back) redirect("/profilo?msg=salvato");
  if (last) redirect("/benvenuto/piani"); // the plans, then the last page
  if (step === "risposte") redirect("/offerte?msg=salvato");
  redirect(`/benvenuto/${n + 1}`);
}

/** The version of the questionnaire chosen at the start (quick or complete). */
export async function chooseModeAction(f: FormData) {
  const user = await requireUser();
  const mode: Mode = str(f, "mode") === "veloce" ? "veloce" : "completo";
  // "Cosa fai ora?" decides the questionnaire: students get studies and activities, workers experience.
  const sit = situationOf(str(f, "situation"));
  if (!sit) redirect("/benvenuto/inizio?msg=scegli-situazione");
  await updateProfile(getDb(), user.id, { onboardingMode: mode, onboardingStep: 1, situation: sit.key, track: sit.track, ...(sit.key === "magistrale" ? { degreeYears: 2 } : {}) });
  revalidatePath("/", "layout");
  redirect("/benvenuto/1");
}
