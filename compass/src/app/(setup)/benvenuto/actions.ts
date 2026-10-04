"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { findPlace } from "@/lib/core/geo";
import { requireUser } from "@/lib/server/auth";
import { rerankAll } from "@/lib/server/jobs";
import { getProfile, suggestSynonyms, updateProfile, type ProfilePatch } from "@/lib/server/profile";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lines = (s: string) => s.split(/\n|,/).map((x) => x.trim()).filter(Boolean);

export async function saveStepAction(f: FormData) {
  await requireUser();
  const db = getDb();
  const step = str(f, "step");
  const skip = str(f, "skip") === "1";
  const back = str(f, "ritorno") === "profilo";
  const patch: ProfilePatch = {};

  if (!skip) {
    switch (step) {
      case "1":
        Object.assign(patch, { name: str(f, "name"), phone: str(f, "phone"), email: str(f, "email") });
        break;
      case "2": {
        if (str(f, "fase") === "sinonimi") {
          patch.synonyms = [...f.getAll("synonym").map(String), ...lines(str(f, "extra"))];
        } else {
          const roles = [str(f, "role1"), str(f, "role2"), str(f, "role3")].filter(Boolean);
          patch.roles = roles;
          await updateProfile(db, patch);
          if (suggestSynonyms(roles).length > 0 || roles.length > 0) {
            redirect(`/benvenuto/2?fase=sinonimi${back ? "&ritorno=profilo" : ""}`);
          }
        }
        break;
      }
      case "3": {
        const city = str(f, "city");
        const place = findPlace(city);
        Object.assign(patch, {
          city: place?.name ?? city,
          lat: place?.lat ?? null,
          lng: place?.lng ?? null,
          maxKm: Math.max(1, Math.min(100, Number(str(f, "km")) || 20)),
          remoteOk: str(f, "remote") === "1",
        });
        break;
      }
      case "4":
        Object.assign(patch, { hours: (str(f, "hours") || "any") as "full" | "part" | "any", contracts: f.getAll("contract").map(String) });
        break;
      case "5": {
        const n = Number(str(f, "net").replace(/[^\d]/g, ""));
        patch.minNetMonthly = n > 0 ? n : null;
        break;
      }
      case "6": {
        const langs = ["inglese", "francese", "tedesco", "spagnolo"]
          .map((l) => ({ language: l, level: str(f, `lang-${l}`) }))
          .filter((l) => ["base", "buono", "fluente"].includes(l.level)) as { language: string; level: "base" | "buono" | "fluente" }[];
        patch.languages = langs;
        break;
      }
      case "8":
        Object.assign(patch, {
          avoidSectors: f.getAll("sector").map(String),
          avoidCompanies: lines(str(f, "companies")),
          avoidKeywords: lines(str(f, "keywords")),
        });
        break;
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

  const current = await getProfile(db);
  const n = Number(step);
  if (!back && Number.isFinite(n) && n + 1 > current.onboardingStep) patch.onboardingStep = n + 1;
  if (step === "8" && !current.onboardedAt) patch.onboardedAt = new Date();
  await updateProfile(db, patch);
  if (["2", "3", "4", "5", "6", "8"].includes(step)) await rerankAll(db);
  revalidatePath("/", "layout");

  if (back) redirect("/aiuto/profilo?msg=salvato");
  if (step === "8") redirect("/benvenuto/fine");
  if (step === "risposte") redirect("/offerte");
  redirect(`/benvenuto/${n + 1}`);
}
