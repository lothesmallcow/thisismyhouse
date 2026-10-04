import { expect, type Page } from "@playwright/test";

export async function loginAsHer(page: Page) {
  await page.goto("/entra");
  await page.getByLabel("La tua e-mail").fill("demo@example.com");
  await page.getByLabel("Parola d'accesso").fill("demo-compass");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page).toHaveURL(/\/offerte/);
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/entra");
  await page.getByLabel("E-mail").fill("admin@example.com");
  await page.getByLabel("Password").fill("admin-compass");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Boomer-proof checks that must hold on every screen. */
export async function assertBoomerProof(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const body = parseFloat(getComputedStyle(document.body).fontSize);
    if (body < 18) out.push(`body font ${body}px`);
    for (const el of Array.from(document.querySelectorAll("main button, main a[class*='rounded-2xl'], nav a"))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // hidden (e.g. closed <details>)
      if (r.height < 48) out.push(`target too small (${Math.round(r.height)}px): ${(el.textContent || "").trim().slice(0, 40)}`);
      if (!(el.textContent || "").trim() && !el.getAttribute("aria-label")) out.push("button without a text label");
    }
    for (const p of Array.from(document.querySelectorAll("main p, main li"))) {
      const fs = parseFloat(getComputedStyle(p).fontSize);
      if (fs < 15) out.push(`small text ${fs}px: ${(p.textContent || "").trim().slice(0, 30)}`);
    }
    return out;
  });
  expect(problems, problems.join("\n")).toEqual([]);
  // "Cosa faccio qui?" on every screen of her app
  await expect(page.getByText("Cosa faccio qui?").first()).toBeVisible();
}
