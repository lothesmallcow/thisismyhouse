import { expect, test } from "@playwright/test";
import { addPlace, assertUiBasics, login, loginAsAdmin, loginAsFashion, loginAsHer, loginAsStudent } from "./helpers";

test.describe.configure({ mode: "serial" });

test("public pages: landing, prices, sign-up is a request the admin approves by default", async ({ page }) => {
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
  await expect(page.getByLabel("Codice di invito (se ce l'hai)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chiedi l'accesso" })).toBeVisible();
  // The privacy notice, linked from the sign-up form, open to everyone.
  await page.getByRole("link", { name: "informativa privacy" }).click();
  await expect(page.getByRole("heading", { name: "Informativa privacy" })).toBeVisible();
  await assertUiBasics(page);
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

  // filters: places start from the profile's; trying another one leaves the profile as it is
  await page.goto("/offerte");
  await page.getByText("Filtri").click();
  await expect(page.getByRole("group", { name: "Luoghi" })).toBeVisible();
  await expect(page.getByText("Distanza")).toHaveCount(0);
  // Type, contract and sector: several at once
  const filtri = page.locator("form").filter({ has: page.getByRole("button", { name: "Applica" }) });
  await filtri.getByText("Lavoro", { exact: true }).click();
  await filtri.getByText("Stage", { exact: true }).click();
  await filtri.getByText("Tempo indeterminato", { exact: true }).click();
  await filtri.getByText("Tempo determinato", { exact: true }).click();
  await addPlace(page, "Regno", /Regno Unito · tutto il paese/);
  await page.getByRole("button", { name: "Applica" }).click();
  await expect(page).toHaveURL(/tipo=lavoro&tipo=stage/);
  await expect(page).toHaveURL(/contratto=indeterminato&contratto=determinato/);
  await expect(page.getByRole("checkbox", { name: "Stage", exact: true })).toBeChecked();
  await expect(page.getByRole("link", { name: "Torna ai luoghi del profilo" })).toBeVisible();
  await page.getByRole("link", { name: "Torna ai luoghi del profilo" }).click();
  await expect(page.getByRole("link", { name: "Torna ai luoghi del profilo" })).toHaveCount(0);

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
  await expect(page).toHaveURL(/vista=aziende/); // read the cards of the new page, not the old one
  await expect(page.getByRole("link", { name: "Solo aziende scelte" })).toHaveAttribute("aria-current", "true");
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

test("countries and regions, the full company database, NACE industries", async ({ page }) => {
  await loginAsStudent(page);
  // Questionnaire "dove": optional countries and regions.
  await page.goto("/benvenuto/3?ritorno=profilo");
  await assertUiBasics(page);
  await addPlace(page, "Italia", /^Italia · tutto il paese/);
  await addPlace(page, "Engl", /^England · regione/);
  await page.getByRole("button", { name: /Salva|Avanti/ }).first().click();

  // Browse everything, page by page, then search a listed UK bank and choose it.
  await page.goto("/aziende");
  await expect(page.getByRole("heading", { name: "Tutte le aziende" })).toBeVisible();
  await expect(page.getByText(/aziende · pagina 1 di \d+/)).toBeVisible();
  await page.getByLabel("Cerca per nome, città o attività").fill("lloyds");
  await page.getByRole("button", { name: "Cerca" }).first().click();
  await expect(page).toHaveURL(/cerca=lloyds/);
  await assertUiBasics(page);
  await page.getByRole("button", { name: /Mi interessa Lloyds Banking Group/ }).click();
  await expect(page.locator("section[aria-labelledby=scelte]").getByText(/Lloyds Banking Group/)).toBeVisible();

  // Industries beyond the hand-made list, in any of four languages.
  await page.getByLabel("Cerca un settore").fill("imbarcazioni");
  await page.getByRole("button", { name: "Cerca", exact: true }).last().click();
  await expect(page.getByText(/NACE 30\.1/).first()).toBeVisible();
});

test("persona: luxury store manager in Milan, score, requirements, role sheet, folders, weights, write to a company", async ({ page }) => {
  await loginAsFashion(page);
  // Offers with a score out of 100, best first.
  await assertUiBasics(page);
  const first = page.locator("article").first();
  await expect(first).toContainText("Store Manager boutique alta moda");
  await expect(first).toContainText("/100");
  // Only the very good ones, and newest first.
  await page.goto("/offerte?punteggio=70");
  await expect(page.getByText("Junior Sales Assistant")).toHaveCount(0);
  await page.goto("/offerte?ordina=recenti");
  await expect(page.getByRole("heading", { name: "Molto adatte" })).toHaveCount(0);

  // The watch boutique: score parts, requirements with the gap named, the role sheet.
  await page.goto("/offerte?q=orologeria&tutte=1");
  await page.getByRole("link", { name: /Boutique Manager orologeria/ }).first().click();
  await assertUiBasics(page);
  await expect(page.getByText("Punteggio", { exact: true })).toBeVisible();
  await expect(page.getByText("Orologeria o gioielleria", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/chi viene dalla vendita nel lusso è spesso preso/)).toBeVisible();
  await page.getByLabel("Cartella", { exact: true }).selectOption({ label: "Da tenere d'occhio" });
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByText("Salvata nella cartella.")).toBeVisible();
  await page.getByRole("link", { name: "Apri la scheda del ruolo" }).click();
  await assertUiBasics(page);
  await expect(page.getByText("Grandi gruppi e marchi di punta")).toBeVisible();
  await expect(page.getByText(/Età tipica/)).toBeVisible();
  await expect(page.getByText(/Stime indicative/).first()).toBeVisible();

  // Folders: the starter ones, rename, create.
  await page.goto("/offerte/cartelle");
  await assertUiBasics(page);
  await expect(page.getByRole("link", { name: /Candidarsi presto/ })).toBeVisible();
  await page.getByLabel("Nuova cartella").fill("Colloqui da preparare");
  await page.getByRole("button", { name: "Crea" }).click();
  await expect(page.getByText("Cartella creata.")).toBeVisible();
  await page.getByRole("link", { name: /Da tenere d'occhio/ }).click();
  await expect(page.getByText(/Boutique Manager orologeria/)).toBeVisible();

  // Her own weights: optional, one screen.
  await page.goto("/profilo/punteggio");
  await assertUiBasics(page);
  await page.getByLabel("Luogo").fill("10");
  await page.getByRole("button", { name: "Salva e ricalcola" }).click();
  await expect(page.getByText("Salvato: punteggi ricalcolati.")).toBeVisible();
  await page.getByRole("button", { name: "Torna ai valori di partenza" }).click();

  // Her search code, its searches, and ready links to create the alerts on the big sites.
  await page.goto("/profilo/codice");
  await assertUiBasics(page);
  await expect(page.getByText(/^L · IT:Milano/)).toBeVisible();
  await expect(page.getByRole("link", { name: /LinkedIn · Store manager/ })).toHaveAttribute("href", /linkedin\.com\/jobs\/search\/\?keywords=Store%20manager&location=Milano/);

  // Discreet search and companies to write to without an ad.
  await page.goto("/profilo");
  await expect(page.getByText(/Ricerca riservata: Maison Esempio Moda/)).toBeVisible();
  await page.goto("/percorsi");
  await assertUiBasics(page);
  await expect(page.getByText("Cambio di settore: settori vicini")).toBeVisible();
  await page.getByRole("link", { name: /^Scrivi a / }).first().click();
  await assertUiBasics(page);
  await page.getByLabel("Indirizzo e-mail per le candidature").fill("careers@azienda-esempio.example");
  await page.getByLabel("Dove l'hai trovato").fill("https://azienda-esempio.example/lavora-con-noi");
  await page.getByRole("button", { name: "Prepara la candidatura" }).click();
  await expect(page).toHaveURL(/da-inviare/);
  await expect(page.getByText(/Candidatura spontanea pronta/)).toBeVisible();

  // Positions recommended from her CV: she ticks the next step and it is searched.
  await page.goto("/profilo/posizioni");
  await assertUiBasics(page);
  await expect(page.getByRole("checkbox", { name: "Store manager", exact: true })).toBeChecked();
  const area = page.getByRole("checkbox", { name: /^Area manager/ });
  await expect(area).not.toBeChecked();
  await expect(page.getByText(/Passo successivo · Il passo dopo "Store Manager"/).first()).toBeVisible();
  await area.check();
  await page.getByRole("button", { name: "Salva e cerca" }).click();
  await expect(page.getByText(/Posizioni salvate/)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /^Area manager/ })).toBeChecked();
  await page.goto("/profilo/codice");
  await expect(page.getByText(/area-manager/).first()).toBeVisible();

  // Several careers at once (Posizioni e carriere), with the positions of each career to add.
  await page.goto("/profilo/posizioni");
  await page.locator("summary", { hasText: /Le tue carriere/ }).click();
  await page.locator("label", { hasText: /^Consulenza strategica/ }).click();
  await page.getByRole("button", { name: "Salva e cerca" }).click();
  await expect(page.getByText(/Posizioni salvate/)).toBeVisible();
  await expect(page.getByText("Aggiungi posizioni delle tue carriere")).toBeVisible();
  await page.locator("label", { hasText: /^Consulente strategico$/ }).click();
  await page.getByRole("button", { name: "Salva e cerca" }).click();
  await expect(page.getByRole("checkbox", { name: "Consulente strategico", exact: true })).toBeChecked();
  // Several countries, each with its city, on the map (Dove).
  await page.goto("/profilo/dove");
  await assertUiBasics(page);
  await addPlace(page, "Londo", /^London · città, Regno Unito/);
  await expect(page.getByText("London · città, Regno Unito")).toBeVisible();
  await page.getByRole("button", { name: "Salva e cerca" }).click();
  await expect(page.getByText(/cerco in questi posti/)).toBeVisible();
  await page.goto("/offerte");
  await expect(page.getByText(/Regno Unito \(London\)/)).toBeVisible();
  await expect(page.getByText(/Consulenza strategica/).first()).toBeVisible();
  await page.goto("/profilo/codice");
  await expect(page.getByText(/GB:London/).first()).toBeVisible();
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
  await page.getByRole("button", { name: "Chiedi l'accesso" }).click(); // with a code: no wait
  // First thing in the app: the questionnaire, quick or complete.
  await expect(page).toHaveURL(/benvenuto\/inizio/);
  await assertUiBasics(page);
  // "Cosa fai ora?" first: it decides the questions (signed up for internships: a bachelor's, preselected).
  await expect(page.getByRole("radio", { name: /Faccio la triennale/ })).toBeChecked();
  await page.getByRole("button", { name: "Inizia la versione completa" }).click();
  await expect(page.getByText("Passo 1 di 13")).toBeVisible();
});

