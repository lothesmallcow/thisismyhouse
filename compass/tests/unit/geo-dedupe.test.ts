import { describe, expect, it } from "vitest";
import { distanceKm, findPlace, searchPlaces } from "@/lib/core/geo";
import { canonicalUrl, dedupeKey, findDuplicate, normalizeCompany, normalizeTitle } from "@/lib/core/dedupe";

describe("findPlace", () => {
  it.each([
    ["Torino (TO)", "Torino", "TO"],
    ["Moncalieri, Piemonte, Italia", "Moncalieri", "TO"],
    ["10099 San Mauro Torinese TO", "San Mauro Torinese", "TO"],
    ["Milan, Lombardy, Italy", "Milano", "MI"],
    ["Calliano (TN)", "Calliano", "TN"],
    ["Calliano (AT)", "Calliano", "AT"],
    ["Reggio nell'Emilia", "Reggio nell'Emilia", "RE"],
  ])("%s -> %s", (loc, name, prov) => {
    const p = findPlace(loc);
    expect(p?.name).toBe(name);
    expect(p?.province).toBe(prov);
  });
  it("returns null for unknown places", () => {
    expect(findPlace("Da remoto")).toBeNull();
    expect(findPlace("")).toBeNull();
  });
  it("suggests places by prefix", () => {
    expect(searchPlaces("Monca")[0].name).toBe("Moncalieri");
  });
});

describe("distanceKm", () => {
  it("Torino -> Moncalieri is about 7-8 km", () => {
    const d = distanceKm(findPlace("Torino")!, findPlace("Moncalieri")!);
    expect(d).toBeGreaterThan(6);
    expect(d).toBeLessThan(9);
  });
  it("Torino -> Milano is about 125 km", () => {
    const d = distanceKm(findPlace("Torino")!, findPlace("Milano")!);
    expect(d).toBeGreaterThan(115);
    expect(d).toBeLessThan(135);
  });
});

describe("normalization", () => {
  it("strips company suffixes", () => {
    expect(normalizeCompany("Rossi S.r.l.")).toBe("rossi");
    expect(normalizeCompany("ROSSI SRL")).toBe("rossi");
    expect(normalizeCompany("Bianchi & Figli S.p.A.")).toBe("bianchi figli");
  });
  it("unifies gendered titles and noise", () => {
    expect(normalizeTitle("Impiegato/a amministrativo/a (m/f)")).toBe(normalizeTitle("Impiegata amministrativa"));
  });
  it("same key for the same job from two sources", () => {
    expect(dedupeKey({ company: "Rossi S.r.l.", title: "Impiegata Amministrativa", city: "Torino" })).toBe(
      dedupeKey({ company: "ROSSI SRL", title: "impiegato amministrativo (m/f)", city: "torino" }),
    );
  });
});

describe("canonicalUrl", () => {
  it("normalizes LinkedIn job URLs", () => {
    expect(canonicalUrl("https://it.linkedin.com/jobs/view/impiegata-amministrativa-at-rossi-3912345678?refId=abc&trackingId=xyz")).toBe(
      "https://www.linkedin.com/jobs/view/3912345678",
    );
    expect(canonicalUrl("https://www.linkedin.com/comm/jobs/view/3912345678/?alertAction=view")).toBe(
      "https://www.linkedin.com/jobs/view/3912345678",
    );
  });
  it("normalizes Indeed URLs", () => {
    expect(canonicalUrl("https://it.indeed.com/rc/clk?jk=abc123&from=ja&tk=zz")).toBe("https://it.indeed.com/viewjob?jk=abc123");
  });
  it("drops tracking params elsewhere", () => {
    expect(canonicalUrl("https://www.rossi.it/lavora-con-noi/?utm_source=x&id=7#top")).toBe("https://rossi.it/lavora-con-noi?id=7");
  });
});

describe("findDuplicate", () => {
  const existing = [
    { id: 1, company: "Rossi Srl", title: "Impiegata amministrativa", city: "Torino", urls: ["https://www.linkedin.com/jobs/view/111111111"] },
    { id: 2, company: null, title: "Segretaria", city: "Torino", urls: ["https://example.org/annuncio/9"] },
  ];
  it("matches by canonical URL", () => {
    expect(findDuplicate({ title: "x", url: "https://it.linkedin.com/jobs/view/foo-111111111?trk=1" }, existing)).toBe(1);
  });
  it("matches by company + title + city", () => {
    expect(findDuplicate({ company: "ROSSI S.R.L.", title: "Impiegato amministrativo", city: "Torino", url: null }, existing)).toBe(1);
  });
  it("fuzzy title match within the same company", () => {
    expect(findDuplicate({ company: "Rossi", title: "Impiegata amministrativa contabile", city: "Torino", url: null }, existing)).toBe(1);
  });
  it("different city is a different job", () => {
    expect(findDuplicate({ company: "Rossi", title: "Impiegata amministrativa contabile", city: "Milano", url: null }, existing)).toBeNull();
  });
  it("thin records without company only match by URL", () => {
    expect(findDuplicate({ company: null, title: "Segretaria", city: "Torino", url: "https://other.org/x" }, existing)).toBeNull();
  });
});
