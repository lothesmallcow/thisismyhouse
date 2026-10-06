// "I tuoi avvisi": every site of Compass has a guide, and the search links carry the words and place.
import { describe, expect, it } from "vitest";
import { PLATFORMS } from "@/lib/core/platforms";
import { SITE_GUIDES } from "@/lib/core/site-guides";

describe("alert guides per site", () => {
  it("one guide per site, with steps and where to check", () => {
    for (const p of PLATFORMS) {
      expect(SITE_GUIDES[p.key], p.key).toBeTruthy();
      expect(SITE_GUIDES[p.key].steps.length).toBeGreaterThanOrEqual(3);
      expect(SITE_GUIDES[p.key].check.length).toBeGreaterThan(10);
    }
  });
  it("search links with the person's words and place", () => {
    expect(SITE_GUIDES.linkedin.searchUrl("Analista M&A", "Milano", "IT")).toBe("https://www.linkedin.com/jobs/search/?keywords=Analista+M%26A&location=Milano&f_TPR=r604800&sortBy=DD");
    expect(SITE_GUIDES.indeed.searchUrl("Analyst", "London", "GB")).toMatch(/^https:\/\/uk\.indeed\.com\/jobs\?q=Analyst&l=London/);
    expect(SITE_GUIDES.reed.searchUrl("M&A Analyst", "Londra Centro", "GB")).toBe("https://www.reed.co.uk/jobs/m-a-analyst-jobs-in-londra-centro");
    expect(SITE_GUIDES.stepstone.searchUrl("Controller", "München", "DE")).toBe("https://www.stepstone.de/jobs/controller/in-munchen");
  });
});
