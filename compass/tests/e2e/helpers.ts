import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string, password = "demo-compass") {
  await page.goto("/entra");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page).toHaveURL(/\/offerte|\/benvenuto/);
}

export const loginAsHer = (page: Page) => login(page, "demo@example.com");
export const loginAsStudent = (page: Page) => login(page, "studente@example.com");
export const loginAsFashion = (page: Page) => login(page, "moda@example.com");

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/entra");
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Password").fill("admin-compass");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Basics that must hold on every screen: readable text, real touch targets, labelled controls, no sideways scroll. */
export async function assertUiBasics(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const body = parseFloat(getComputedStyle(document.body).fontSize);
    if (body < 14) out.push(`body font ${body}px`);
    for (const el of Array.from(document.querySelectorAll("main button, main a, nav a, main input:not([type=hidden]):not(.sr-only), main select"))) {
      // A checkbox or radio inside a label: the whole label is what you tap.
      const target = (el as HTMLInputElement).type === "checkbox" || (el as HTMLInputElement).type === "radio" ? (el.closest("label") ?? el) : el;
      const r = (target as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // hidden (e.g. closed <details>)
      const isInline = el.tagName === "A" && getComputedStyle(el).display === "inline";
      if (!isInline && r.height < 24) out.push(`target too small (${Math.round(r.height)}px): ${(el.textContent || el.getAttribute("name") || "").trim().slice(0, 40)}`);
      if ((el.tagName === "BUTTON" || el.tagName === "A") && !(el.textContent || "").trim() && !el.getAttribute("aria-label")) out.push("control without a text label");
    }
    for (const p of Array.from(document.querySelectorAll("main p, main li"))) {
      const fs = parseFloat(getComputedStyle(p).fontSize);
      if (fs < 11) out.push(`tiny text ${fs}px: ${(p.textContent || "").trim().slice(0, 30)}`);
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`horizontal scroll: ${document.documentElement.scrollWidth} > ${window.innerWidth}`);
    return out;
  });
  expect(problems, problems.join("\n")).toEqual([]);
}

/** "Dove": type a place and pick the suggestion (a city, a region or a whole country). */
export async function addPlace(page: Page, query: string, option: RegExp) {
  await page.getByLabel("Aggiungi un luogo").fill(query);
  await page.getByRole("option", { name: option }).first().click();
}
