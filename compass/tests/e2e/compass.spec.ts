import { expect, test } from "@playwright/test";
import { assertUiBasics, login, loginAsAdmin, loginAsHer, loginAsStudent } from "./helpers";

test.describe.configure({ mode: "serial" });

test("public pages: landing, prices, sign-up needs an invitation by default", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Le offerte giuste, dalle aziende che scegli/ })).toBeVisible();
  await assertUiBasics(page);
  await page.getByRole("link", { name: "Prezzi" }).first().click();
  await expect(page.getByRole("heading", { name: "Semplici, senza sorprese" })).toBeVisible();
  await expect(page.getByText("4,90 €")).toBeVisible();
  await expect(page.getByText(/Pagamenti non ancora attivi/)).toBeVisible();
  await page.getByRole("link", { name: /Prova Compass/ }).click();
  await expect(page.getByText(/nessun addebito/)).toBeVisible();
  await page.getByRole("link", { name: "Crea un account" }).last().click();
  await expect(page.getByLabel("Codice di invito")).toBeVisible();
});

test("wrong password gives one clear sentence", async ({ page }) => {
  await page.goto("/entra");
  await page.getByLabel("E-mail").fill("demo@example.com");
  await page.getByLabel("Password").fill("sbagliata");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByText("E-mail o password non corrette.")).toBeVisible();
});