test("access request: waits, the admin approves, then the person signs in", async ({ page }) => {
  await page.goto("/registrati");
  await page.getByLabel("Nome e cognome").fill("Paola Richiesta");
  await page.getByLabel("E-mail").fill("paola@example.com");
  await page.getByLabel("Password").fill("una-password-lunga");
  await page.getByRole("button", { name: "Chiedi l'accesso" }).click();
  await expect(page.getByText("Richiesta inviata")).toBeVisible();
  await assertUiBasics(page);
  await page.goto("/entra");
  await page.getByLabel("E-mail").fill("paola@example.com");
  await page.getByLabel("Password").fill("una-password-lunga");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByText(/in attesa/)).toBeVisible();
  // A wrong password says nothing about the request.
  await page.getByLabel("E-mail").fill("paola@example.com");
  await page.getByLabel("Password").fill("password-sbagliata");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page.getByText("E-mail o password non corrette.")).toBeVisible();

  await loginAsAdmin(page);
  await page.goto("/admin/utenti");
  await expect(page.getByText("Richieste di accesso (1)")).toBeVisible();
  await assertUiBasics(page);
  await page.getByRole("button", { name: "Approva" }).click();
  await expect(page.getByText(/Richiesta approvata/)).toBeVisible();
  await page.context().clearCookies();
  await login(page, "paola@example.com", "una-password-lunga");
  await expect(page).toHaveURL(/benvenuto\/inizio/);
});

