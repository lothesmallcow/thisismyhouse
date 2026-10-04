import { describe, expect, it } from "vitest";
import { NO_CHOICES, rankJob, type RankJob, type RankProfile } from "@/lib/core/rank";
import { scamFlags } from "@/lib/core/scam-rules";

const profile: RankProfile = {
  ...NO_CHOICES,
  roles: ["Impiegata amministrativa"],
  synonyms: ["Addetta contabilità"],
  maxKm: 25,
  remoteOk: true,
  hours: "part",
  contracts: ["indeterminato", "determinato"],
  minAnnualGross: 22000,
  languages: [{ language: "inglese", level: "base" }],
  avoidKeywords: ["porta a porta"],
  avoidCompanies: ["Truffaldini Srl"],
  avoidSectors: [],
};

const now = new Date("2026-10-05T08:00:00Z");
const base: RankJob = {
  city: "Torino",
  jobType: "unknown",
  eligibility: [],
  title: "Impiegata amministrativa",
  company: "Rossi Srl",
  description: "",
  sector: "Amministrazione e contabilità",
  distanceKm: 8,
  remote: "onsite",
  hours: "part",
  contract: "indeterminato",
  minAnnualGross: 24000,
  maxAnnualGross: 26000,
  languages: [],
  postedAt: new Date("2026-10-04T08:00:00Z"),
  scamFlagCount: 0,
};

describe("rankJob", () => {
  it("a perfect fit is Molto adatta with positive reasons", () => {
    const r = rankJob(base, profile, [], now);
    expect(r.level).toBe("molto");
    expect(r.reasons).toHaveLength(2);
    expect(r.reasons[0]).toMatch(/lavoro che cerchi/);
  });

  it("unknown salary is neutral, not a fail", () => {
    const a = rankJob(base, profile, [], now).score;
    const b = rankJob({ ...base, minAnnualGross: null, maxAnnualGross: null }, profile, [], now).score;
    expect(a - b).toBe(10); // only the bonus disappears; no penalty
  });

  it("salary below the floor is a penalty", () => {
    const r = rankJob({ ...base, maxAnnualGross: 18000 }, profile, [], now);
    expect(r.factors.find((f) => f.key === "salary")?.points).toBe(-20);
  });

  it("far away jobs drop and say so", () => {
    const r = rankJob({ ...base, distanceKm: 70, title: "Magazziniere" }, profile, [], now);
    expect(r.level).toBe("poco");
    expect(r.reasons[0]).toMatch(/Lontano: 70 km/);
  });

  it("remote work counts as close when she accepts it", () => {
    const r = rankJob({ ...base, distanceKm: null, remote: "remote" }, profile, [], now);
    expect(r.reasons.join(" ")).toMatch(/Da remoto/);
  });

  it("fluent English she lacks is a reason", () => {
    const r = rankJob({ ...base, languages: [{ language: "inglese", level: "fluente" }], hours: "full" }, profile, [], now);
    expect(r.factors.some((f) => f.reason === "Chiede inglese fluente")).toBe(true);
  });

  it("excluded company sinks to Poco adatta", () => {
    expect(rankJob({ ...base, company: "TRUFFALDINI S.R.L." }, profile, [], now).level).toBe("poco");
  });

  it("negative keyword", () => {
    expect(rankJob({ ...base, description: "Vendita porta a porta" }, profile, [], now).factors.some((f) => f.key === "avoid-keyword")).toBe(true);
  });

  it("adjustments from 'Non mi interessa' change future ranking, and removing them undoes it", () => {
    const before = rankJob(base, profile, [], now);
    const adj = [{ id: 1, kind: "company" as const, value: "Rossi Srl", label: "Rossi" }];
    expect(rankJob(base, profile, adj, now).level).toBe("poco");
    expect(rankJob(base, profile, [], now)).toEqual(before);
  });

  it("distance adjustment tightens the radius", () => {
    const adj = [{ id: 2, kind: "distance" as const, value: "5", label: "max 5 km" }];
    expect(rankJob(base, profile, adj, now).factors.find((f) => f.key === "distance")?.points).toBe(-25);
  });

  it("scam flags come first in reasons", () => {
    const r = rankJob({ ...base, scamFlagCount: 1 }, profile, [], now);
    expect(r.reasons[0]).toMatch(/truffa/);
  });
});

describe("scam rules", () => {
  const ad = { title: "Impiegata", company: "Rossi Srl", description: "", applicationEmail: null, maxAnnualGross: null };
  it("asks for money", () => {
    expect(scamFlags({ ...ad, description: "È prevista una quota di iscrizione di 99 euro." }).map((f) => f.id)).toContain("asks-payment");
    expect(scamFlags({ ...ad, description: "Per iniziare devi acquistare il kit di partenza." }).map((f) => f.id)).toContain("asks-payment");
    expect(scamFlags({ ...ad, description: "Richiesto un piccolo investimento iniziale." }).map((f) => f.id)).toContain("asks-payment");
  });
  it("WhatsApp-only contact", () => {
    expect(scamFlags({ ...ad, description: "Contattaci solo su WhatsApp al 333 000 0000" }).map((f) => f.id)).toContain("chat-only");
  });
  it("easy money from home", () => {
    expect(scamFlags({ ...ad, description: "Lavoro da casa, guadagna subito!" }).map((f) => f.id)).toContain("easy-money");
  });
  it("unrealistic pay", () => {
    expect(scamFlags({ ...ad, description: "Guadagni fino a 5000 euro al mese" }).map((f) => f.id)).toContain("unrealistic-pay");
    expect(scamFlags({ ...ad, title: "Addetta pulizie", maxAnnualGross: 80000 }).map((f) => f.id)).toContain("unrealistic-pay");
  });
  it("free-mail address not matching the company", () => {
    expect(scamFlags({ ...ad, applicationEmail: "mario.esempio88@gmail.com" }).map((f) => f.id)).toContain("freemail-mismatch");
    expect(scamFlags({ ...ad, applicationEmail: "rossisrl.selezione.demo@gmail.com" })).toEqual([]);
    expect(scamFlags({ ...ad, applicationEmail: "hr@rossisrl.example" })).toEqual([]);
  });
  it("a normal ad has no flags", () => {
    expect(scamFlags({ ...ad, description: "Contratto a tempo indeterminato, RAL 26.000 €. Inviare CV a hr@rossisrl.example" })).toEqual([]);
  });
});
