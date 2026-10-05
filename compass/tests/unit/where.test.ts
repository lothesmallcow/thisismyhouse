// "Dove" as places (a city, a region or a whole country), to and from the profile.
import { describe, expect, it } from "vitest";
import { searchPlaces } from "@/lib/core/geo";
import { parsePlaceValue, placesFromProfile, profileFromPlaces, suggestPlaces } from "@/lib/core/where";

describe("where", () => {
  it("places become profile fields: the first city is home, regions and countries kept", () => {
    const f = profileFromPlaces([
      { kind: "città", country: "IT", name: "Milano" },
      { kind: "regione", country: "IT", name: "Lombardia" },
      { kind: "città", country: "GB", name: "London" },
      { kind: "paese", country: "FR", name: "Francia" },
    ]);
    expect(f).toMatchObject({ city: "Milano", extraPlaces: ["London"], regions: ["IT:Lombardia"], countries: ["IT", "GB", "FR"] });
    expect(f.lat).toBeCloseTo(45.46, 1);
    expect(profileFromPlaces([{ kind: "regione", country: "IT", name: "Lombardia" }])).toMatchObject({ city: "", lat: null, countries: ["IT"] });
  });
  it("and back: a country on its own only when nothing narrower is chosen in it", () => {
    const back = placesFromProfile({ city: "Milano", extraPlaces: ["London"], regions: ["IT:Lombardia"], countries: ["IT", "GB", "FR"] });
    expect(back.map((x) => `${x.kind}:${x.name}`)).toEqual(["città:Milano", "città:London", "regione:Lombardia", "paese:Francia"]);
  });
  it("suggestions: countries, regions, then cities; tampered values refused", () => {
    expect(suggestPlaces("lomb", []).map((x) => x.name)).toEqual(["Lombardia"]);
    expect(suggestPlaces("regno", [])[0]).toEqual({ kind: "paese", country: "GB", name: "Regno Unito" });
    expect(suggestPlaces("milan", searchPlaces("milan", 8, ["IT"])).some((x) => x.kind === "città" && x.name === "Milano")).toBe(true);
    expect(parsePlaceValue("regione|IT|Narnia")).toBeNull();
    expect(parsePlaceValue("città|XX|Milano")).toBeNull();
    expect(parsePlaceValue("città|IT|Milano")).toEqual({ kind: "città", country: "IT", name: "Milano" });
  });
});
