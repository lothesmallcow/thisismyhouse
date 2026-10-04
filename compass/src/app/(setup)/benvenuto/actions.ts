"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { quickSearchFor } from "@/lib/pipeline/jobs";
import { redirect } from "next/navigation";
import { TASTES } from "@/lib/catalog/data";
import { getDb } from "@/lib/db";
import { COUNTRIES, findPlace, regionsOf } from "@/lib/core/geo";
import { requireUser } from "@/lib/server/auth";
import { rerankUser } from "@/lib/server/jobs";
import { applyPrefsForm } from "@/lib/server/prefs-form";
import { getProfile, suggestSynonyms, updateProfile, type ProfilePatch } from "@/lib/server/profile";
import { STEPS, stepsFor, type Mode, type StepId } from "./steps";

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
        const city = str(f, "city");
        const place = findPlace(city);
        Object.assign(patch, {
          city: place?.name ?? city,
          lat: place?.lat ?? null,
          lng: place?.lng ?? null,
          maxKm: Math.max(1, Math.min(100, Number(str(f, "km")) || 20)),
          remoteOk: str(f, "remote") === "1",
        });
        patch.extraPlaces = lines(str(f, "places")).slice(0, 8);
        const countries = f.getAll("country").map(String).filter((c) => COUNTRIES.some((x) => x.code === c));
        patch.countries = countries;
        patch.regions = f
          .getAll("region")
          .map(String)
          .filter((r) => COUNTRIES.some((c) => r.startsWith(`${c.code}:`) && regionsOf(c.code).includes(r.slice(3))))
          .slice(0, 40);
        // A region chosen in a country not ticked: that country counts as chosen too.
        for (const r of patch.regions) if (countries.length && !countries.includes(r.slice(0, 2))) countries.push(r.slice(0, 2));
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
  if (last) redirect("/benvenuto/fine");
  if (step === "risposte") redirect("/offerte?msg=salvato");
  redirect(`/benvenuto/${n + 1}`);
}

/** The version of the questionnaire chosen at the start (quick or complete). */
export async function chooseModeAction(f: FormData) {
  const user = await requireUser();
  const mode: Mode = str(f, "mode") === "veloce" ? "veloce" : "completo";
  await updateProfile(getDb(), user.id, { onboardingMode: mode, onboardingStep: 1 });
  revalidatePath("/", "layout");
  redirect("/benvenuto/1");
}
