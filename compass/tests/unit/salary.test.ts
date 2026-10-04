import { describe, expect, it } from "vitest";
import { parseItalianNumber, parseSalary, findSalaryText, formatSalary, grossAnnualToNetMonthly, netAnnualToGrossAnnual } from "@/lib/core/salary";

describe("parseItalianNumber", () => {
  it.each([
    ["28.000", 28000],
    ["28000", 28000],
    ["1.600,50", 1600.5],
    ["28k", 28000],
    ["28,5k", 28500],
    ["30 mila", 30000],
    ["14", 14],
    ["12,50", 12.5],
  ])("%s -> %d", (s, n) => expect(parseItalianNumber(s)).toBe(n));

  it("rejects non numbers", () => expect(parseItalianNumber("abc")).toBeNull());
});

describe("parseSalary", () => {
  it("RAL 28-32k is annual gross, not an estimate", () => {
    const s = parseSalary("RAL 28-32k");
    expect(s).toMatchObject({ minAnnualGross: 28000, maxAnnualGross: 32000, basis: "annual_gross", isEstimate: false });
  });

  it("28.000 - 32.000 € annui: annual, gross presumed and flagged", () => {
    const s = parseSalary("28.000 - 32.000 € annui");
    expect(s.minAnnualGross).toBe(28000);
    expect(s.maxAnnualGross).toBe(32000);
    expect(s.isEstimate).toBe(true);
    expect(s.note).toMatch(/lordo/);
  });

  it("28.000 - 32.000 € lordi annui is exact", () => {
    expect(parseSalary("28.000 - 32.000 € lordi annui")).toMatchObject({ basis: "annual_gross", isEstimate: false });
  });

  it("1.600 € netti/mese -> annual gross estimate, never mixed with net", () => {
    const s = parseSalary("1.600 € netti/mese");
    expect(s.basis).toBe("monthly_net");
    expect(s.isEstimate).toBe(true);
    // 1600 x 13 = 20.800 net -> about 27-28k gross
    expect(s.minAnnualGross).toBeGreaterThan(26000);
    expect(s.minAnnualGross).toBeLessThan(30000);
  });

  it("14 €/h -> hourly, full-time estimate", () => {
    const s = parseSalary("14 €/h");
    expect(s).toMatchObject({ basis: "hourly", isEstimate: true, minAnnualGross: 29100 });
  });

  it("paga oraria 9,50 euro lordi", () => {
    expect(parseSalary("paga oraria 9,50 euro lordi").basis).toBe("hourly");
  });

  it("CCNL Commercio 4° livello -> table estimate", () => {
    const s = parseSalary("CCNL Commercio 4° livello");
    expect(s).toMatchObject({ basis: "ccnl", isEstimate: true, minAnnualGross: 25500 });
  });

  it("CCNL with unknown sector keeps basis but no number", () => {
    const s = parseSalary("CCNL Chimico 3 livello");
    expect(s.basis).toBe("ccnl");
    expect(s.minAnnualGross).toBeNull();
  });

  it("da 1.300 a 1.500 euro netti al mese", () => {
    const s = parseSalary("da 1.300 a 1.500 euro netti al mese");
    expect(s.basis).toBe("monthly_net");
    expect(s.maxAnnualGross!).toBeGreaterThan(s.minAnnualGross!);
  });

  it("1.800 € lordi mensili", () => {
    expect(parseSalary("1.800 € lordi mensili")).toMatchObject({ basis: "monthly_gross", minAnnualGross: 23400 });
  });

  it("vague text is unknown (neutral)", () => {
    expect(parseSalary("Retribuzione commisurata all'esperienza").basis).toBe("unknown");
    expect(parseSalary("").basis).toBe("unknown");
    expect(parseSalary(null).minAnnualGross).toBeNull();
  });

  it("keeps the original string", () => {
    expect(parseSalary("RAL 28-32k").raw).toBe("RAL 28-32k");
  });
});

describe("helpers", () => {
  it("finds a salary line inside an ad", () => {
    expect(findSalaryText("Cerchiamo impiegata.\nRAL 26.000 € lordi.\nInviare CV.")).toBe("RAL 26.000 € lordi.");
  });
  it("formats in Italian", () => {
    expect(formatSalary(parseSalary("RAL 28-32k"))).toBe("28.000–32.000 € lordi l'anno");
    expect(formatSalary(parseSalary("boh"))).toBe("Stipendio non indicato");
  });
  it("net/gross conversions roughly invert", () => {
    const gross = netAnnualToGrossAnnual(1400 * 13);
    expect(Math.abs(grossAnnualToNetMonthly(gross) - 1400)).toBeLessThan(60);
  });
});