test("Offerte (job search): ranked list with reasons, focus switch, search, filters, detail", async ({ page }) => {
  await loginAsHer(page);
  await assertUiBasics(page);
  await expect(page.getByRole("heading", { name: "Offerte per te" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Molto adatte" })).toBeVisible();
  await expect(page.getByText(/È il lavoro che cerchi/).first()).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Menu principale" }).last();
  for (const label of ["Offerte", "Da inviare", "Candidature", "Aziende", "Profilo"]) await expect(nav.getByRole("link", { name: new RegExp(label) })).toBeVisible();

  const cards = page.locator("article");
  await expect(cards).toHaveCount(10);
  await page.getByRole("link", { name: "Mostra altre 10" }).click();
  await expect(cards).toHaveCount(20);

  // search
  await page.getByLabel("Cerca per ruolo o azienda").fill("segret");
  await page.getByLabel("Cerca per ruolo o azienda").press("Enter");
  await expect(cards.first()).toContainText(/Segret/i);
  expect((await cards.allInnerTexts()).every((t) => /segret/i.test(t))).toBe(true);

  // filters: minimum monthly pay
  await page.goto("/offerte");
  await page.getByText("Filtri").click();
  await page.getByLabel("Stipendio minimo al mese (netto)").fill("1700");
  await page.getByRole("button", { name: "Applica" }).click();
  await expect(page.getByText(/1 attivo/)).toBeVisible();

  await page.goto("/offerte");
  await cards.first().getByRole("link").first().click();
  await expect(page.getByText(/Perché è (molto )?adatta/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Annuncio" })).toBeVisible();
  await assertUiBasics(page);
});

test("Lane 1: prepare, confirm, undo, send (demo), reply detected", async ({ page }) => {
  await loginAsHer(page);
  await page.goto("/offerte");
  await page.locator("article", { hasText: "Candidatura via e-mail" }).first().getByRole("link").first().click();
  await page.getByRole("button", { name: "Prepara candidatura via e-mail" }).click();
  await expect(page).toHaveURL(/da-inviare/);
  await expect(page.getByText("Candidatura pronta: controllala e premi Invia.")).toBeVisible();
  await assertUiBasics(page);

  await page.getByRole("link", { name: "Invia", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: /Inviare la candidatura a/ })).toBeVisible();
  await page.getByRole("button", { name: "Sì, invia" }).click();
  await expect(page.getByRole("heading", { name: "In partenza" })).toBeVisible();
  await expect(page.getByText(/parte tra/).first()).toBeVisible();

  await page.getByRole("button", { name: "Annulla l'invio" }).click();
  await expect(page.getByText("Invio annullato")).toBeVisible();
  await expect(page.getByRole("heading", { name: "In partenza" })).toHaveCount(0);

  await page.getByRole("link", { name: "Invia", exact: true }).first().click();
  await page.getByRole("button", { name: "Sì, invia" }).click();
  await expect(page.getByRole("heading", { name: "In partenza" })).toBeVisible();

  await loginAsAdmin(page);
  await page.goto("/admin/posta");
  await page.getByRole("button", { name: "Invia la coda adesso" }).click();
  await expect(page.getByText("Coda inviata")).toBeVisible();
  await expect(page.getByText(/Allegato: CV-/).first()).toBeVisible();
  await page.getByRole("button", { name: /^Risposta da / }).first().click();
  await expect(page.getByText("Risposta simulata ricevuta")).toBeVisible();

  await page.goto("/candidature");
  await expect(page.getByText(/Risposta da/).first()).toBeVisible();
  await expect(page.getByText(/Sembra un invito a un colloquio/).first()).toBeVisible();
  await page.getByRole("button", { name: "Segna come colloquio" }).first().click();
  await expect(page.getByText("Candidatura aggiornata.")).toBeVisible();
  await expect(page.getByText("Colloquio").first()).toBeVisible();
  await expect(page.getByText("Registro invii")).toBeVisible();
});

test("Non mi interessa adds a correction she can undo from her profile", async ({ page }) => {
  await loginAsHer(page);
  await page.locator("article").filter({ hasNotText: "Candidatura via e-mail" }).nth(1).getByRole("link").first().click();
  await page.waitForURL(/\/offerte\/\d+$/);
  const company = (await page.locator("h1 + p").innerText()).split("·")[0].trim();
  await page.getByRole("link", { name: "Non mi interessa" }).click();
  await page.getByText("Non mi interessa l'azienda").click();
  await page.getByRole("button", { name: "Nascondi" }).click();
  await expect(page.getByText("Offerta nascosta.")).toBeVisible();
  await page.goto("/profilo/ricerca");
  await expect(page.getByText(`Evita l'azienda ${company}`)).toBeVisible();
  await page.getByRole("button", { name: "Annulla" }).first().click();
  await expect(page.getByRole("button", { name: "Ripristina" }).first()).toBeVisible();
});

test("Lane 3 kit and Lane 2 Claude prompt", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsHer(page);
  await page.goto("/offerte");
  await page.locator("article").filter({ hasNotText: "Candidatura via e-mail" }).first().getByRole("link").first().click();
  await page.waitForURL(/\/offerte\/\d+$/);
  const url = page.url();
  await page.getByRole("link", { name: "Candidati sul sito" }).click();
  await expect(page.getByText("Kit candidatura").first()).toBeVisible();
  await assertUiBasics(page);
  await page.locator("div", { hasText: /^Breve presentazione/ }).getByRole("button", { name: "Copia" }).first().click();
  await expect(page.getByRole("button", { name: "Copiato" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/Mi chiamo Lucia/);

  await page.goto(url + "/claude");
  await page.getByRole("button", { name: "Copia il testo" }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toMatch(/Non inventare nulla/);
  expect(prompt).toMatch(/IL MIO CV/);
  await page.getByLabel("Testo della lettera").fill("Gentile azienda, vi scrivo per candidarmi. Cordiali saluti, Lucia");
  await page.getByRole("button", { name: /Salva/ }).click();
  await expect(page.getByText(/kit candidatura|Testo salvato/)).toBeVisible();

  await page.goto(url + "/kit");
  await page.getByRole("button", { name: "Ho inviato la candidatura" }).click();
  await expect(page.getByText("Candidatura segnata come inviata.")).toBeVisible();
  await expect(page.getByText("Inviata sul sito").first()).toBeVisible();
});

test("manual add fills fields from pasted text and stays private", async ({ page }) => {
  await loginAsHer(page);
  await page.goto("/offerte/aggiungi");
  await page.getByLabel("Testo dell'annuncio").fill("Impiegata ufficio clienti\nNegozio Esempio cerca personale. RAL 24.000 € lordi.\nInviare il CV a lavoro@negozioesempio.example");
  await expect(page.getByLabel("Ruolo")).toHaveValue("Impiegata ufficio clienti");
  await expect(page.getByLabel("E-mail per candidarsi")).toHaveValue("lavoro@negozioesempio.example");
  await page.getByLabel("Azienda").fill("Negozio Esempio");
  await page.getByLabel("Città").fill("Torino");
  await page.getByRole("button", { name: "Aggiungi l'offerta" }).click();
  await expect(page.getByText("Offerta aggiunta.")).toBeVisible();
  const url = page.url().split("?")[0];
  await expect(page.getByRole("button", { name: "Prepara candidatura via e-mail" })).toBeVisible();

  // Marco cannot open it
  await page.context().clearCookies();
  await loginAsStudent(page);
  const r = await page.goto(url);
  expect(r!.status()).toBe(404);
});

test("kill switch stops and restarts sending", async ({ page }) => {
  await loginAsHer(page);
  await page.goto("/da-inviare");
  await page.getByRole("button", { name: "Ferma tutti gli invii" }).click();
  await expect(page.getByText("Hai fermato gli invii").first()).toBeVisible();
  await page.getByRole("button", { name: "Riattiva gli invii" }).click();
  await expect(page.getByText("Invii di nuovo attivi.")).toBeVisible();
});

test("student: internships first, catalog choices, Altro, suggestions, only chosen companies", async ({ page }) => {
  await loginAsStudent(page);
  await expect(page.getByRole("heading", { name: "Stage per te" })).toBeVisible();
  const first = page.locator("article").first();
  await expect(first).toContainText(/Stage|Intern/);
  await expect(page.getByText(/tra le aziende che hai scelto/).first()).toBeVisible();

  await page.getByRole("link", { name: "Solo aziende scelte" }).click();
  const companies = await page.locator("article").allInnerTexts();
  expect(companies.length).toBeGreaterThan(0);
  expect(companies.every((t) => /Esempio Advisory Partners|Lazard|Houlihan|Vitale|Satispay|P101/.test(t))).toBe(true);

  await page.goto("/aziende");
  await assertUiBasics(page);
  await expect(page.getByRole("heading", { name: /Le tue aziende/ })).toBeVisible();
  await expect(page.getByText("Suggerite per te")).toBeVisible();
  // a suggestion, one tap
  const firstSuggestion = page.locator("aside li").first();
  const name = (await firstSuggestion.locator("p").first().innerText()).trim();
  await firstSuggestion.getByRole("button", { name: "Mi interessa" }).click();
  await expect(page.getByText("Preferenze salvate.")).toBeVisible();
  await expect(page.locator("section").first()).toContainText(name);
  // Altro: a boutique that is not in the catalog
  await page.getByLabel("Altro: un'azienda che non c'è").fill("Boutique Prova Advisory");
  await page.getByRole("button", { name: "Salva aziende" }).click();
  await expect(page.getByText("Aggiunto al tuo elenco.")).toBeVisible();
  await expect(page.locator("section").first()).toContainText("Boutique Prova Advisory");
  // focus switch saved as default
  await page.getByRole("radio", { name: /^Solo le mie scelte/ }).check();
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await page.goto("/offerte");
  await expect(page.getByRole("link", { name: "Le mie scelte" })).toHaveAttribute("aria-current", "true");

  // Lucia does not see Marco's private "Altro" boutique
  await page.context().clearCookies();
  await loginAsHer(page);
  await page.goto("/aziende");
  await expect(page.getByText("Boutique Prova Advisory")).toHaveCount(0);
});

test("career: timeline from the CV, LinkedIn export, percorsi by year, fit warning, redo the questionnaire", async ({ page }) => {
  await loginAsStudent(page);
  await page.goto("/profilo/esperienze");
  await assertUiBasics(page);
  await expect(page.getByText("Associazione studentesca di finanza (esempio)")).toBeVisible(); // read from his demo CV
  // LinkedIn export (CSV inside the zip is also accepted; here the CSV itself)
  await page.setInputFiles('input[name="files"]', {
    name: "Positions.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Company Name,Title,Description,Location,Started On,Finished On\nSatispay,Growth Intern,,Milano,Jun 2026,Sep 2026\n"),
  });
  await page.getByRole("button", { name: "Importa" }).click();
  await expect(page.getByText("Esperienze importate.")).toBeVisible();
  await expect(page.getByText("Growth Intern")).toBeVisible();
  await expect(page.getByText("da LinkedIn").first()).toBeVisible();

  await page.goto("/percorsi");
  await assertUiBasics(page);
  await expect(page.getByText(/Il tuo anno: primi anni/i)).toBeVisible();
  await expect(page.getByText(/Spring week/).first()).toBeVisible();
  await expect(page.getByText("Ruoli da cercare:").first()).toBeVisible();

  // A construction company after finance choices: a gentle warning, not a block.
  await page.goto("/aziende");
  await page.getByLabel("Cerca un'azienda o un brand").fill("webuild");
  await page.locator("label", { hasText: /^Webuild/ }).first().click();
  await page.getByRole("button", { name: "Salva aziende" }).click();
  await expect(page.getByText(/Potrebbe non essere la scelta più adatta: Webuild/)).toBeVisible();

  // Redo the questionnaire: answers stay filled in.
  await page.goto("/profilo");
  await page.getByRole("button", { name: "Rifai il questionario" }).click();
  await expect(page).toHaveURL(/benvenuto\/1/);
  await expect(page.getByLabel("Nome e cognome")).toHaveValue("Marco Bianchi");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByLabel("Corso di laurea")).toHaveValue("Economia e finanza");
  await page.getByLabel("Anno di corso").selectOption("2");
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.goto("/percorsi");
  await expect(page.getByText(/Il tuo anno: penultimo anno/i)).toBeVisible(); // updated without finishing the questionnaire
});

test("admin: people, invitation, view-as, catalog, rules, metrics, cron endpoint", async ({ page, request }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/utenti");
  await expect(page.getByText("Lucia Ferraro").first()).toBeVisible();
  await expect(page.getByText("Marco Bianchi").first()).toBeVisible();
  await page.getByLabel("Nota (per chi è)").fill("Prova");
  await page.getByRole("button", { name: "Crea invito" }).click();
  await expect(page.getByText(/Codice di invito/)).toBeVisible();
  const code = (await page.locator("p.font-mono").innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{8}$/);

  // view as Marco
  await page.locator("div", { hasText: /^Marco Bianchi/ }).getByRole("button", { name: "Apri la sua app" }).first().click();
  await expect(page.getByText(/Stai vedendo l'app di/)).toContainText("Marco");
  await expect(page.getByRole("heading", { name: "Stage per te" })).toBeVisible();

  await page.goto("/admin/catalogo");
  await expect(page.getByText("Boutique Prova Advisory")).toBeVisible(); // added with Altro in the previous test
  await page.goto("/admin/fonti");
  await expect(page.getByText("email:linkedin")).toBeVisible();
  await page.getByRole("button", { name: "Ricerca sul web (W1)" }).click();
  await expect(page.getByText("Ricerca sul web (W1) eseguita.")).toBeVisible();
  await page.goto("/admin/invii");
  await expect(page.getByLabel(/Invii al giorno \(max assoluto 20\)/)).toHaveAttribute("max", "20");
  await page.getByLabel(/Invii al giorno \(max assoluto 20\)/).fill("8");
  await page.getByRole("button", { name: "Salva le regole" }).click();
  await expect(page.getByText("Salvato.")).toBeVisible();
  await expect(page.getByLabel(/Invii al giorno \(max assoluto 20\)/)).toHaveValue("8");
  await page.goto("/admin/metriche");
  await expect(page.getByText("Offerte trovate per fonte")).toBeVisible();

  expect((await request.get("/api/cron/queue")).status()).toBe(401);
  const ok = await request.get("/api/cron/queue", { headers: { Authorization: "Bearer e2e-cron-secret" } });
  expect(ok.status()).toBe(200);

  // the invitation works once
  await page.context().clearCookies();
  await page.goto(`/registrati?invito=${code}`);
  await page.getByRole("radio", { name: /^Uno stage/ }).check();
  await page.getByLabel("Nome e cognome").fill("Giulia Prova");
  await page.getByLabel("E-mail").fill("giulia@example.com");
  await page.getByLabel("Password").fill("una-password-lunga");
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page).toHaveURL(/benvenuto\/1/);
  await expect(page.getByText("Passo 1 di 12")).toBeVisible();
});

test("student questionnaire: 12 steps, catalog, Altro, automatic focus", async ({ page }) => {
  await login(page, "giulia@example.com", "una-password-lunga");
  await expect(page).toHaveURL(/benvenuto\/1/);
  await page.getByLabel("Nome e cognome").fill("Giulia Prova");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 2 di 12")).toBeVisible();
  await page.getByLabel("Università").fill("Università (esempio)");
  await page.getByLabel("Corso di laurea").fill("Economia");
  await page.getByLabel("Anno di corso").selectOption("1");
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByLabel("La tua città").fill("Milano");
  await page.getByLabel("Altre città").fill("Londra");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 4 di 12")).toBeVisible();
  await page.getByText("Estate (giugno-settembre)").click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Salta" }).click(); // paga
  await page.getByRole("button", { name: "Salta" }).click(); // lingue
  await expect(page.getByText("Passo 7 di 12")).toBeVisible();
  await page.getByRole("button", { name: "Lo carico più tardi" }).click();
  await expect(page.getByRole("heading", { name: "Quali settori ti interessano?" })).toBeVisible();
  await page.getByText("Investment banking e M&A", { exact: true }).click();
  await page.getByLabel("Altro: un settore che non c'è").fill("Restauro di tessuti antichi");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 9 di 12")).toBeVisible();
  await page.getByText("Finanza e mercati").click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Suggerite per te")).toBeVisible();
  await page.getByLabel("Cerca un'azienda o un brand").fill("lazard");
  await page.locator("label", { hasText: /^Lazard/ }).first().click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Avanti" }).click(); // evitare
  await expect(page.getByText("Passo 12 di 12")).toBeVisible();
  await expect(page.getByText("Consiglio")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Tutte, con priorità/ })).toBeChecked(); // few choices: everything, choices first
  await page.getByRole("button", { name: "Fine" }).click();
  await expect(page.getByRole("heading", { name: /Fatto, Giulia/ })).toBeVisible();
  await page.getByRole("link", { name: "Vedi gli stage" }).click();
  await expect(page.getByRole("heading", { name: "Stage per te" })).toBeVisible();
  await page.goto("/profilo");
  await expect(page.getByText(/Economia · Università \(esempio\) · 1° anno/)).toBeVisible();
  await page.goto("/aziende");
  await expect(page.locator("label", { hasText: "Restauro di tessuti antichi" })).toBeVisible();
});

test("CV upload, then delete all data and redo the job questionnaire", async ({ page }) => {
  await loginAsHer(page);
  await page.goto("/profilo/cv");
  await page.getByRole("button", { name: "Elimina" }).last().click();
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  await page.setInputFiles("#file", { name: "cv-prova.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.locator("#family").fill("Segreteria");
  await page.getByRole("button", { name: "Carica" }).click();
  await expect(page.getByText(/^CV caricato/)).toBeVisible();
  await expect(page.getByText("CV Segreteria").first()).toBeVisible();

  await page.goto("/profilo");
  await assertUiBasics(page);
  await page.getByRole("link", { name: /Cancella tutti i miei dati/ }).click();
  await expect(page.getByRole("heading", { name: "Cancellare tutti i tuoi dati?" })).toBeVisible();
  await page.getByRole("button", { name: "Sì, cancella tutto" }).click();
  await expect(page).toHaveURL(/benvenuto\/1/);
  await expect(page.getByText("Tutti i tuoi dati sono stati cancellati.")).toBeVisible();

  await expect(page.getByText("Passo 1 di 12")).toBeVisible();
  await page.getByLabel("Nome e cognome").fill("Anna Prova");
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByLabel("Ruolo", { exact: true }).fill("Segretaria");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Vanno bene anche questi ruoli?" })).toBeVisible();
  await expect(page.getByText("Receptionist")).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 3 di 12")).toBeVisible();
  await page.getByLabel("La tua città").fill("Moncalieri");
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByText("Part-time", { exact: true }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 5 di 12")).toBeVisible();
  await page.getByLabel("Euro netti al mese").fill("1200");
  await expect(page.getByText(/lordo annuo/)).toBeVisible();
  await page.getByText(/Nascondi le offerte sotto questa cifra/).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  for (let i = 6; i <= 11; i++) {
    await expect(page.getByText(`Passo ${i} di 12`)).toBeVisible();
    if (i === 7) await page.getByRole("button", { name: "Lo carico più tardi" }).click();
    else await page.getByRole("button", { name: "Salta" }).click();
  }
  await expect(page.getByText("Passo 12 di 12")).toBeVisible();
  await page.getByRole("button", { name: "Fine" }).click();
  await expect(page.getByRole("heading", { name: /Fatto, Anna/ })).toBeVisible();
  await page.getByRole("link", { name: "Vedi le offerte" }).click();
  await expect(page.getByText("(i tuoi predefiniti)")).toBeVisible(); // the salary floor from the questionnaire is a default filter

  await page.goto("/profilo");
  await expect(page.getByText(/Moncalieri, 20 km/)).toBeVisible();
  await expect(page.getByText(/1\.?200 € netti al mese · nascondo quelle sotto/)).toBeVisible();
});
