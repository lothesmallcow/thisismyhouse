import { expect, test } from "@playwright/test";
import { assertBoomerProof, loginAsAdmin, loginAsHer } from "./helpers";

test.describe.configure({ mode: "serial" });

test("public pages: landing and subscription", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Il lavoro giusto/ })).toBeVisible();
  const cta = page.getByRole("link", { name: "Entra in Compass" }).first();
  await expect(cta).toBeVisible();
  // white text on navy really is white (regression: base CSS once overrode utilities)
  expect(await cta.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
  await page.getByRole("link", { name: "Vedi i piani" }).click();
  await expect(page.getByRole("heading", { name: "Scegli il piano giusto per te" })).toBeVisible();
  await expect(page.getByText("4,90 €")).toBeVisible();
  await expect(page.getByText("8,90 €")).toBeVisible();
  await expect(page.getByText(/pagamenti online non sono ancora attivi/)).toBeVisible();
  await page.getByRole("link", { name: /Prova Compass gratis/ }).click();
  await expect(page.getByText(/Nessun addebito/)).toBeVisible();
});

test("wrong password gives one calm sentence", async ({ page }) => {
  await page.goto("/entra");
  await page.getByLabel("La tua e-mail").fill("demo@example.com");
  await page.getByLabel("Parola d'accesso").fill("sbagliata");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByText("E-mail o parola d'accesso non corrette. Controlla e riprova.")).toBeVisible();
});