test("quick questionnaire for a new account: 5 questions, a generic role becomes precise positions, complete later", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/utenti");
  await page.locator("#new-name").fill("Sara Prova");
  await page.locator("#new-email").fill("sara@example.com");
  await page.locator("#new-pw").fill("una-password-lunga");
  await page.getByRole("button", { name: "Crea", exact: true }).click();
  await page.context().clearCookies();
  await login(page, "sara@example.com", "una-password-lunga");
  await expect(page).toHaveURL(/benvenuto\/inizio/);
  await page.getByRole("button", { name: "Inizia la versione veloce" }).click();
  await expect(page.getByText(/Scegli prima cosa fai ora/)).toBeVisible();
  await page.getByRole("radio", { name: /Lavoro da meno di 3 anni/ }).check();
  await page.getByRole("button", { name: "Inizia la versione veloce" }).click();
  await expect(page.getByText("Passo 1 di 6")).toBeVisible();
  await page.getByLabel("Nome e cognome").fill("Sara Prova");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 2 di 6")).toBeVisible();
  await page.getByLabel("Ruolo", { exact: true }).fill("venditrice moda");
  await page.getByText("Alta: mi serve un lavoro presto").click();
  await page.getByRole("button", { name: "Avanti" }).click();
  // Too generic: the precise positions are proposed, ticked.
  await expect(page.getByText(/è molto generico/)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Client advisor" })).toBeChecked();
  await page.getByRole("button", { name: "Avanti" }).click();
  // Workers: their experience (students get their studies instead).
  await expect(page.getByText("Passo 3 di 6")).toBeVisible();
  await expect(page.getByRole("heading", { name: "La tua esperienza" })).toBeVisible();
  await page.getByLabel("Anni di esperienza di lavoro").selectOption("1");
  await page.getByLabel("Ruolo attuale (o l'ultimo)").fill("Commessa");
  await page.getByText("Entro un mese").click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 4 di 6")).toBeVisible();
  await addPlace(page, "Milano", /^Milano · città/);
  await expect(page.getByText("Dove puoi lavorare senza visto?")).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 5 di 6")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.getByText("Passo 6 di 6")).toBeVisible();
  await page.getByRole("button", { name: "Lo carico più tardi" }).click();
  await expect(page).toHaveURL(/benvenuto\/fine/);
  // The search code uses the precise positions, not the generic words.
  await page.goto("/profilo/codice");
  await expect(page.getByText(/client-advisor/).first()).toBeVisible();
  await expect(page.getByText("alta", { exact: true })).toBeVisible(); // her priority, in the brackets
  // A first search already ran after the last answer; the offers page says where offers come from.
  await page.goto("/offerte");
  await expect(page.getByText("Da dove arrivano le tue offerte")).toBeVisible();
  await assertUiBasics(page);
  await page.getByRole("button", { name: "Fai web scraping" }).first().click();
  await expect(page.getByText(/Hai già cercato da poco/)).toBeVisible();
  // Details later: the complete questionnaire, answers kept.
  await page.goto("/profilo");
  await expect(page.getByText("Lavoro da meno di 3 anni")).toBeVisible();
  await expect(page.getByText(/1\+ anni · Commessa · Entro un mese/)).toBeVisible();
  await page.getByRole("button", { name: "Completa il questionario" }).click();
  await expect(page.getByText("Passo 1 di 13")).toBeVisible();
  await expect(page.getByLabel("Nome e cognome")).toHaveValue("Sara Prova");
});

