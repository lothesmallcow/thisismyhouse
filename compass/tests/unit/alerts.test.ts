import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRawEmail } from "@/lib/sources/mail/parse";
import { isJobAlert, parseAlert } from "@/lib/sources/alerts";

const fixture = (name: string) => parseRawEmail(fs.readFileSync(path.join("fixtures/emails", name)));

describe("LinkedIn alerts (synthetic, needs real sample)", () => {
  it("parses the HTML version: title, company, location, salary, canonical URL", async () => {
    const r = parseAlert(await fixture("linkedin-alert-1.eml"));
    expect(r.parser).toBe("email:linkedin");
    expect(r.templateBroken).toBe(false);
    expect(r.jobs).toHaveLength(4);
    expect(r.jobs[0]).toMatchObject({
      title: "Impiegata amministrativa",
      company: "Studio Rinaldi Commercialisti",
      location: "Torino, Piemonte, Italia",
      url: "https://www.linkedin.com/jobs/view/4012345601",
    });
    expect(r.jobs[1]).toMatchObject({ company: "Bianchi Logistica Srl", salaryText: "1.300 €/mese - 1.500 €/mese netti" });
    expect(r.jobs[2].location).toMatch(/Rivoli/);
    // "Vedi tutte" and "Annulla iscrizione" are not jobs
    expect(r.jobs.map((j) => j.title)).not.toContain("Vedi tutte le offerte");
  });

  it("parses the text-only version", async () => {
    const r = parseAlert(await fixture("linkedin-alert-2-text-only.eml"));
    expect(r.parser).toBe("email:linkedin");
    expect(r.jobs.map((j) => [j.title, j.company])).toEqual([
      ["Segretaria di studio medico", "Poliambulatorio San Carlo"],
      ["Receptionist part-time", "Hotel Belvedere Torino"],
    ]);
  });
});

describe("Indeed alerts (synthetic, needs real sample)", () => {
  it("parses cards including salary and snippet", async () => {
    const r = parseAlert(await fixture("indeed-alert-1.eml"));
    expect(r.parser).toBe("email:indeed");
    expect(r.jobs).toHaveLength(3);
    expect(r.jobs[0]).toMatchObject({
      title: "Impiegato/a amministrativo/a",
      company: "Studio Rinaldi Commercialisti",
      location: "Torino, Piemonte",
      salaryText: "€ 1.400 - € 1.600 al mese",
      url: "https://it.indeed.com/viewjob?jk=a1b2c3d4e5f60001",
    });
    expect(r.jobs[0].description).toMatch(/prima nota/);
    expect(r.jobs[1].location).toBe("Nichelino, Piemonte");
  });
});

describe("InfoJobs alerts (synthetic, needs real sample)", () => {
  it("parses title, company, city, contract and RAL", async () => {
    const r = parseAlert(await fixture("infojobs-alert-1.eml"));
    expect(r.parser).toBe("email:infojobs");
    expect(r.jobs).toHaveLength(2);
    expect(r.jobs[0]).toMatchObject({ title: "Impiegata contabile", company: "Gruppo Fontana Srl", location: "Torino", salaryText: "RAL 24.000 - 26.000 €" });
    expect(r.jobs[0].description).toMatch(/tempo determinato/);
  });
});

describe("generic fallback", () => {
  it("extracts job links and anchor text, skipping privacy/unsubscribe", async () => {
    const e = await fixture("generic-agency-alert-1.eml");
    expect(isJobAlert(e)).toBe(true);
    const r = parseAlert(e);
    expect(r.parser).toBe("email:generic");
    expect(r.jobs.map((j) => j.title)).toEqual(["Impiegata ufficio acquisti", "Centralinista", "Addetta paghe e contributi"]);
    expect(r.jobs[0].url).toBe("https://lavorosereno.example/offerte/1201");
    expect(r.jobs[0].location).toBe("Grugliasco (TO)");
    expect(r.jobs.every((j) => j.thin)).toBe(true);
  });

  it("a known template that yields nothing is reported as broken and falls back", async () => {
    const e = await fixture("linkedin-alert-1.eml");
    const broken = { ...e, html: e.html!.replace(/jobs\/view\/\d+/g, "jobs/vw/x"), text: "" };
    broken.from = { address: "jobalerts-noreply@linkedin.com", name: "LinkedIn" };
    const r = parseAlert(broken);
    expect(r.templateBroken).toBe(true);
    expect(r.failures).toBeGreaterThan(0);
  });
});

describe("non-alerts", () => {
  it("a recruiter reply is not an alert", async () => {
    expect(isJobAlert(await fixture("reply-1.eml"))).toBe(false);
  });
});