test("Offerte: ranked list with reasons, filters, Mostra altre 10, detail", async ({ page }) => {
  await loginAsHer(page);
  await assertBoomerProof(page);
  await expect(page.getByRole("heading", { name: "Molto adatte" })).toBeVisible();
  await expect(page.getByText(/È il lavoro che cerchi/).first()).toBeVisible();
  await expect(page.getByText("Ultimo aggiornamento: oggi")).toBeVisible();
  // bottom navigation: exactly 4 items with words
  const nav = page.getByRole("navigation", { name: "Menu principale" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  for (const label of ["Offerte", "Da inviare", "Le mie candidature", "Aiuto"]) await expect(nav.getByRole("link", { name: new RegExp(label) })).toBeVisible();

  const cards = page.locator("article");
  await expect(cards).toHaveCount(10);
  await page.getByRole("link", { name: "Mostra altre 10" }).click();
  await expect(cards).toHaveCount(20);

  await page.getByText("Filtra le offerte").click();
  await page.getByLabel("Orario").selectOption("part");
  await page.getByRole("button", { name: "Mostra le offerte" }).click();
  await expect(page.getByText(/1 filtro attivo/)).toBeVisible();
  const texts = await cards.allInnerTexts();
  expect(texts.every((t) => !t.includes("Tempo pieno"))).toBe(true);

  await page.goto("/offerte");
  await cards.first().getByRole("link").first().click();
  await expect(page.getByText("Perché te la propongo")).toBeVisible();
  await expect(page.getByText("L'annuncio", { exact: true })).toBeVisible();
  await assertBoomerProof(page);
});

test("Lane 1: prepare, confirm in words, undo, send (demo), reply detected", async ({ page }) => {
  await loginAsHer(page);
  // Find an e-mail job via the list
  await page.goto("/offerte");
  await page.locator("article", { hasText: "Candidatura via e-mail" }).first().getByRole("link").first().click();
  const title = (await page.locator("h1").innerText()).trim();
  await page.getByRole("button", { name: "Prepara la candidatura via e-mail" }).click();
  await expect(page).toHaveURL(/da-inviare/);
  await expect(page.getByText("La candidatura è pronta qui sotto")).toBeVisible();
  await expect(page.getByText("Anteprima dell'e-mail").first()).toBeVisible();
  await assertBoomerProof(page);

  await page.getByRole("link", { name: "Invia", exact: true }).first().click();
  await expect(page.getByText(/Sto per inviare la tua candidatura a .* Confermi\?/)).toBeVisible();
  await page.getByRole("button", { name: "Sì, invia" }).click();
  await expect(page.getByRole("heading", { name: "In partenza" })).toBeVisible();
  await expect(page.getByText(/parte tra/).first()).toBeVisible();

  // Undo
  await page.getByRole("button", { name: "Annulla l'invio" }).click();
  await expect(page.getByText("Invio annullato")).toBeVisible();
  await expect(page.getByRole("heading", { name: "In partenza" })).toHaveCount(0);

  // Send again for real (demo)
  await page.getByRole("link", { name: "Invia", exact: true }).first().click();
  await page.getByRole("button", { name: "Sì, invia" }).click();
  await expect(page.getByRole("heading", { name: "In partenza" })).toBeVisible();

  // Admin skips the waiting (demo tool) and simulates a recruiter reply
  await loginAsAdmin(page);
  await page.goto("/admin/posta");
  await page.getByRole("button", { name: "Invia la coda adesso" }).click();
  await expect(page.getByText("Coda inviata")).toBeVisible();
  await expect(page.locator("text=application").first()).toBeVisible();
  await expect(page.getByText(/Allegato: CV-/).first()).toBeVisible();
  await page.getByRole("button", { name: /^Risposta da / }).first().click();
  await expect(page.getByText("Risposta simulata ricevuta")).toBeVisible();

  await page.goto("/candidature");
  await expect(page.getByText(/Hai ricevuto una risposta da/).first()).toBeVisible();
  await expect(page.getByText(/Sembra un invito a un colloquio/).first()).toBeVisible();
  await page.getByRole("button", { name: "Sì, va bene" }).first().click();
  await expect(page.getByText("Ho aggiornato la candidatura.")).toBeVisible();
  await expect(page.getByText("Colloquio").first()).toBeVisible();
  await expect(page.getByText("Registro degli invii")).toBeVisible();
  void title;
});

test("Non mi interessa adjusts ranking visibly and undoably", async ({ page }) => {
  await loginAsHer(page);
  // an offer she has not applied to yet (the e-mail ones were used by the previous test)
  await page.locator("article").filter({ hasNotText: "Candidatura via e-mail" }).nth(1).getByRole("link").first().click();
  await page.waitForURL(/\/offerte\/\d+$/);
  const company = (await page.locator("h1 + p").innerText()).split("·")[0].trim();
  await page.getByRole("link", { name: "Non mi interessa" }).click();
  await page.getByText("Non mi piace l'azienda").click();
  await page.getByRole("button", { name: "Togli questa offerta" }).click();
  await expect(page.getByText("Ok, non te la mostro più.")).toBeVisible();

  await loginAsAdmin(page);
  await page.goto("/admin/classifica");
  await expect(page.getByText(`Evita l'azienda ${company}`)).toBeVisible();
  await page.getByRole("button", { name: "Annulla questa correzione" }).first().click();
  await expect(page.getByRole("button", { name: "Riattiva" }).first()).toBeVisible();
});

test("Lane 3 kit and Lane 2 Claude prompt", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsHer(page);
  await page.goto("/offerte");
  await page.locator("article").filter({ hasNotText: "Candidatura via e-mail" }).first().getByRole("link").first().click();
  await page.waitForURL(/\/offerte\/\d+$/);
  const url = page.url();
  await page.getByRole("link", { name: "Candidati sul sito" }).click();
  await expect(page.getByRole("heading", { name: "Kit candidatura" })).toBeVisible();
  await assertBoomerProof(page);
  await page.getByRole("button", { name: /Copia breve presentazione/ }).click();
  await expect(page.getByRole("button", { name: "Copiato!" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/Mi chiamo Lucia/);
  await expect(page.getByRole("link", { name: "Scarica il CV" })).toBeVisible();

  await page.goto(url + "/claude");
  await page.getByRole("button", { name: "Copia il testo per Claude" }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toMatch(/Non inventare nulla/);
  expect(prompt).toMatch(/IL MIO CV/);
  await page.getByLabel("Testo della lettera").fill("Gentile azienda, vi scrivo per candidarmi. Cordiali saluti, Lucia");
  await page.getByRole("button", { name: /Salva/ }).click();
  await expect(page.getByText(/kit candidatura|Ho salvato il testo/)).toBeVisible();

  await page.goto(url + "/kit");
  await page.getByRole("button", { name: "Fatto, mi sono candidata" }).click();
  await expect(page.getByText("Brava! Ho segnato la candidatura")).toBeVisible();
  await expect(page.getByText("Candidata sul sito").first()).toBeVisible();
});

test("manual add fills fields from pasted text", async ({ page }) => {
  await loginAsHer(page);
  await page.goto("/offerte/aggiungi");
  await page.getByLabel("Testo dell'annuncio").fill("Impiegata ufficio clienti\nNegozio Esempio cerca personale. RAL 24.000 € lordi.\nInviare il CV a lavoro@negozioesempio.example");
  await expect(page.getByLabel("Che lavoro è?")).toHaveValue("Impiegata ufficio clienti");
  await expect(page.getByLabel("E-mail per candidarsi (se c'è)")).toHaveValue("lavoro@negozioesempio.example");
  await page.getByLabel("Azienda").fill("Negozio Esempio");
  await page.getByLabel("Città").fill("Torino");
  await page.getByRole("button", { name: "Aggiungi l'offerta" }).click();
  await expect(page.getByText("Offerta aggiunta.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Prepara la candidatura via e-mail" })).toBeVisible();
});

test("kill switch stops and restarts sending", async ({ page }) => {
  await loginAsHer(page);
  await page.goto("/da-inviare");
  await page.getByRole("button", { name: "Ferma tutti gli invii" }).click();
  await expect(page.getByText("Gli invii sono fermi").first()).toBeVisible();
  await page.getByRole("button", { name: "Riattiva gli invii" }).click();
  await expect(page.getByText("Gli invii sono di nuovo attivi.")).toBeVisible();
});

test("admin: sources, rules, metrics, cron endpoint", async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/fonti");
  await expect(page.getByText("email:linkedin")).toBeVisible();
  await page.getByRole("button", { name: "Ricerca sul web (W1)" }).click();
  await expect(page.getByText("Ricerca sul web (W1) eseguita.")).toBeVisible();
  await page.goto("/admin/invii");
  // The browser refuses values above the hard max; a valid change is saved.
  await expect(page.getByLabel(/Invii al giorno \(max assoluto 20\)/)).toHaveAttribute("max", "20");
  await page.getByLabel(/Invii al giorno \(max assoluto 20\)/).fill("8");
  await page.getByRole("button", { name: "Salva le regole" }).click();
  await expect(page.getByText("Fatto, ho salvato.")).toBeVisible();
  await expect(page.getByLabel(/Invii al giorno \(max assoluto 20\)/)).toHaveValue("8");
  await page.goto("/admin/metriche");
  await expect(page.getByText("Offerte trovate per fonte")).toBeVisible();
  await expect(page.getByText("Tasso di risposta")).toBeVisible();

  expect((await request.get("/api/cron/queue")).status()).toBe(401);
  const ok = await request.get("/api/cron/queue", { headers: { Authorization: "Bearer e2e-cron-secret" } });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).ok).toBe(true);
});