test("collega le fonti: personal address, the right sites and alerts, and the Salva in Compass button", async ({ page }) => {
  await loginAsStudent(page);
  // Step 1: the e-mail first, with the reason, and only the instructions of the chosen provider.
  await page.goto("/collega?passo=1");
  await assertUiBasics(page);
  await expect(page.getByText(/Compass trova le offerte leggendo proprio quelle e-mail/)).toBeVisible();
  // Gmail: one click (Google sign-in); forwarding stays as the alternative.
  await expect(page.getByRole("link", { name: "Collega Gmail" })).toHaveAttribute("href", "/api/google/connect");
  await page.getByRole("link", { name: "Usa l'inoltro di Gmail" }).click();
  await expect(page.getByText(/compass\.demo\+cmp-[a-z0-9]{6}@example\.com/).first()).toBeVisible();
  await expect(page.getByText(/lascia selezionato/i)).toBeVisible();
  // Gmail refuses to forward a mailbox to itself: the page explains it and who can link it.
  await expect(page.getByText(/Non puoi specificare il tuo indirizzo email/)).toBeVisible();
  await expect(page.getByText(/Admin → Utenti/)).toBeVisible();
  await expect(page.getByText(/Controllo finale/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Scarica il filtro" })).toHaveAttribute("href", "/api/gmail-filter");
  await expect(page.getByText(/Reindirizza a/)).toHaveCount(0); // not Outlook's steps
  const xml = await page.request.get("/api/gmail-filter");
  expect(xml.status()).toBe(200);
  expect(await xml.text()).toMatch(/forwardTo' value='compass\.demo\+cmp-/);
  await page.getByRole("button", { name: "Ho finito, avanti" }).click();
  // Step 2: accounts.
  await expect(page).toHaveURL(/passo=2/);
  await expect(page.getByRole("link", { name: /Crea l'account/ }).first()).toHaveAttribute("href", /linkedin\.com\/signup/);
  await page.getByRole("button", { name: "Avanti" }).click();
  // Step 3: the alerts, pre-filtered.
  await expect(page).toHaveURL(/passo=3/);
  await assertUiBasics(page);
  await expect(page.getByRole("link", { name: /^Apri/ }).first()).toHaveAttribute("href", /f_E=1/);
  await page.getByRole("button", { name: "Fatto", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Fatto ✓" }).first()).toBeVisible();
  await expect(page.getByText("Consigli per avvisi davvero utili")).toBeVisible();
  await expect(page.getByText("Scegli quelli che ti interessano di più")).toBeVisible();
  await expect(page.getByText("consigliato").first()).toBeVisible();
  await page.goto("/collega?passo=4");
  await expect(page.getByText(/Ci vuole un po' di pazienza/)).toBeVisible();

  // "Collega Gmail" (simulated in demo): connected, then disconnected.
  await page.goto("/collega?passo=1");
  await page.getByRole("link", { name: "Collega Gmail" }).click();
  await expect(page).toHaveURL(/passo=2/);
  await expect(page.getByText(/Gmail collegata\. Sto leggendo gli avvisi/)).toBeVisible();
  await page.goto("/collega?passo=1");
  await expect(page.getByText(/Gmail collegata: studente@example\.com/)).toBeVisible();
  await expect(page.getByText(/Cosa legge Compass, esattamente/)).toBeVisible();
  await assertUiBasics(page);
  await page.getByRole("button", { name: "Scollega Gmail" }).click();
  await expect(page.getByText(/Gmail scollegata/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Collega Gmail" })).toBeVisible();
  // A failed connection says why, with the return address to compare in Google Cloud.
  await page.goto("/collega?passo=1&msg=gmail-riprova&motivo=invalid_client");
  await expect(page.getByText("Perché Collega Gmail non è andato")).toBeVisible();
  await expect(page.getByText(/Google non riconosce l'ID client o il secret/)).toBeVisible();
  await expect(page.getByText(/\/api\/google\/callback/)).toBeVisible();

  await page.goto("/offerte/salva");
  await assertUiBasics(page);
  await expect(page.getByRole("link", { name: "Salva in Compass" })).toHaveAttribute("href", /^javascript:/);
  await page.goto("/offerte/aggiungi?title=Stage%20M%26A&company=Banca%20Esempio&url=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F123%2F&text=Stage%20di%20sei%20mesi%20a%20Milano");
  await expect(page.getByLabel("Ruolo")).toHaveValue("Stage M&A");
  await expect(page.getByLabel("Azienda")).toHaveValue("Banca Esempio");
  await expect(page.getByLabel("Link dell'annuncio")).toHaveValue("https://www.linkedin.com/jobs/view/123/");
});

test("student questionnaire: 13 steps, catalog, activities, Altro, automatic focus", async ({ page }) => {
  await login(page, "giulia@example.com", "una-password-lunga");
  await expect(page).toHaveURL(/benvenuto\/1/);
  await page.getByLabel("Nome e cognome").fill("Giulia Prova");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 2 di 13")).toBeVisible();
  await page.getByLabel("Università").fill("Università (esempio)");
  await page.getByLabel("Corso di laurea").fill("Economia");
  await page.getByLabel("Anno di corso").selectOption("1");
  await page.getByRole("button", { name: "Avanti" }).click();
  await addPlace(page, "Milano", /^Milano · città/);
  await addPlace(page, "Londo", /^London · città/);
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 4 di 13")).toBeVisible();
  await page.getByText("Estate (giugno-settembre)").click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 5 di 13")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click(); // paga
  await expect(page.getByText("Passo 6 di 13")).toBeVisible(); // wait for the page before the next click
  await page.getByRole("button", { name: "Salta" }).click(); // lingue
  await expect(page.getByText("Passo 7 di 13")).toBeVisible();
  await page.getByRole("button", { name: "Lo carico più tardi" }).click();
  // Students with a short CV: what they do besides studying.
  await expect(page.getByRole("heading", { name: "Cosa fai oltre allo studio?" })).toBeVisible();
  await page.getByText("Club di finanza o investimenti").click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Quali settori ti interessano?" })).toBeVisible();
  await page.getByText("Investment banking e M&A", { exact: true }).click();
  await page.getByLabel("Altro: un settore che non c'è").fill("Restauro di tessuti antichi");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 10 di 13")).toBeVisible();
  await page.getByText("Finanza e mercati").click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Suggerite per te")).toBeVisible();
  await page.getByLabel("Cerca un'azienda o un brand").fill("lazard");
  await page.locator("label", { hasText: /^Lazard/ }).first().click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 12 di 13")).toBeVisible(); // wait for the page before the next click
  await page.getByRole("button", { name: "Avanti" }).click(); // evitare
  await expect(page.getByText("Passo 13 di 13")).toBeVisible();
  await expect(page.getByText("Consiglio")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Tutte, con priorità/ })).toBeChecked(); // few choices: everything, choices first
  await page.getByRole("button", { name: "Fine" }).click();
  await expect(page.getByRole("heading", { name: /Fatto, Giulia/ })).toBeVisible();
  await page.getByRole("link", { name: "Vedi gli stage" }).click();
  await expect(page.getByRole("heading", { name: "Stage per te" })).toBeVisible();
  await page.goto("/profilo");
  await expect(page.getByText(/Economia · Università \(esempio\) · 1° anno/)).toBeVisible();
  await expect(page.getByText("Club di finanza o investimenti")).toBeVisible();
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
  // Like a new account: first the choice between the quick and the complete questionnaire.
  await expect(page).toHaveURL(/benvenuto\/inizio/);
  await expect(page.getByText("Tutti i tuoi dati sono stati cancellati.")).toBeVisible();
  await page.getByRole("radio", { name: /Lavoro da 3 anni o più/ }).check();
  await page.getByRole("button", { name: "Inizia la versione completa" }).click();
  await expect(page.getByText("Passo 1 di 13")).toBeVisible();
  await page.getByLabel("Nome e cognome").fill("Anna Prova");
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByLabel("Ruolo", { exact: true }).fill("Segretaria");
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Vanno bene anche questi ruoli?" })).toBeVisible();
  await expect(page.getByText("Receptionist")).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 3 di 13")).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click(); // esperienza
  await expect(page.getByText("Passo 4 di 13")).toBeVisible();
  await addPlace(page, "Moncalieri", /^Moncalieri · città/);
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByText("Part-time", { exact: true }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByText("Passo 6 di 13")).toBeVisible();
  await page.getByLabel("Euro netti al mese").fill("1200");
  await expect(page.getByText(/lordo annuo/)).toBeVisible();
  await page.getByText(/Nascondi le offerte sotto questa cifra/).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  for (let i = 7; i <= 12; i++) {
    await expect(page.getByText(`Passo ${i} di 13`)).toBeVisible();
    if (i === 8) await page.getByRole("button", { name: "Lo carico più tardi" }).click();
    else await page.getByRole("button", { name: "Salta" }).click();
  }
  await expect(page.getByText("Passo 13 di 13")).toBeVisible();
  await page.getByRole("button", { name: "Fine" }).click();
  await expect(page.getByRole("heading", { name: /Fatto, Anna/ })).toBeVisible();
  await page.getByRole("link", { name: "Vedi le offerte" }).click();
  await expect(page.getByText("(i tuoi predefiniti)")).toBeVisible(); // the salary floor from the questionnaire is a default filter

  await page.goto("/profilo");
  await expect(page.getByText(/Moncalieri/)).toBeVisible();
  await expect(page.getByText(/1\.?200 € netti al mese · nascondo quelle sotto/)).toBeVisible();
});
