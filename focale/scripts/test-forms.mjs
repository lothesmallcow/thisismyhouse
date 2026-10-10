// End-to-end checks for the forms (Web3Forms is mocked, nothing leaves the machine).
// Needs `npm run preview` running. Run: npm run test:forms
import { launch } from "./browser.mjs";
import assert from "node:assert/strict";

const base = process.env.BASE ?? "http://localhost:4321";
const browser = await launch();
const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(`PASS ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}\n     ${e.message.split("\n").slice(0, 6).join(" | ")}`);
  }
};

const mockWeb3 = async (page, status = 200) => {
  const sent = [];
  await page.route("https://api.web3forms.com/submit", async (route) => {
    sent.push(JSON.parse(route.request().postData() ?? "{}"));
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: status === 200 }) });
  });
  return sent;
};

await test("preview form: steps, validation, payload, redirect", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const sent = await mockWeb3(page);
  await page.goto(`${base}/anteprima-gratuita/?pacchetto=professionale&settore=b-and-b-e-agriturismi&fondatori=1`);
  await page.evaluate(() => (document.querySelector("[data-preview-form]").dataset.key = "test-key"));
  assert.equal(await page.isChecked('input[value="B&B o agriturismo"]'), true, "sector preselected");
  assert.match(await page.textContent("[data-package]"), /Professionale/);
  assert.equal(await page.isVisible('[data-step="2"]'), false, "step 2 hidden at start");
  await page.click('[data-step="1"] [data-next]');
  await page.waitForSelector('[data-step="2"].is-current');
  assert.match(await page.textContent("[data-progress-label]"), /Passo 2 di 3/);
  await page.click('[data-step="2"] [data-next]');
  assert.equal(await page.textContent("#err-sito"), "Scegli un'opzione per continuare.");
  await page.check('input[name="sito"][value="Sì"]', { force: true });
  await page.fill("#sito-indirizzo", "www.cascinadiprova.it");
  await page.click('[data-step="2"] [data-next]');
  await page.waitForSelector('[data-step="3"].is-current');
  await page.click("[data-submit]");
  assert.equal(await page.textContent("#err-nome"), "Scrivi il tuo nome.");
  assert.equal(await page.textContent("#err-privacy"), "Per inviarmi la richiesta devi accettare l'informativa privacy.");
  assert.equal(await page.getAttribute("#f-nome", "aria-invalid"), "true");
  await page.fill("#f-nome", "Anna");
  await page.fill("#f-attivita", "Cascina di Prova");
  await page.fill("#f-tel", "12345");
  await page.click("[data-submit]");
  assert.equal(await page.textContent("#err-telefono"), "Scrivi un numero di telefono valido, ad esempio 333 123 4567.");
  await page.fill("#f-tel", "333 123 4567");
  await page.fill("#f-email", "anna@");
  await page.fill("#f-zona", "Brianza");
  await page.check('input[name="privacy"]');
  await page.click("[data-submit]");
  assert.match(await page.textContent("#err-email"), /email valido/);
  await page.fill("#f-email", "");
  await Promise.all([page.waitForURL(/\/grazie\/$/), page.click("[data-submit]")]);
  assert.equal(sent.length, 1, "one request sent");
  const p = sent[0];
  assert.equal(p.access_key, "test-key");
  assert.equal(p.subject, "Nuova richiesta di anteprima: Cascina di Prova");
  assert.equal(p.from_name, "Sito Focus Design");
  assert.equal(p.attivita, "B&B o agriturismo");
  assert.equal(p.sito, "Sì: www.cascinadiprova.it");
  assert.equal(p.pacchetto, "Professionale");
  assert.equal(p.fondatori, "Sì, posto fondatori");
  assert.equal(p.email, "non indicata");
  await page.close();
});

await test("preview form: network failure shows WhatsApp fallback with all answers", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await mockWeb3(page, 500);
  await page.goto(`${base}/anteprima-gratuita/`);
  await page.evaluate(() => (document.querySelector("[data-preview-form]").dataset.key = "test-key"));
  await page.check('input[value="Ristrutturazioni"]', { force: true });
  await page.waitForSelector('[data-step="2"].is-current');
  await page.check('input[name="sito"][value="No, niente"]', { force: true });
  await page.keyboard.press("Enter");
  await page.waitForSelector('[data-step="3"].is-current');
  await page.fill("#f-nome", "Giulia");
  await page.fill("#f-attivita", "Edilizia Rossi");
  await page.fill("#f-tel", "+39 333 1234567");
  await page.fill("#f-zona", "Città Studi");
  await page.check('input[name="privacy"]');
  await page.click("[data-submit]");
  await page.waitForSelector("[data-fail]:not([hidden])");
  const href = decodeURIComponent(await page.getAttribute("[data-fail-wa]", "href"));
  for (const s of ["Ristrutturazioni", "No, niente", "Giulia", "Edilizia Rossi", "+39 333 1234567", "Città Studi"]) assert.ok(href.includes(s), `WhatsApp text has ${s}`);
  assert.equal(await page.isEnabled("[data-submit]"), true, "button re-enabled");
  await page.close();
});