test("CV upload, then delete all data and redo onboarding (8 steps)", async ({ page }) => {
  await loginAsHer(page);
  await page.goto("/aiuto/cv");
  // remove one demo CV so there is room for the upload
  await page.getByRole("button", { name: "Togli questo CV" }).last().click();
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  await page.setInputFiles("#file", { name: "cv-prova.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByLabel("Per che tipo di lavoro?", { exact: true }).last().fill("Segreteria");
  await page.getByRole("button", { name: "Carica il CV" }).click();
  await expect(page.getByText("CV caricato.")).toBeVisible();
  await expect(page.getByText("CV Segreteria").first()).toBeVisible();

  await page.goto("/aiuto");
  await assertBoomerProof(page);
  await page.getByRole("link", { name: "Cancella tutti i miei dati" }).click();
  await expect(page.getByText("Sto per cancellare tutti i tuoi dati. Confermi?").first()).toBeVisible();
  await page.getByRole("button", { name: "Sì, cancella tutto" }).click();
  await expect(page).toHaveURL(/benvenuto\/1/);
  await expect(page.getByText("Ho cancellato tutti i tuoi dati.")).toBeVisible();

  await expect(page.getByText("Passo 1 di 8")).toBeVisible();
  await page.getByLabel("Nome e cognome").fill("Anna Prova");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 2 di 8")).toBeVisible();
  await page.getByLabel("Il lavoro che cerchi").fill("Segretaria");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Vanno bene anche questi?" })).toBeVisible();
  await expect(page.getByText("Receptionist")).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 3 di 8")).toBeVisible();
  await page.getByLabel("La tua città").fill("Moncalieri");
  await page.getByRole("button", { name: "+ 5 km" }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 4 di 8")).toBeVisible();
  await page.getByText("Part-time", { exact: true }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 5 di 8")).toBeVisible();
  await page.getByLabel("Euro netti al mese, almeno").fill("1200");
  await expect(page.getByText(/lordo all'anno/)).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 6 di 8")).toBeVisible();
  await page.getByRole("button", { name: "Salta questo passo" }).click();
  await expect(page.getByText("Passo 7 di 8")).toBeVisible();
  await page.getByRole("button", { name: "Lo carico più tardi" }).click();
  await expect(page.getByText("Passo 8 di 8")).toBeVisible();
  await page.getByRole("button", { name: "Ho finito" }).click();
  await expect(page.getByRole("heading", { name: "Fatto, grazie Anna!" })).toBeVisible();
  await page.getByRole("link", { name: "Vedi le offerte per te" }).click();
  await expect(page).toHaveURL(/offerte/);

  await page.goto("/aiuto/profilo");
  await expect(page.getByText("Moncalieri, fino a 25 km")).toBeVisible();
  await expect(page.getByText(/1\.?200 € netti al mese/)).toBeVisible();
});
