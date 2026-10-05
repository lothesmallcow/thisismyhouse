import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsHer, loginAsStudent } from "./helpers";

test.describe.configure({ mode: "serial" });

const ADMIN_PAGES = ["/admin", "/admin/invii", "/admin/fonti", "/admin/catalogo", "/admin/aziende", "/admin/siti", "/admin/spontanee", "/admin/blocchi", "/admin/classifica", "/admin/registro", "/admin/metriche", "/admin/posta", "/admin/utenti"];
const HER_PAGES = ["/offerte", "/offerte/cartelle", "/ruoli", "/ruoli/store-manager-lusso", "/profilo/punteggio", "/profilo/codice", "/profilo/posizioni", "/profilo/carriere", "/collega", "/percorsi/scrivi?azienda=1", "/da-inviare", "/candidature", "/aziende", "/percorsi", "/profilo", "/profilo/cv", "/profilo/esperienze", "/profilo/ricerca", "/offerte/aggiungi"];

test("logged out: every private page and API is closed", async ({ page, request }) => {
  for (const p of [...ADMIN_PAGES]) {
    await page.goto(p);
    await expect(page, p).toHaveURL(/\/admin\/entra/);
  }
  for (const p of HER_PAGES) {
    await page.goto(p);
    await expect(page, p).toHaveURL(/\/entra/);
  }
  for (const api of ["/api/cv/1", "/api/export/jobs", "/api/export/applications", "/api/export/sendlog"]) {
    expect((await request.get(api)).status(), api).toBe(401);
  }
  for (const job of ["ingest", "queue", "digest"]) {
    expect((await request.get(`/api/cron/${job}`)).status()).toBe(401);
    expect((await request.get(`/api/cron/${job}`, { headers: { Authorization: "Bearer wrong-secret-of-same-len" } })).status()).toBe(401);
  }
});

test("logged in as her: admin pages and admin APIs stay closed", async ({ page }) => {
  await loginAsHer(page);
  for (const p of ADMIN_PAGES) {
    await page.goto(p);
    await expect(page, p).toHaveURL(/\/admin\/entra/);
  }
  const r = await page.request.get("/api/export/jobs");
  expect(r.status()).toBe(401);
});

test("one person cannot reach another person's CV or job", async ({ page }) => {
  await loginAsStudent(page);
  await page.goto("/profilo/cv");
  const href = await page.getByRole("link", { name: "Scarica" }).first().getAttribute("href");
  expect((await page.request.get(href!)).status()).toBe(200);
  await page.context().clearCookies();
  await loginAsHer(page);
  expect((await page.request.get(href!)).status()).toBe(404); // his CV, her session
  await page.goto("/profilo/cv");
  await expect(page.getByText("CV Finanza")).toHaveCount(0);
  // (jobs private to one person answer 404 to the other: see "manual add ... stays private")
});

test("XSS: hostile text from an ad is shown as text, never run", async ({ page }) => {
  let dialogs = 0;
  page.on("dialog", async (d) => {
    dialogs++;
    await d.dismiss();
  });
  await loginAsHer(page);
  await page.goto("/offerte/aggiungi");
  const evil = `<img src=x onerror="alert('xss')"><script>alert('xss')</script>`;
  await page.getByLabel("Testo dell'annuncio").fill(`Impiegata\n${evil}`);
  await page.getByLabel("Ruolo").fill(`Impiegata ${evil}`);
  await page.getByLabel("Azienda").fill(`<b onmouseover=alert(1)>ACME</b>`);
  await page.getByRole("button", { name: "Aggiungi l'offerta" }).click();
  await expect(page.getByText("Offerta aggiunta.")).toBeVisible();
  await expect(page.locator("h1")).toContainText("<script>alert('xss')</script>");
  await page.goto("/offerte");
  await page.waitForTimeout(500);
  expect(dialogs).toBe(0);
  expect(await page.locator("script:has-text(\"alert('xss')\")").count()).toBe(0);
  expect(await page.locator("img[src=x]").count()).toBe(0);
});

test("accessibility: axe finds no WCAG 2.1 A/AA problems on key screens, light and dark", async ({ page }) => {
  // Fade-ins would be measured as low contrast mid-animation: scan the settled page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginAsStudent(page);
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: scheme });
    for (const p of ["/offerte", "/aziende", "/percorsi", "/profilo/esperienze", "/da-inviare", "/candidature", "/profilo", "/profilo/ricerca", "/benvenuto/3?ritorno=profilo", "/benvenuto/10?ritorno=profilo"]) {
      await page.goto(p);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(r.violations.map((v) => `${scheme} ${p}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`)).toEqual([]);
    }
  }
  await loginAsAdmin(page);
  await page.goto("/admin/fonti");
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
});

test("sign-in is throttled after 5 wrong passwords", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await page.goto("/entra");
    await page.getByLabel("E-mail").fill("nessuno@example.com");
    await page.getByLabel("Password").fill("sbagliata");
    await page.getByRole("button", { name: "Entra" }).click();
  }
  await expect(page.getByText("Troppi tentativi: riprova tra 15 minuti.")).toBeVisible();
});