await test("preview form without JavaScript: one normal form posting to Web3Forms", async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/anteprima-gratuita/`);
  for (const s of [1, 2, 3]) assert.equal(await page.isVisible(`[data-step="${s}"]`), true, `step ${s} visible`);
  assert.equal(await page.getAttribute("[data-preview-form]", "action"), "https://api.web3forms.com/submit");
  assert.equal(await page.isVisible('[data-step="1"] [data-next]'), false, "no Avanti without JS");
  assert.equal(await page.isVisible("[data-submit]"), true);
  assert.match(await page.getAttribute('input[name="redirect"]', "value"), /\/grazie\/$/);
  await ctx.close();
});

await test("contact form: validation and payload", async () => {
  const page = await browser.newPage();
  const sent = await mockWeb3(page);
  await page.goto(`${base}/contatti/`);
  await page.evaluate(() => (document.querySelector("[data-contact-form]").dataset.key = "test-key"));
  await page.click("[data-contact-form] [data-submit]");
  assert.equal(await page.textContent("#err-c-nome"), "Scrivi il tuo nome.");
  await page.fill("#c-nome", "Marco");
  await page.fill("#c-contatto", "marco@esempio.it");
  await page.fill("#c-msg", "Vorrei rifare il sito della mia villa.");
  await page.check("[data-contact-form] input[name=privacy]");
  await Promise.all([page.waitForURL(/\/grazie\/$/), page.click("[data-contact-form] [data-submit]")]);
  assert.equal(sent[0].contatto, "marco@esempio.it");
  assert.equal(sent[0].subject, "Nuovo messaggio dal sito: Marco");
  await page.close();
});

await test("calculator: defaults, recompute, Italian format", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(`${base}/`);
  await page.waitForTimeout(1500);
  assert.equal(await page.textContent("[data-annuo]"), "21.600");
  await page.fill("#calc-valore", "500");
  await page.dispatchEvent("#calc-valore", "input");
  await page.waitForTimeout(100);
  assert.equal(await page.textContent("[data-annuo]"), "3.600");
  assert.equal(await page.textContent("[data-payback]"), "2 lavori");
  await page.close();
});

await test("home without JavaScript: content readable", async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  for (const sel of ["h1", ".hero__main .lead", ".pick__q", ".lens__head", "[data-lens-step]", ".calc__result"]) {
    assert.equal(await page.isVisible(sel), true, `${sel} visible`);
  }
  // The sector chooser works with CSS alone.
  assert.equal(await page.isVisible('[data-path="b-and-b-e-agriturismi"]'), false, "no path before choosing");
  await page.click('label:has(input[value="b-and-b-e-agriturismi"])');
  assert.equal(await page.isVisible('[data-path="b-and-b-e-agriturismi"]'), true, "chosen path shown");
  await ctx.close();
});

await test("mobile menu: opens, traps focus, closes on Escape", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/prezzi/`);
  await page.click("[data-menu-open]");
  assert.equal(await page.isVisible("#menu-mobile"), true);
  assert.equal(await page.getAttribute("[data-menu-open]", "aria-expanded"), "true");
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => !!document.activeElement.closest("#menu-mobile")), true, "focus stays in menu");
  await page.keyboard.press("Escape");
  assert.equal(await page.isVisible("#menu-mobile"), false);
  await page.close();
});

await test("pitch page: 'Non mi interessa' replaces the buttons", async () => {
  const page = await browser.newPage();
  await page.goto(`${base}/anteprime/arcadi-ristrutturazioni-k7q2/`);
  assert.equal(await page.getAttribute('meta[name="robots"]', "content"), "noindex,nofollow");
  await page.click("[data-no]");
  assert.equal(await page.isVisible("[data-buttons]"), false);
  assert.match(await page.textContent("[data-bye]"), /Non ti disturbiamo più/);
  await page.close();
});

await test("demo form: composes a [DEMO] WhatsApp message", async () => {
  const page = await browser.newPage();
  await page.goto(`${base}/lavori/villa-ortensia/demo/`);
  await page.evaluate(() => (window.open = (u) => ((window.__opened = u), null)));
  await page.selectOption('select[name="mese"]', { label: "settembre 2027" });
  await page.selectOption('select[name="invitati"]', { label: "circa 120" });
  await page.check('input[name="budget"][value="fascia media"]', { force: true });
  await page.fill('input[name="nomi"]', "Marco e Sara");
  await page.click(".vo-form button[type=submit]");
  const url = decodeURIComponent(await page.evaluate(() => window.__opened));
  assert.match(url, /\[DEMO\] Richiesta di visita dal sito\. Data evento: settembre 2027\. Invitati: circa 120\. Budget: fascia media\. Nomi: Marco e Sara\./);
  await page.close();
});

await browser.close();
console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
