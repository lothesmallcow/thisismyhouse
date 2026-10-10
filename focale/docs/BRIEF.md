# BRIEF: build the complete Soglia website

You are building the complete production website for **Soglia**, a one-person web studio in Milan run by Lorenzo, a Bocconi University student. Soglia rebuilds websites for small Italian businesses (renovation firms, window fitters, B&Bs and agriturismi, wedding venues) so they get more enquiries. All site content is in Italian. These instructions are in English.

The site must be 100% complete: every page, every state, every legal page, SEO, forms, animations, three demo projects, private pitch pages. The ONLY things allowed to be missing are Lorenzo's personal details and contact details that don't exist yet; those go in as placeholders in one config file (rules below). Never invent personal facts, contact details, clients, reviews, client counts or statistics.

## 0. First actions, before anything else

1. Save this entire message verbatim to `docs/BRIEF.md`. It is the source of truth. Re-read the relevant section before each phase, and always after any context compaction.
2. Create `CLAUDE.md` at the project root containing: a 5-line project summary, the non-negotiables (section 1), the design tokens (section 3), the npm scripts, and the phase checklist (section 12) with checkboxes you tick as you complete phases.
3. Create `TODO-LORENZO.md`: every placeholder, every account Lorenzo must create (Web3Forms, Cloudflare, domain registrar, optional Google Apps Script), and how to fill each. Keep it current until the end.
4. Use the frontend-design skill for all UI work. Use the Playwright MCP for every visual check. If it's unavailable, add Playwright as a dev dependency and write `scripts/screenshot.mjs` instead.
5. Commit to git at the end of every phase with a clear message.

## 1. Non-negotiables

- **Language.** All visible text is Italian and comes from section 5 verbatim. Shorten only to fix a real layout problem, keeping the meaning. No English anywhere in the UI, alt text, meta tags, form errors or ARIA labels.
- **Punctuation.** No em dashes or en dashes used as punctuation in copy; use a colon, comma or full stop. Write number ranges in words ("tra 10 e 20 €"). Italian number format: 3.000 €, 21.600 €.
- **Voice.** First person singular ("io"), because Lorenzo works alone. Never "noi" or "il nostro team" on Soglia's pages. (The demo businesses in section 8 may use "noi": they are fictional companies.)
- **No fake proof.** No testimonials, review stars, client logos, client counts, "trusted by" rows, countdown timers, invented statistics, "più scelto" badges. Visitor counters exist only inside the deliberately bad old-site demo. A `Recensioni` component exists but renders nothing while `site.reviews` is empty.
- **Founders counter** shows `site.foundersSpotsLeft` from config as static text. Never animated.
- **No dark patterns.** No pre-ticked boxes, no guilt-trip opt-outs, no popups of any kind, no exit-intent.
- **Placeholders.** Every unknown personal or contact detail is a string `"[DA COMPILARE: description]"` that lives ONLY in `src/config/site.ts`. Never hard-code them elsewhere. Render them through a helper that adds `data-placeholder`; in dev mode, CSS gives those elements a dashed yellow outline. Provide `npm run check:placeholders` (scans `src/` and `dist/`, prints every remaining placeholder with file and line) and `npm run predeploy` (build, then the check; exits with an error if any remain).
- **Privacy by construction.** No cookies, no localStorage, no sessionStorage. No third-party requests except Web3Forms (only on form submit), the optional Google Apps Script endpoint (only on form submit, only if its env var is set) and Cloudflare Web Analytics (only if its token env var is set). Self-hosted fonts. No Google Fonts CDN, no icon CDN, no YouTube, no Google Maps iframe (link to Google Maps instead).
- **Accessibility.** WCAG 2.2 AA. Visible focus everywhere, skip link "Vai al contenuto", a label on every input, errors announced with `aria-live` and linked with `aria-describedby`, touch targets at least 44px, `lang="it"`, reduced motion fully respected, logical heading order, alt text in Italian.
- **Performance budget** (Lighthouse mobile, simulated throttling): Performance ≥ 90 on every page and ≥ 95 on pages without the renovation section; Accessibility 100; Best Practices ≥ 95; SEO 100 on indexed pages. LCP ≤ 2.0 s, CLS ≤ 0.05. Home page JavaScript ≤ 120 KB gzipped in total; other pages ≤ 40 KB unless they contain the form.
- **Avoid the generic AI look.** Do NOT use: cream backgrounds with terracotta accents; near-black with neon accents; purple or blue gradients; gradient blobs; glassmorphism; grids of identical cards sharing one radius and one soft shadow; all-caps eyebrow labels above headings; middle-dot meta strings ("A · B · C"); arrows appended to every link or button; 01/02/03 markers on anything that isn't a real sequence; emoji as icons; Inter, Roboto, Arial or system fonts as the visible typeface; one word of a headline accented in a different colour or in italic; fade-and-slide-up on every section.

## 2. Stack

- **Astro**, latest stable (requires Node 22+), TypeScript strict, static output.
- **Tailwind CSS**, latest, added with `npx astro add tailwind`. Section 3 tokens become CSS custom properties and Tailwind theme values.
- **GSAP** (`gsap` package; ScrollTrigger, SplitText, Flip and DrawSVGPlugin are all included and free for commercial use) and **Lenis** (`lenis` package).
- **Fonts:** Archivo (variable, wght and wdth axes) and Literata (variable), self-hosted with `@fontsource-variable/archivo` and `@fontsource-variable/literata`. Verify that the Archivo package exposes the wdth axis. If it doesn't, download the variable woff2 files with wdth from the official Google Fonts GitHub repository into `src/assets/fonts/` and declare them with @font-face. Subset to Latin and Latin Extended. Preload the two font files used above the fold. `font-display: swap` with metric-matched fallbacks (size-adjust) to avoid layout shift.
- `@astrojs/sitemap`. `astro:assets` for every image (AVIF and WebP, explicit width and height, lazy below the fold, `fetchpriority="high"` on the LCP image only).
- Social preview images generated at build time with `satori` and `@resvg/resvg-js`, using the self-hosted font files.
- No React, Vue or Svelte. Interactive parts are small vanilla TypeScript modules inside Astro components.
- **Content collections** (Astro content layer with zod schemas): `settori` (3 entries), `lavori` (3), `anteprime` (private pitch pages), `faq`.
- **Hosting target:** Cloudflare Pages, static `dist/`. Do not add Vercel configuration. Add `public/_headers` (section 10) and `public/_redirects` if needed.
- npm scripts: `dev`, `build`, `preview`, `check` (astro check + tsc), `check:placeholders`, `predeploy`, `screens` (screenshot every page at 390, 768 and 1440 into `docs/screens/`), `lighthouse` (runs Lighthouse mobile on every built page via `npx lighthouse` or `unlighthouse`, saves a summary to `docs/lighthouse.md`), `a11y` (axe via `@axe-core/playwright` on every page), `nuova-anteprima` (section 9).

## 3. Design system

**Concept.** A Milanese entrance hall. The site is the "soglia", the threshold where a customer decides to come in or walk on. Materials: ceppo stone floor, green front gate, brass doorbell, the yellow of Milan's trams. Mood: solid, honest, local, quietly confident. Never luxury, never startup.

**Colour tokens**
- `--calce: #F3F4F0` main background
- `--pietra: #DAD8D0` alternate section background, sills, dividers
- `--portone: #1E3A2C` headings, dark sections, the recommended price panel, focus outline on light backgrounds
- `--testo: #23302A` body text
- `--giallo: #F5B700` primary buttons ONLY, plus the CANTIERE sign in the renovation demo. Text on it is `--portone`.
- `--ottone: #A67C2E` thin rules and small icons, sparingly; sills on dark sections
- `--marker: #D7392B` annotations in the renovation demo only
- On `--portone` sections, text is `--calce`.
Check every text and background pair for AA contrast and fix any failure.

**Typography**
- Archivo: headings, navigation, buttons, form labels, numbers. Headlines at weight 750 to 850, width (wdth) 110 to 118, leading 1.02 to 1.08, tracking about -0.01em. The width axis is a design element; the renovation demo animates it.
- Literata: body text. 18px minimum on mobile, 19 to 20px on desktop, line-height 1.6, maximum about 68 characters per line.
- Fluid scale with clamp(): ratio about 1.25 on mobile, 1.333 on desktop. H1 about 40px at 390px wide, up to about 76px on desktop.
- Sentence case everywhere. No all-caps except the CANTIERE sign.

**The sill (`<Soglia />` component), the signature structural element.** A thick horizontal bar, 8px tall on mobile and 12px on desktop, in `--pietra` on light sections and `--ottone` on dark ones. It starts at the container's left edge and runs slightly past the text column on the right, like a stone doorstep. It marks the start of each major section: one per section, never stacked, never decorative.

**Logo.** The wordmark "soglia" in lowercase Archivo, weight 850, wdth 118, sitting on a sill bar that extends to the right beyond the last letter like a step. Inline SVG with the text converted to paths. Variants: on light (portone text, pietra bar) and on dark (calce text, ottone bar). Favicon: a lowercase "s" on the bar. Provide SVG favicon, 32px PNG, 180px apple-touch-icon, 512px maskable icon and `site.webmanifest` (theme_color #1E3A2C, background_color #F3F4F0, name "Soglia").

**Layout.** Left-aligned, one strong column, max width about 1200px, side gutters at least 16px on mobile with no horizontal scroll. Asymmetric two-column layouts on desktop where the content asks for it (hero: text left, phone right). 8px spacing base, generous vertical rhythm. Radii: 0 on sills and sections, 6px on buttons and inputs, 14px on phone frames only. Almost no shadows; the phone mockup alone gets one soft warm shadow.

**Buttons.** Primary: `--giallo` background, `--portone` text, Archivo 700, 52px tall on mobile, presses in on `:active` (scale 0.98). Secondary: transparent, 2px `--portone` border. Text links: underlined, 2px offset, underline thickens on hover. Focus: 3px `--portone` outline with 2px offset; on dark backgrounds, 3px `--giallo`.

**Icons.** One small consistent set drawn as inline SVG, 1.75px strokes: phone, WhatsApp, mail, check, map pin, clock, shield, key, euro, arrow-down (for "scorri"). Use the recognisable WhatsApp glyph shape only on WhatsApp buttons.

**Header.** Logo on the left. On desktop, nav links on the right (Come funziona, Prezzi, Lavori, Chi sono) and a primary button "Anteprima gratuita". On mobile: logo plus a "Menu" button that opens a full-screen `--portone` panel with large links, focus trapped inside, closing on Escape and on link click. The header becomes compact (smaller padding) after 80px of scroll, without layout shift.

**Mobile sticky bar.** Under 768px wide, a bar fixed to the bottom with a primary button "Anteprima gratuita" and a WhatsApp icon button labelled "WhatsApp". Hidden on `/anteprima-gratuita`, `/grazie` and `/anteprime/*`. Respects `env(safe-area-inset-bottom)`. Add bottom padding to the page so it never covers content. It appears after the visitor scrolls past the hero.

**Footer** (on `--portone`, light text):
- Logo (dark variant)
- "Siti web per piccole imprese che vogliono più richieste."
- "Lavoro da Milano, per tutta la Lombardia e online."
- Column "Studio": Come funziona, Prezzi, Lavori, Chi sono, Anteprima gratuita
- Column "Settori": Imprese di ristrutturazione e serramenti, B&B e agriturismi, Location per matrimoni
- Column "Contatti": WhatsApp, telefono, email (from config)
- Column "Legale": Condizioni del servizio, Privacy, Cookie
- Legal line: "© {anno corrente} {site.legalName}. P.IVA {site.vatNumber}. {site.registeredAddress}."
- Last line, small: "Sito costruito da Soglia, ovviamente."

Build a `/styleguide` page (noindex, excluded from the sitemap, not linked) showing tokens, type scale, buttons, sills, form fields in every state, icons, logo variants.

## 4. Site map and configuration

**Pages:** `/`, `/come-funziona`, `/prezzi`, `/lavori`, `/lavori/[slug]`, `/lavori/[slug]/demo`, `/per/[slug]`, `/chi-sono`, `/anteprima-gratuita`, `/contatti`, `/grazie`, `/anteprime/[slug]`, `/condizioni`, `/privacy`, `/cookie`, `/404`, `/styleguide`.

**Not indexed** (`<meta name="robots" content="noindex,nofollow">` and excluded from the sitemap): `/grazie`, `/anteprime/*`, `/lavori/*/demo`, `/styleguide`, `/404`. `robots.txt` allows everything except `/anteprime/` and `/styleguide`, and points to the sitemap.

**`src/config/site.ts`** is the single source for business data:

```ts
export const site = {
  brand: "Soglia",
  url: "[DA COMPILARE: dominio definitivo, es. https://www.sogliastudio.it]",
  ownerFirstName: "[DA COMPILARE: nome]",
  ownerFullName: "[DA COMPILARE: nome e cognome]",
  ownerAge: "[DA COMPILARE: età]",
  legalName: "[DA COMPILARE: nome e cognome o ragione sociale]",
  vatNumber: "[DA COMPILARE: partita IVA]",
  taxCode: "[DA COMPILARE: codice fiscale]",
  registeredAddress: "[DA COMPILARE: indirizzo della sede]",
  email: "[DA COMPILARE: email di contatto]",
  phoneDisplay: "[DA COMPILARE: telefono, es. 333 123 4567]",
  phoneE164: "[DA COMPILARE: telefono in formato +39...]",
  whatsappNumber: "[DA COMPILARE: numero WhatsApp senza + e spazi, es. 393331234567]",
  pec: "[DA COMPILARE: PEC, se presente]",
  photo: null as null | string, // "[DA COMPILARE: foto in src/assets/chi-sono.jpg]"
  vatNote: "[DA COMPILARE: nota IVA concordata con il commercialista]",
  jurisdiction: "Milano",
  foundersSpotsTotal: 5,
  foundersSpotsLeft: 5,
  prices: {
    essenziale: { founders: 390, standard: 590 },
    professionale: { founders: 690, standard: 990 },
    suMisura: { founders: 1190, standard: 1690 },
    cura: 35,
  },
  previewHours: 72,
  deliveryDays: { essenziale: 7, professionale: 10 },
  depositPercent: 30,
  revisionRounds: 2,
  careResponseHours: 48,
  domainCostRange: "tra 10 e 20 € l'anno",
  reviews: [] as { author: string; text: string; source: string; url: string }[],
  web3formsKey: import.meta.env.PUBLIC_WEB3FORMS_KEY ?? "",
  sheetsEndpoint: import.meta.env.PUBLIC_SHEETS_ENDPOINT ?? "",
  cfBeaconToken: import.meta.env.PUBLIC_CF_BEACON_TOKEN ?? "",
  legalLastUpdated: "[DA COMPILARE: data ultimo aggiornamento dei documenti legali]",
};
```

Add `.env.example` with the three `PUBLIC_` variables and an English comment for each. Every price, number of days and percentage shown on the site must be read from this config, never typed into pages.

**WhatsApp links:** `https://wa.me/{whatsappNumber}?text={encodeURIComponent(message)}`. Prefilled messages are given in section 5 per page. Open in a new tab with `rel="noopener"`.

## 5. Content (Italian, use verbatim)

Notation: `[Button]` is a button or link; `{…}` is a value from config or a computed value. Each page lists its `<title>` and meta description.

### 5.1 Home `/`

Title: `Soglia | Siti web che portano richieste, per piccole imprese`
Description: `Rifaccio il sito della tua attività perché si legga bene dal telefono e porti più richieste. Anteprima gratuita in 72 ore, saldo solo a sito approvato.`

**Hero**
- H1: Chi apre il tuo sito decide in un attimo se chiamarti.
- Paragraph: Rifaccio i siti delle piccole imprese perché portino richieste vere: si leggono bene dal telefono, si aprono in fretta e hanno un pulsante per chiamarti o scriverti su WhatsApp. Prima di spendere un euro, vedi l'anteprima del tuo nuovo sito.
- [Voglio l'anteprima gratuita] → /anteprima-gratuita
- [Guarda come funziona] → scrolls to the renovation section
- Small text under buttons: Pronta in {previewHours} ore. Nessun impegno, nessun pagamento anticipato.
- Three short reassurance items, each with an icon: "Parli sempre con me, non con un centralino." / "Saldo solo a sito approvato." / "Il sito, il dominio e gli accessi sono tuoi."
- Right side (below on mobile): an HTML/CSS phone mockup showing a miniature of the Arcadi Ristrutturazioni demo homepage (section 8). Over the phone screen, a WhatsApp-style notification card: bold "Nuova richiesta di preventivo", then "Bagno completo, zona Città Studi. Vorrebbero iniziare a marzo." Caption under the phone, small: "Attività di esempio".

**Problema**
- H2: Ogni giorno qualcuno cerca quello che fai. Poi apre il tuo sito.
- Three short scenes, as a list, each with a small line illustration or icon:
  1. Lo apre dal telefono. Deve allargare il testo con due dita per leggerlo. Torna indietro e chiama il secondo risultato.
  2. Cerca un numero da chiamare. In alto non c'è. Lascia perdere.
  3. In fondo alla pagina legge © 2014. Pensa che abbiate chiuso.
- Closing line, larger: Tu non te ne accorgi, perché chi se ne va non ti avvisa.

**La ristrutturazione** (signature section, animation spec in section 7)
- H2: Guarda un sito vecchio diventare uno che lavora.
- Intro: Scorri piano. L'attività è inventata, ma i difetti sono quelli che trovo ogni giorno.
- Old site content (deliberately bad, inside a desktop frame): title bar "IMPRESA EDILE ARCADI s.n.c."; heading "Benvenuti nel nostro sito!!!"; paragraph "Siamo un'azienda leader nel settore delle ristrutturazioni con pluriennale esperienza. Professionalità, serietà e cortesia sono i nostri punti di forza."; link "Clicca qui per vedere i nostri lavori"; a small pixelated photo; "Sei il visitatore n° 004381"; footer "© 2011 Tutti i diritti riservati. Sito ottimizzato per Internet Explorer a 1024x768".
- Five annotations in marker red, numbered (this IS a sequence): 1 "Dal telefono non si legge" · 2 "Nessun numero in vista" · 3 "Foto sgranate, nessun lavoro vero" · 4 "© 2011: sembra un'attività chiusa" · 5 "\"Leader nel settore\" non dice niente" (display each on its own; do not join them with dots on the page).
- CANTIERE sign text: "CANTIERE" with small line "Lavori in corso sul tuo sito".
- New site (inside a phone frame): the Arcadi Ristrutturazioni demo hero (section 8).
- Checklist that ticks in at the end: "Si legge da qualsiasi telefono" / "Chiamata o WhatsApp con un tocco" / "Foto dei lavori veri, prima e dopo" / "Le richieste arrivano già ordinate" / "Si vede che l'attività è viva"
- [Voglio vedere il mio sito così] → /anteprima-gratuita
- Visually hidden summary for screen readers: "Esempio dimostrativo: un sito vecchio, difficile da leggere dal telefono e senza contatti in vista, viene rifatto in un sito moderno con pulsanti per chiamare e scrivere su WhatsApp, foto dei lavori e informazioni aggiornate."

**Calcolatore**
- H2: Quanto vale una richiesta in più al mese?
- Intro: Metti i tuoi numeri. Il calcolo lo fai tu.
- Field 1, number input with € prefix: "Quanto vale in media un tuo lavoro?" default 3000, min 100, max 200000, step 100. Hint: "Il valore medio di un lavoro che ti affidano, in euro."
- Field 2, slider 1 to 10 with visible value: "Su 10 preventivi, quanti diventano lavori?" default 3.
- Field 3, slider 1 to 10 with visible value: "Quante richieste in più al mese ti aspetti da un sito migliore?" default 2.
- Output, large: "In un anno sono circa {annuo} € di lavori in più." where annuo = richieste × 12 × (tasso / 10) × valore, rounded to the nearest 100, Italian format.
- Output, second line: if prices.professionale.standard ≤ valore: "Il sito Professionale costa {prezzo} €: si ripaga con meno di un lavoro." else: "Il sito Professionale costa {prezzo} €: si ripaga con {n} lavori." where n = ceil(prezzo / valore). Use the standard price, not the founder price.
- Note, small: È una stima fatta con i tuoi numeri, non una promessa. Nessuno può garantirti quante richieste arriveranno. Io posso garantirti un sito fatto per non perderle.

**Come funziona** (a real sequence, numbering allowed)
- H2: Quattro passi. Il primo è gratis.
- 1. Mi racconti la tua attività. / Dieci minuti al telefono o su WhatsApp: cosa fai, per chi, dove.
- 2. Ricevi l'anteprima gratuita. / Entro {previewHours} ore ti mando la homepage del tuo nuovo sito, con il tuo nome e i tuoi servizi. La guardi dal telefono, con calma.
- 3. Se ti convince, partiamo. / Mi versi un acconto del {depositPercent}%. In {deliveryDays.professionale} giorni lavorativi dall'arrivo di foto e informazioni, il sito è pronto.
- 4. Paghi il saldo solo a sito approvato. / Lo provi, chiedi le modifiche, lo approvi. Solo allora paghi il resto e lo mettiamo online.
- [Tutti i dettagli] → /come-funziona

**Garanzia** (on a `--portone` section)
- H2: Il rischio me lo prendo io.
- Paragraph: L'anteprima è gratuita. Se non ti piace, finisce lì: non mi devi niente e non ti richiamo dieci volte. Se ti piace e partiamo, il saldo lo paghi solo dopo aver approvato il sito finito.
- Small: {revisionRounds} giri di modifiche inclusi. Le condizioni sono scritte, chiare e senza asterischi. [Leggi le condizioni] → /condizioni

**Cosa c'è dentro**
- H2: Cosa trovi nel tuo nuovo sito
- Layout: a two-column list with icons, NOT a card grid.
- Si legge bene da ogni telefono. / Testi grandi, pulsanti comodi, niente zoom.
- Ti chiamano con un tocco. / Telefono e WhatsApp sempre a portata di pollice.
- Le richieste arrivano già ordinate. / Chi compila il modulo ti scrive su WhatsApp con un messaggio pronto: cosa serve, dove, quando. E tu ricevi anche una copia via email.
- Ti trovano su Google. / Pagine scritte per le ricerche della tua zona, scheda Google collegata.
- Si apre in fretta. / Punteggio di velocità sopra 90 su PageSpeed di Google, da telefono. Te lo mostro prima di consegnare.
- In regola. / Privacy, cookie e dati aziendali a posto, senza banner inutili.
- È tuo. / Dominio, codice e accessi intestati a te. Se un giorno vuoi cambiare, porti via tutto.

**Fondatori** (section `id="fondatori"`, linked from the prices page)
- H2: Cerco i primi {foundersSpotsTotal} clienti.
- Paragraph: Sto avviando Soglia e voglio cinque lavori fatti benissimo da mostrare. Per questo ai primi cinque faccio un prezzo fondatori. In cambio ti chiedo due cose: il permesso di mostrare il tuo sito tra i miei lavori, con il nome della tua attività, e di poterti indicare come referenza a chi me lo chiede.
- Large static line: Posti fondatori ancora liberi: {foundersSpotsLeft} su {foundersSpotsTotal}
- Small: Quando i cinque posti sono presi, il programma finisce. Il numero qui sopra lo aggiorno a mano ed è quello vero.
- [Prenota un posto fondatori] → /anteprima-gratuita?fondatori=1
- When foundersSpotsLeft is 0, replace the whole section with: H2 "Il programma fondatori è chiuso." / "Grazie ai primi cinque clienti. Da qui in poi valgono i prezzi standard." and hide founder prices site-wide (prices page shows only standard prices).

**Prezzi (riassunto)**
- H2: Prezzi chiari, scritti qui.
- Intro: Molte agenzie scrivono "preventivo su richiesta". Io preferisco che tu sappia subito quanto spendi.
- Compact version of the three plans (name, one-line "per chi", founder price and standard price) and the Cura plan line. The recommended plan sits on a `--portone` panel; the others on `--pietra`. Not three identical cards.
- [Confronta tutto nella pagina prezzi] → /prezzi

**Perché uno studente**
- H2: Perché affidarti a uno studente?
- Paragraph: Domanda giusta. Ho {ownerAge} anni, studio Economia all'Università Bocconi e non ho un'agenzia con quaranta persone. Per te significa tre cose.
- Rispondi a me. / Niente commerciali, niente centralino: chi ti scrive è chi costruisce il sito.
- Costo meno, senza fare peggio. / Uso strumenti di intelligenza artificiale per lavorare più in fretta. Il progetto, i testi e il controllo finale li faccio io, uno per uno.
- Ho tutto da dimostrare. / Ogni sito è il mio biglietto da visita: non posso permettermi di farne uno mediocre.
- Photo slot: `site.photo` if set; otherwise a tasteful neutral placeholder (a sill bar with the initial of ownerFirstName) marked with data-placeholder.
- [Chi sono] → /chi-sono

**Domande** (the six FAQ entries marked `home: true`, accordion, with FAQPage structured data)
- [Tutte le domande] → /come-funziona#domande

**Chiusura**
- H2: Guarda il tuo nuovo sito prima di decidere.
- Paragraph: Ti mando l'anteprima in {previewHours} ore. Se non ti convince, non mi devi niente.
- [Voglio l'anteprima gratuita] → /anteprima-gratuita
- [Scrivimi su WhatsApp] → WhatsApp with message: "Ciao, ho visto il sito di Soglia e vorrei l'anteprima gratuita per la mia attività."

### 5.2 FAQ collection (`src/content/faq/`)

Each entry: question, answer, `home` (boolean), `order`.

1. (home) Ci sono costi nascosti? / No. Il prezzo è quello scritto. A parte c'è solo il dominio, {domainCostRange}, intestato a te. Con il piano Cura è compreso.
2. (home) Il sito resta mio? / Sì. Dominio, codice e accessi sono intestati a te. Se un giorno vuoi cambiare fornitore, ti consegno tutto.
3. (home) E se tra un anno sparisci? / Il sito continua a funzionare anche senza di me: è su un servizio affidabile e il codice è tuo. Qualsiasi sviluppatore può prenderlo in mano.
4. (home) Devo scrivere io i testi? / No. Li scrivo io dopo la nostra chiacchierata, tu li correggi. Mi servono solo le foto dei tuoi lavori, anche fatte con il telefono.
5. (home) Quanto ci vuole? / L'anteprima arriva entro {previewHours} ore. Il sito completo in {deliveryDays.professionale} giorni lavorativi da quando ho foto e informazioni ({deliveryDays.essenziale} per il pacchetto Essenziale).
6. (home) Come si paga? / Con bonifico: {depositPercent}% quando partiamo, il saldo dopo l'approvazione. Il piano Cura si paga ogni mese e si disdice quando vuoi.
7. Posso modificarlo da solo? / Con il piano Cura le modifiche le faccio io entro {careResponseHours} ore lavorative. Se vuoi cambiare testi e foto in autonomia, il pacchetto Su misura include un pannello semplice per farlo.
8. Lavori anche fuori Milano? / Sì: in tutta la Lombardia anche di persona, ovunque online.
9. Fai anche pubblicità, social o e-commerce? / No. Faccio una cosa sola e la faccio bene: siti che portano richieste. Se ti serve altro, ti dico onestamente a chi rivolgerti.
10. Perché costi meno di un'agenzia? / Perché lavoro da solo, senza uffici né commerciali, e uso l'intelligenza artificiale per le parti ripetitive. Il tempo che risparmio lo metto nei dettagli.
11. Cosa succede se non approvo il sito finito? / Lo sistemo: {revisionRounds} giri di modifiche sono inclusi. Se dopo i due giri non sei soddisfatto, trattengo solo l'acconto e il saldo non lo paghi.
12. Mi servono foto nuove? / Non sempre. Le foto dei lavori fatte col telefono vanno benissimo se sono nitide e con buona luce: ti mando una guida di una pagina su come farle. Per le immagini generiche uso foto libere da diritti.
13. Ho già un sito: devo buttarlo? / No. Tengo quello che funziona, come dominio, email e testi buoni, e rifaccio il resto. Le tue email restano dove sono.
14. Comparirò primo su Google? / Nessuno onesto può promettertelo. Ti garantisco pagine scritte bene per le ricerche della tua zona, un sito veloce e la scheda Google collegata: sono le basi che contano.
15. Posso passare da Essenziale a Professionale più avanti? / Sì: paghi solo la differenza, ai prezzi in vigore in quel momento.
16. Il piano Cura è obbligatorio? / No. Se non lo prendi, il sito è tuo e lo gestisci come vuoi. Te lo consiglio se non vuoi pensare a rinnovi, modifiche e controlli.

### 5.3 Come funziona `/come-funziona`

Title: `Come funziona | Soglia`
Description: `Quattro passi dal primo messaggio al sito online. Anteprima gratuita, acconto del 30%, saldo solo dopo la tua approvazione.`

- H1: Come funziona
- Lead: Dal primo messaggio al sito online in quattro passi. Il primo è gratis, e il saldo lo paghi solo quando il sito ti convince.
- Steps (numbered, with the scroll-drawn line, section 7 A4):
  1. Mi racconti la tua attività. / Dieci minuti al telefono o su WhatsApp. Mi dici cosa fai, per chi lavori, in che zona e cosa vorresti che il sito facesse per te. Se hai già un sito, gli do un'occhiata prima di sentirci.
  2. Ricevi l'anteprima gratuita. / Entro {previewHours} ore ti mando la homepage del tuo nuovo sito, con il tuo nome, i tuoi servizi e le foto che trovo sulla tua scheda Google o che mi mandi tu. È privata: la vedi solo tu, da un link.
  3. Se ti convince, partiamo. / Ti mando un preventivo scritto con il pacchetto scelto. Mi versi un acconto del {depositPercent}% e mi mandi foto e informazioni. Da quel giorno il sito è pronto in {deliveryDays.essenziale} o {deliveryDays.professionale} giorni lavorativi, secondo il pacchetto.
  4. Approvi, paghi il saldo, va online. / Lo provi dal tuo telefono e chiedi le modifiche: {revisionRounds} giri sono inclusi. Quando lo approvi, paghi il saldo e lo metto online sul tuo dominio.
- H2: Cosa mi serve da te
  - Il nome dell'attività e cosa fai, in parole tue
  - La zona in cui lavori
  - Telefono, WhatsApp ed email da mostrare sul sito
  - Il logo, se ce l'hai. Se non ce l'hai, scrivo il nome in modo pulito
  - Da 10 a 30 foto dei tuoi lavori, anche fatte col telefono
  - Gli accessi al dominio, se ne hai già uno. Ti spiego io dove trovarli
- H2: Cosa ricevi
  - Il sito online sul tuo dominio
  - Un messaggio di prova, per vedere come ti arrivano le richieste
  - La scheda Google collegata al sito
  - Un documento di una pagina con tutti gli accessi, intestati a te
  - Il punteggio di velocità di Google, misurato davanti a te
- H2: La garanzia / same paragraph as the home Garanzia section, plus [Leggi le condizioni complete] → /condizioni
- H2 with id `domande`: Tutte le domande / all FAQ entries in order, accordion, FAQPage structured data.
- Closing block: same as home "Chiusura".

### 5.4 Prezzi `/prezzi`

Title: `Prezzi dei siti web per piccole imprese | Soglia`
Description: `Prezzi chiari e scritti: Essenziale, Professionale, Su misura e il piano Cura mensile. Prezzo fondatori per i primi 5 clienti.`

- H1: Quanto costa un sito che porta richieste.
- Lead: Prezzi finali, scritti qui. Paghi il {depositPercent}% quando partiamo e il resto solo a sito approvato.
- Founders banner (only while spots remain): Prezzo fondatori per i primi {foundersSpotsTotal} clienti. Posti ancora liberi: {foundersSpotsLeft} su {foundersSpotsTotal}. [Come funziona il programma] → /#fondatori
- Each plan shows two clearly labelled prices: "Prezzo fondatori" (large, while spots remain) and "Dal sesto cliente" (smaller). Never a struck-through price. Never the words "sconto" or "offerta".
- Plans (recommended one on a `--portone` panel with the label "Consigliato"):
  - **Essenziale** / Per chi oggi ha solo Instagram o Google Maps. / {founders} € / {standard} € / Includes: Sito a pagina unica, fino a 6 sezioni; Testi scritti da me; Pulsanti per chiamarti e scriverti su WhatsApp; Modulo contatti che ti scrive su WhatsApp e via email; Mappa e collegamento alla tua scheda Google; Privacy e cookie in regola; Online in {deliveryDays.essenziale} giorni lavorativi. / [Voglio l'anteprima gratuita] → /anteprima-gratuita?pacchetto=essenziale
  - **Professionale** (Consigliato) / Il sito completo per farti scegliere. / {founders} € / {standard} € / Includes: Tutto l'Essenziale, più: Fino a 6 pagine; Una pagina per ogni servizio, scritta per le ricerche della tua zona; Galleria dei lavori con prima e dopo; Modulo preventivo guidato in 3 passi; Richieste salvate anche in un foglio Google; Le tue recensioni Google mostrate sul sito; Online in {deliveryDays.professionale} giorni lavorativi. / [Voglio l'anteprima gratuita] → ?pacchetto=professionale
  - **Su misura** / Per chi ha esigenze in più. / da {founders} € / da {standard} € / Includes: Tutto il Professionale, più: Richieste di disponibilità o prenotazioni; Più lingue; Un pannello per modificare testi e foto da solo; Pagine in più; Tempi concordati insieme. / [Voglio l'anteprima gratuita] → ?pacchetto=su-misura
- Cura plan, a wide band below: **Cura** / Il sito sempre in ordine, senza pensarci. / {cura} € al mese / Dominio e hosting gestiti da me; Fino a 2 modifiche al mese entro {careResponseHours} ore lavorative; Un controllo ogni mese che tutto funzioni; Copie di sicurezza; Disdici quando vuoi, con un messaggio.
- H2: Compreso in tutti i pacchetti / Testi scritti da me; {revisionRounds} giri di modifiche; Privacy e cookie in regola; Dominio e accessi intestati a te; Punteggio di velocità sopra 90 da telefono; Una breve videochiamata per mostrarti come funziona tutto.
- H2: Costi a parte / Il dominio, {domainCostRange}, intestato a te. Con il piano Cura è compreso. Nient'altro.
- Small: {vatNote}
- FAQ (accordion): entries 10, 11, 15, 16.
- Closing block as on home.

### 5.5 Lavori `/lavori` and case pages `/lavori/[slug]`

Title: `Lavori | Soglia`
Description: `Tre siti dimostrativi completi: un'impresa di ristrutturazioni, un agriturismo e una location per matrimoni.`

- H1: Lavori
- Lead: Soglia è appena nata. Per farti vedere come lavoro, ho costruito tre siti completi per attività inventate, nei settori dove il sito conta di più. Appena i primi clienti mi danno il permesso, i loro lavori veri compaiono qui.
- One large entry per demo: a real screenshot of the built demo (generated with Playwright at build-prep time, phone and desktop, stored in `src/assets/lavori/`), name, sector, one-line goal, the label "Progetto dimostrativo per un'attività inventata", [Leggi il progetto] → /lavori/[slug], [Apri il sito] → /lavori/[slug]/demo (new tab).

`lavori` collection entries:

1. slug `arcadi-ristrutturazioni` / Arcadi Ristrutturazioni / Impresa di ristrutturazioni, Milano / Obiettivo: più richieste di preventivo da chi cerca dal telefono. / I problemi tipici del settore: foto dei lavori assenti o sparse; nessun modo rapido per chiedere un preventivo; servizi elencati in una riga, invisibili su Google. / Le scelte: una galleria prima e dopo per ogni lavoro; una pagina per servizio, ciascuna con la zona; un preventivo guidato che chiede tipo di lavoro, metratura e tempi; il pulsante per chiamare sempre visibile da telefono. / Cosa ottiene l'impresa: richieste già ordinate su WhatsApp, meno telefonate a vuoto, un sito che sembra all'altezza dei lavori che fa.
2. slug `cascina-rovere` / Cascina Rovere / Agriturismo con camere, Brianza / Obiettivo: più prenotazioni dirette, meno commissioni ai portali. / Problemi tipici: foto vecchie o piccole; disponibilità e prezzi introvabili; nessuna versione in inglese. / Scelte: camere con foto grandi; richiesta di disponibilità con date e ospiti; italiano e inglese; come arrivare e cosa fare nei dintorni. / Cosa ottiene: richieste di disponibilità su WhatsApp con date, ospiti e lingua; ospiti che tornano e prenotano direttamente.
3. slug `villa-ortensia` / Villa Ortensia / Location per matrimoni, Lago di Como / Obiettivo: richieste di visita da coppie già orientate sul budget. / Problemi tipici: gallerie pesanti che dal telefono non si aprono; nessuna idea dei costi, quindi richieste fuori budget; moduli lunghissimi. / Scelte: gallerie leggere per spazio e stagione; fasce di prezzo indicative; richiesta di visita con data, invitati e budget. / Cosa ottiene: meno richieste fuori target, visite con coppie già interessate.

Case page layout: H1 name; sector and area; "Progetto dimostrativo per un'attività inventata"; sections "Obiettivo", "I problemi tipici del settore", "Le scelte", "Cosa ottiene l'attività"; phone and desktop screenshots; [Apri il sito dimostrativo]; closing CTA "Vuoi un sito così per la tua attività?" [Voglio l'anteprima gratuita]. Case-page titles: `{Nome}: progetto dimostrativo | Soglia`.

### 5.6 Sector pages `/per/[slug]` (`settori` collection)

Common layout: H1, lead, H2 "I problemi che vedo più spesso" (three items), H2 "Cosa costruisco per te" (list), H2 "Come ti arrivano le richieste" (paragraph plus a mock WhatsApp message rendered in HTML), link to the matching demo, two FAQ, closing CTA [Voglio l'anteprima gratuita] → /anteprima-gratuita?settore={slug} and a WhatsApp button with the sector message.

1. slug `ristrutturazioni-e-serramenti`
   - Title: `Siti web per imprese di ristrutturazione e serramentisti a Milano | Soglia`
   - Description: `Siti che portano richieste di preventivo: galleria prima e dopo, preventivo guidato, richieste su WhatsApp. Anteprima gratuita in 72 ore.`
   - H1: Siti per imprese di ristrutturazione e serramentisti a Milano
   - Lead: Chi deve rifare il bagno confronta tre imprese dal telefono, la sera. Sceglie quella che sembra più seria e più facile da contattare.
   - Problemi: Le foto dei lavori non ci sono, o sono sparse e piccole. / Per chiedere un preventivo bisogna cercare un numero o un'email. / I servizi sono elencati in una riga, quindi Google non sa che fai bagni, cucine o infissi.
   - Costruisco: Una galleria prima e dopo per ogni lavoro / Una pagina per ogni servizio, con la tua zona / Un preventivo guidato che chiede tipo di lavoro, metratura e tempi / Il pulsante per chiamarti sempre visibile da telefono
   - Richieste: La richiesta ti arriva su WhatsApp già completa: tipo di lavoro, zona, metratura indicativa, quando vorrebbero iniziare. Mock message: "Richiesta di preventivo dal sito. Lavoro: bagno completo. Zona: Città Studi. Metratura: circa 6 mq. Inizio: entro 3 mesi. Nome: Giulia."
   - Demo link: Arcadi Ristrutturazioni.
   - FAQ: Ho poche foto, va bene? / Sì. Ti spiego come farle col telefono in cantiere: bastano dieci minuti e un po' di luce. // Lavoro solo su passaparola, mi serve un sito? / Anche chi arriva dal passaparola ti cerca su Google prima di chiamarti. Il sito conferma che sei bravo come gli hanno detto.
   - WhatsApp message: "Ciao, ho un'impresa di ristrutturazioni e vorrei l'anteprima gratuita del mio nuovo sito."
2. slug `b-and-b-e-agriturismi`
   - Title: `Siti web per B&B e agriturismi in Lombardia | Soglia`
   - Description: `Più prenotazioni dirette: foto grandi, richieste di disponibilità su WhatsApp, versione in inglese. Anteprima gratuita in 72 ore.`
   - H1: Siti per B&B, agriturismi e piccoli hotel in Lombardia
   - Lead: Ogni prenotazione diretta è una commissione in meno ai portali. Ma l'ospite prenota da te solo se il tuo sito gli dà fiducia.
   - Problemi: Foto vecchie o piccole, che non rendono giustizia alle camere. / Disponibilità e prezzi introvabili, quindi l'ospite torna sul portale. / Niente versione in inglese per gli stranieri.
   - Costruisco: Camere con foto grandi e dettagli chiari / Una richiesta di disponibilità con date e numero di ospiti / Italiano e inglese / Come arrivare e cosa fare nei dintorni
   - Richieste: Le richieste di disponibilità ti arrivano su WhatsApp con date, numero di ospiti e lingua. Mock message: "Richiesta di disponibilità dal sito. Arrivo: 14 maggio. Partenza: 17 maggio. Ospiti: 2 adulti. Lingua: inglese. Nome: Anna."
   - Demo link: Cascina Rovere.
   - FAQ: Uso già i portali di prenotazione, perché un sito? / I portali ti portano ospiti nuovi. Il sito serve a chi ti ha già trovato, ti cerca per nome o torna una seconda volta: se prenota da te, non paghi commissioni. // Si collega al mio channel manager? / Spesso sì, dipende dal sistema che usi. Lo verifico gratis prima di partire.
   - WhatsApp message: "Ciao, ho un B&B o agriturismo e vorrei l'anteprima gratuita del mio nuovo sito."
3. slug `location-per-matrimoni`
   - Title: `Siti web per location di matrimoni ed eventi | Soglia`
   - Description: `Gallerie veloci, fasce di prezzo indicative e richieste di visita già ordinate. Anteprima gratuita in 72 ore.`
   - H1: Siti per location di matrimoni ed eventi
   - Lead: Una coppia guarda decine di location prima di chiederne tre. Se il sito non è all'altezza della villa, la villa non entra nella lista.
   - Problemi: Gallerie pesanti che dal telefono non si aprono. / Nessuna idea dei costi, quindi richieste fuori budget. / Moduli che chiedono tutto e non portano a niente.
   - Costruisco: Gallerie veloci divise per spazi e stagioni / Fasce di prezzo indicative, che filtrano chi non è in target / Una richiesta di visita con data, numero di invitati e budget
   - Richieste: Le richieste di visita arrivano già ordinate: data dell'evento, invitati, budget indicativo. Mock message: "Richiesta di visita dal sito. Data evento: settembre 2027. Invitati: circa 120. Budget: fascia media. Nomi: Marco e Sara."
   - Demo link: Villa Ortensia.
   - FAQ: Devo pubblicare i prezzi? / Non per forza. Bastano fasce indicative: chi ti scrive sa già di essere nel budget, e tu perdi meno tempo. // Mi serve un fotografo? / Uso le tue foto migliori. Se servono foto nuove, ti aiuto a capire quali e come organizzarle.
   - WhatsApp message: "Ciao, ho una location per eventi e vorrei l'anteprima gratuita del mio nuovo sito."

### 5.7 Chi sono `/chi-sono`

Title: `Chi sono | Soglia`
Description: `Chi c'è dietro Soglia, perché lavoro da solo e come lavoro.`

- H1: Ciao, sono {ownerFirstName}.
- Photo slot (same rule as home).
- Paragraph: Ho {ownerAge} anni e studio International Economics and Finance all'Università Bocconi. Prima di Soglia ho costruito da solo un videogioco su Roblox con il mio studio, Damalis: dal codice all'economia del gioco, tutto da zero. Lì ho imparato una cosa che vale anche per i siti: le persone decidono in pochi secondi se restare.
- Paragraph: Da quattro anni alleno una squadra di ragazzi a calcio. Mi ha insegnato a spiegare le cose in modo semplice, che è metà del mio lavoro.
- (Mark the two paragraphs above with a code comment `<!-- DA CONFERMARE: Lorenzo può modificarli o toglierli -->` and list them in TODO-LORENZO.md.)
- H2: Perché "Soglia" / La soglia è il punto in cui un cliente decide se entrare o tirare dritto. Oggi quella soglia è il tuo sito. Il mio lavoro è fare in modo che entri.
- H2: Come lavoro / Prezzi scritti. Tempi scritti. Niente gergo tecnico. Rispondo entro la giornata lavorativa, dal lunedì al venerdì.
- H2: Cosa non faccio / Non faccio pubblicità a pagamento, social o negozi online. Faccio una cosa sola: siti che portano richieste. Se ti serve altro, ti dico a chi rivolgerti.
- Closing block as on home.

### 5.8 Anteprima gratuita `/anteprima-gratuita`

Title: `Anteprima gratuita del tuo nuovo sito | Soglia`
Description: `Tre domande e in 72 ore ricevi la homepage del tuo nuovo sito. Nessun impegno, nessun pagamento anticipato.`

- H1: Ricevi l'anteprima del tuo nuovo sito. Gratis, in {previewHours} ore.
- Lead: Tre domande veloci. Poi ti scrivo io.
- Progress label: "Passo {n} di 3" plus a progress bar.
- Step 1, legend "Che attività hai?": large tappable options (radio buttons styled as tiles): Ristrutturazioni / Serramenti e infissi / B&B o agriturismo / Location per eventi / Altro (reveals a text field "Dimmi in due parole cosa fai"). Selecting an option advances automatically after 250 ms (and a [Avanti] button exists for keyboard users). Preselect from `?settore=`.
- Step 2, legend "Hai già un sito?": Sì (reveals URL field "Indirizzo del sito", placeholder "es. www.lamiaattivita.it") / No, ho solo i social o la scheda Google / No, niente. [Indietro] [Avanti]
- Step 3, legend "Come ti contatto?": Nome (required) / Nome dell'attività (required) / Telefono, anche WhatsApp (required, Italian number validation) / Email (optional) / Comune o zona (required) / Quando preferisci essere contattato? Mattina, Pomeriggio, Sera (radio, optional) / Hidden fields: pacchetto (from `?pacchetto=`), fondatori (from `?fondatori=1`), pagina di provenienza. / Honeypot field named `botcheck`, visually hidden and excluded from tab order. / Checkbox, NOT pre-ticked, required: "Ho letto l'[informativa privacy](/privacy) e accetto di essere ricontattato per questa richiesta."
- Submit button: Mandami l'anteprima
- Under the button: Niente newsletter, niente spam. I tuoi dati li uso solo io, solo per risponderti.
- Error messages: "Scegli un'opzione per continuare." / "Scrivi il tuo nome." / "Scrivi il nome della tua attività." / "Scrivi un numero di telefono valido, ad esempio 333 123 4567." / "Scrivi un indirizzo email valido, oppure lascia il campo vuoto." / "Scrivi il comune o la zona in cui lavori." / "Per inviarmi la richiesta devi accettare l'informativa privacy." / Network failure: "Non sono riuscito a inviare la richiesta. Riprova, oppure mandamela su WhatsApp: il messaggio è già pronto." plus a WhatsApp button whose prefilled text contains all the answers.
- Sending state on the button: "Invio in corso..." (disabled).
- Without JavaScript, all three steps show stacked as one normal form that posts to Web3Forms with a redirect to /grazie.

### 5.9 Grazie `/grazie`

Title: `Richiesta ricevuta | Soglia`

- H1: Ricevuto. Ti scrivo entro la prossima giornata lavorativa.
- H2: Cosa succede adesso (numbered):
  1. Guardo il tuo sito attuale, se c'è, e la tua scheda Google.
  2. Ti scrivo per farti due o tre domande.
  3. Entro {previewHours} ore ricevi l'anteprima.
- Paragraph: Nel frattempo, se vuoi, mandami su WhatsApp due o tre foto dei tuoi lavori migliori. L'anteprima verrà più vera.
- [Mandami le foto su WhatsApp] → WhatsApp with message "Ciao, ho appena chiesto l'anteprima sul sito. Ti mando qualche foto dei miei lavori."
- [Torna alla home]

### 5.10 Contatti `/contatti`

Title: `Contatti | Soglia`
Description: `Scrivimi su WhatsApp, chiamami o mandami un'email. Rispondo io, entro la giornata lavorativa.`

- H1: Scrivimi. Rispondo io.
- Lead: Rispondo entro la giornata lavorativa, dal lunedì al venerdì. Lavoro da Milano, in tutta la Lombardia di persona e ovunque online.
- Three large contact rows: WhatsApp [Scrivimi su WhatsApp] (message: "Ciao, ti scrivo dal sito di Soglia.") / Telefono {phoneDisplay} as a tel: link / Email {email} as a mailto: link
- H2: Preferisci un messaggio? / Short form: Nome, Telefono o email, Messaggio, privacy checkbox (not pre-ticked), honeypot, button "Invia il messaggio". Same Web3Forms backend and errors as 5.8.
- Note: Se vuoi l'anteprima gratuita, fai prima da qui: [Voglio l'anteprima gratuita]

### 5.11 Pagina non trovata `/404`

- H1: Questa pagina è in ristrutturazione.
- Paragraph: Succede anche ai siti migliori. Torna alla home o guarda come funziona.
- Small CANTIERE sign illustration reusing the demo sign component.
- [Torna alla home] [Come funziona]

### 5.12 Condizioni del servizio `/condizioni`

Title: `Condizioni del servizio | Soglia`. Use this text, with config values:

> **Condizioni del servizio**
> Ultimo aggiornamento: {legalLastUpdated}
>
> Queste condizioni valgono per i siti web che realizzo con il nome Soglia. Le ho scritte in modo semplice: se qualcosa non è chiaro, chiedimelo prima di partire.
>
> **1. Chi fornisce il servizio**
> {legalName}, {registeredAddress}. Partita IVA {vatNumber}, codice fiscale {taxCode}. Email {email}. PEC {pec}.
>
> **2. Anteprima gratuita**
> Su richiesta preparo gratis un'anteprima della homepage del tuo nuovo sito, di norma entro {previewHours} ore da quando ho le informazioni di base. L'anteprima non ti obbliga a nulla. Se decidi di non procedere, l'anteprima non viene pubblicata e non può essere usata né da te né da altri: resta un mio lavoro preparatorio. Le informazioni e le immagini che mi hai dato non vengono usate per altri scopi e, se me lo chiedi, le cancello.
>
> **3. Preventivo e inizio del lavoro**
> Se decidi di procedere, ti mando un preventivo scritto con il pacchetto scelto, il prezzo, i tempi e cosa è incluso. Il lavoro inizia quando accetti il preventivo per iscritto (va bene anche un messaggio WhatsApp o un'email) e ricevo l'acconto.
>
> **4. Prezzi e pagamenti**
> I prezzi sono quelli pubblicati nella pagina Prezzi nel giorno del preventivo. {vatNote}. Si paga con bonifico: il {depositPercent}% come acconto quando accetti il preventivo, il saldo dopo che hai approvato il sito finito e prima della pubblicazione. Il prezzo fondatori vale per i primi {foundersSpotsTotal} clienti che accettano un preventivo: in cambio mi autorizzi a mostrare il sito tra i miei lavori, con il nome della tua attività, e a indicarti come referenza a chi me lo chiede. Il prezzo fondatori non è mai legato a recensioni: se un giorno vorrai lasciarne una, sarà libera e solo tua.
>
> **5. Tempi**
> I tempi indicati ({deliveryDays.essenziale} giorni lavorativi per Essenziale, {deliveryDays.professionale} per Professionale, concordati per Su misura) partono dal giorno in cui ricevo l'acconto, le foto e le informazioni necessarie. Se qualcosa manca, i tempi si spostano dello stesso numero di giorni, e te lo dico subito.
>
> **6. Modifiche**
> Sono inclusi {revisionRounds} giri di modifiche sul sito finito. Un giro è un elenco di correzioni che mi mandi tutto insieme. Modifiche ulteriori o richieste fuori dal pacchetto te le preventivo prima di farle: niente sorprese.
>
> **7. Approvazione e garanzia**
> Quando il sito è pronto te lo mostro su un indirizzo di prova. Se lo approvi, paghi il saldo e lo pubblico. Se dopo i {revisionRounds} giri di modifiche non sei soddisfatto, puoi non approvarlo: in quel caso trattengo l'acconto per il lavoro svolto, non devi il saldo, il sito non viene pubblicato e ti restituisco i materiali che mi hai dato.
>
> **8. Proprietà**
> Dopo il saldo, il codice, i testi e la grafica del sito sono tuoi. Il dominio è sempre intestato a te. Le foto e i contenuti che mi dai restano tuoi. Le immagini libere da diritti che uso restano soggette alle loro licenze, che ti indico. Ti consegno un documento con tutti gli accessi.
>
> **9. Contenuti che mi fornisci**
> Mi assicuri di avere il diritto di usare le foto, i testi e i marchi che mi mandi. Se un contenuto che mi hai dato viola diritti altrui, la responsabilità è tua.
>
> **10. Piano Cura**
> Il piano Cura costa {cura} € al mese e comprende la gestione di dominio e hosting, fino a 2 modifiche al mese entro {careResponseHours} ore lavorative, un controllo mensile e le copie di sicurezza. Si paga mese per mese e si disdice quando vuoi con un messaggio: la disdetta vale dalla fine del mese già pagato. Le modifiche non usate non si accumulano.
>
> **11. Cosa non posso garantire**
> Garantisco un sito fatto bene, veloce e in regola. Non posso garantire un numero di richieste, di clienti o una posizione su Google: dipendono anche dal mercato, dalla concorrenza e da come rispondi alle richieste. La mia responsabilità è limitata all'importo che mi hai pagato per il lavoro, salvo dolo o colpa grave.
>
> **12. Legge e foro**
> Valgono la legge italiana e, per qualsiasi controversia tra professionisti, il foro di {jurisdiction}.
>
> **13. Contatti**
> Per qualsiasi domanda su queste condizioni: {email}.

### 5.13 Informativa privacy `/privacy`

Title: `Informativa privacy | Soglia`. Use this text:

> **Informativa privacy**
> Ultimo aggiornamento: {legalLastUpdated}
>
> Questa informativa spiega come tratto i dati personali di chi visita questo sito e di chi mi scrive, ai sensi dell'articolo 13 del Regolamento (UE) 2016/679 (GDPR).
>
> **Titolare del trattamento**
> {legalName}, {registeredAddress}. Email {email}.
>
> **Quali dati raccolgo**
> Dati che mi dai tu: quando compili un modulo, nome, nome dell'attività, telefono, email, comune o zona, l'indirizzo del tuo sito e le altre risposte che scegli di darmi. Quando mi scrivi su WhatsApp o per email, i dati contenuti nel messaggio.
> Dati di navigazione: il servizio che ospita il sito registra per motivi tecnici e di sicurezza dati come l'indirizzo IP e il tipo di browser. Le statistiche di visita sono raccolte in forma aggregata con Cloudflare Web Analytics, che non usa cookie e non salva identificativi sul tuo dispositivo.
>
> **Perché li uso e su quale base**
> Per rispondere alla tua richiesta e preparare l'anteprima o un preventivo: misure precontrattuali richieste da te (art. 6.1.b GDPR). Per gestire il lavoro se diventi cliente: esecuzione del contratto (art. 6.1.b). Per adempiere agli obblighi fiscali e contabili: obbligo di legge (art. 6.1.c). Per la sicurezza del sito e statistiche aggregate: legittimo interesse (art. 6.1.f).
> Non uso i tuoi dati per newsletter, pubblicità o profilazione, e non li vendo a nessuno.
>
> **Per quanto tempo li conservo**
> Le richieste che non diventano un lavoro: 12 mesi dall'ultimo contatto, poi le cancello. I dati dei clienti: per il tempo previsto dagli obblighi fiscali, di norma 10 anni. I dati tecnici di navigazione: per il periodo stabilito dal fornitore di hosting per finalità di sicurezza.
>
> **Chi li tratta oltre a me**
> Fornitori che mi aiutano a far funzionare il sito, nominati responsabili del trattamento quando necessario: Cloudflare (hosting e statistiche), Web3Forms (invio dei moduli via email), il mio fornitore di posta elettronica e, se attivo, Google (foglio di calcolo in cui registro le richieste). Se mi scrivi su WhatsApp, il messaggio passa attraverso il servizio di Meta.
> Alcuni di questi fornitori possono trattare dati fuori dall'Unione europea: in quel caso il trasferimento avviene con le garanzie previste dal GDPR, come le clausole contrattuali standard o decisioni di adeguatezza.
>
> **I tuoi diritti**
> Puoi chiedermi in ogni momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne l'uso, opporti al trattamento o riceverli in un formato leggibile, scrivendo a {email}. Se ritieni che il trattamento non sia corretto, puoi presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
>
> **Decisioni automatizzate**
> Non prendo decisioni basate unicamente su trattamenti automatizzati.
>
> **Modifiche**
> Se cambio questa informativa, aggiorno la data in cima alla pagina.

### 5.14 Cookie `/cookie`

Title: `Cookie | Soglia`. Use this text:

> **Cookie**
> Ultimo aggiornamento: {legalLastUpdated}
>
> Questo sito non usa cookie di profilazione né cookie di terze parti per pubblicità. Non salva nulla sul tuo dispositivo per riconoscerti.
>
> Le statistiche di visita sono raccolte con Cloudflare Web Analytics, che misura le visite in forma aggregata senza usare cookie e senza identificativi salvati sul tuo dispositivo.
>
> Per questo non vedi nessun banner: non c'è niente da accettare o rifiutare.
>
> Se in futuro aggiungerò strumenti che richiedono il tuo consenso, aggiornerò questa pagina e ti chiederò il consenso prima di usarli.
>
> Puoi comunque gestire o cancellare i cookie dalle impostazioni del tuo browser.
>
> Per domande: {email}.

## 6. Interactions

- **Calculator:** vanilla TS. Recompute on `input`. Format with `Intl.NumberFormat('it-IT')`. Output region has `aria-live="polite"`. Inputs keep their value on reload only via the URL hash (no storage). Clamp values to min and max.
- **Multi-step form:** progressive enhancement (works without JS as one stacked form). With JS: steps, validation on Next and on submit, focus moves to the step's legend after a transition, `Enter` advances, Back keeps answers. Submit via `fetch` POST JSON to `https://api.web3forms.com/submit` with `access_key`, `subject` "Nuova richiesta di anteprima: {nome attività}", `from_name` "Sito Soglia", `botcheck`, and all fields with Italian keys. If `sheetsEndpoint` is set, also POST the same JSON there (`mode: "no-cors"`, fire and forget). On success, redirect to /grazie. On failure, show the error from 5.8 with the prefilled WhatsApp fallback.
- **Accordion:** native `<details>`/`<summary>` styled; smooth open via CSS `grid-template-rows` 0fr to 1fr where supported; one can be open at a time only if that does not break native behaviour (otherwise allow several).
- **Mobile menu:** button with `aria-expanded` and `aria-controls`, focus trap, Escape closes, body scroll locked while open (via a class, not by touching scroll position in a way that jumps).
- **Sticky bar:** appears after the hero leaves the viewport (IntersectionObserver), hidden on the pages listed in section 3.
- **Prices page:** if `?pacchetto=` arrives on /anteprima-gratuita it is kept in a hidden field and shown as a small line "Pacchetto che ti interessa: Professionale" with a link to change it.

## 7. Animations

Load GSAP and plugins only on pages that use them, as ES module imports inside the components that need them. Register plugins once. Wrap all GSAP code in `gsap.matchMedia()` with three conditions: `(prefers-reduced-motion: reduce)` (no GSAP animations at all, final states shown), `(min-width: 768px) and (prefers-reduced-motion: no-preference)` (desktop), `(max-width: 767px) and (prefers-reduced-motion: no-preference)` (mobile). Animate only transform, opacity, clip-path and filter (filter only inside the renovation). Content must be readable before JS runs: no element is hidden by default in CSS; initial states are set by JS just before animating, so a JS failure leaves a complete static page. Add `?debug=1` support: shows ScrollTrigger markers and, on the home page, a fixed range slider that sets the renovation timeline's progress.

- **A1, hero entrance (home, load, once):** Split the H1 into lines with SplitText (type "lines", mask "lines"). Each line from yPercent 105 to 0, 0.8s, power3.out, stagger 0.08s, starting at 0.1s. Paragraph, then button row, then reassurance items: from opacity 0 and y 12px, 0.5s, power2.out, starting 0.35s after the last line starts. Phone mockup: from y 24px and opacity 0, 0.9s, power3.out, at 0.25s. At 1.6s the notification card scales from 0.92 and opacity 0 to 1, 0.45s, back.out(1.6), stays 3s, fades out 0.3s; repeat twice more 5s apart; after the third time it stays visible. Revert SplitText on resize via matchMedia cleanup. Mobile: same, durations × 0.8.
- **A2, the renovation (home):** one GSAP timeline. Desktop: ScrollTrigger pin the section, start "top top", end "+=300%", scrub 0.6, anticipatePin 1. Timeline progress stages:
  - 0 to 0.15: the five numbered marker annotations appear on the old site one after another (scale 0.6 to 1, opacity 0 to 1, rotate -3° to 0).
  - 0.15 to 0.35: scaffold SVG (vertical poles and horizontal planks drawn as strokes over the frame) draws from 0% to 100% with DrawSVGPlugin; the CANTIERE sign drops from y -40px and rotation -8° to its resting rotation -2°; the old site layer goes to grayscale(1) and opacity 0.6.
  - 0.35 to 0.70: pieces swap in order. Header: clip-path inset wipe left to right revealing the new header. Headline: `font-variation-settings` wdth from 62 to 112 and weight from 400 to 800 on an Archivo headline. Photo: a pixelated small image (rendered with `image-rendering: pixelated`) cross-fades to the sharp image while blur goes 8px to 0. Call and WhatsApp buttons scale in from 0.8 with opacity. The frame changes from a 4:3 desktop frame to a phone frame using GSAP Flip (capture state, toggle class, Flip.from inside the timeline).
  - 0.70 to 0.85: scaffold retracts with DrawSVG back to 0% and moves up 30px while fading; sign lifts away.
  - 0.85 to 1.0: the five checklist items tick in (check icon draws with DrawSVG, text fades in), evenly staggered, then the CTA appears.
  - Mobile: no pinning. Three stacked scenes labelled "Prima", "Cantiere", "Dopo", each a smaller frame with its own timeline of at most 1.2s that plays once when 40% visible (ScrollTrigger with `once: true`). The checklist follows "Dopo" as a static list that ticks in on enter.
  - Reduced motion: "Prima" (with all annotations) and "Dopo" side by side on desktop, stacked on mobile, checklist visible, no motion.
  - Use `ScrollTrigger.config({ ignoreMobileResize: true })`. Refresh ScrollTrigger after fonts load (`document.fonts.ready`).
- **A3, calculator numbers:** on each change, tween displayed numbers from old to new value over 0.4s, power2.out, using a proxy object and `onUpdate` formatting. Reduced motion: set instantly.
- **A4, process line (/, /come-funziona):** a 2px `--portone` vertical line behind the step numbers. Pure CSS: inside `@supports (animation-timeline: view())`, keyframes scaleY 0 to 1 with transform-origin top, `animation-timeline: view(); animation-range: entry 20% cover 60%;`. Outside that block (and with reduced motion) the line is fully drawn. No JS.
- **A5, accordion:** CSS only, 0.25s, ease-out; instant with reduced motion.
- **A6, form steps:** outgoing step x 0 to -16px and opacity to 0 in 0.2s, incoming from x 16px and opacity 0 to rest in 0.25s, power2.out; directions reversed on Back. Progress bar width transition 0.3s. Reduced motion: instant.
- **A7, page transitions:** CSS only: `@view-transition { navigation: auto; }` with a 200ms cross-fade on `::view-transition-old(root)` and `::view-transition-new(root)`; disabled under reduced motion. No Astro ClientRouter (full page loads keep scripts simple).
- **A8, smooth scroll:** Lenis on the home page only, only when `(pointer: fine)` and no reduced motion. Sync with ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)`, add `lenis.raf` to `gsap.ticker`, `gsap.ticker.lagSmoothing(0)`). Anchor links use `lenis.scrollTo`. Add `data-lenis-prevent` on any scrollable inner element.
- **A9, buttons:** `:active` scale 0.98, 0.1s. Link underline thickness transition 0.15s.
- **Never animated:** the founders counter, prices, legal pages, the footer, headings outside the hero.

**Verification for animations:** with Playwright, screenshot the renovation section at timeline progress 0, 0.25, 0.5, 0.75 and 1 at 1440×900 (use the debug slider or set scroll positions), each mobile scene at 390×844, and the hero at 0s, 0.5s, 1.2s and 2.2s after load at both widths. Emulate `prefers-reduced-motion: reduce` and screenshot the home page fully. Save to `docs/screens/animations/`. Check the browser console for errors during each run.

## 8. Demo projects (`/lavori/[slug]/demo`)

Three complete single-page demo sites for INVENTED businesses, built inside this project. Each has its own small design system, clearly different from Soglia's and from each other, chosen with the frontend-design skill. They use their own layout component (no Soglia header or footer), except a slim fixed top banner in Soglia's colours: "Progetto dimostrativo di Soglia per un'attività inventata. [Torna a Soglia]". All forms in the demos are functional only up to building the WhatsApp message: the final button opens WhatsApp with the composed message to `site.whatsappNumber`, prefixed with "[DEMO] ". No data is sent anywhere else. Each demo gets "noindex,nofollow". Each demo must score Performance ≥ 90 on mobile.

Images: download photos from Unsplash or Pexels (both free for commercial use) at about 2000px wide, save under `src/assets/demo/{slug}/`, serve through `astro:assets`, and record every source URL and photographer in `docs/CREDITS.md`. Choose images that look like real, ordinary Lombard places and work, not glossy stock. No people's faces in close-up.

Each demo includes a "Recensioni Google" area rendered as an empty-state card: "Qui compaiono le recensioni Google dell'attività." Never invented reviews.

1. **Arcadi Ristrutturazioni** (renovation firm, Milan). Direction: sturdy, practical, site-photo heavy, confident; light concrete greys with one strong working colour; a condensed sturdy sans for headings. Content:
   - Hero H1: Ristrutturiamo case a Milano. Bene, e nei tempi detti. / Sub: Bagni, cucine e appartamenti completi. Sopralluogo e preventivo gratuiti entro 48 ore. / [Chiedi un preventivo] [Chiama ora]
   - Servizi: Bagni completi / Cucine / Appartamenti chiavi in mano / Infissi e serramenti, each with one line.
   - Lavori: six before-and-after pairs with a draggable comparison slider (keyboard accessible with arrow keys), captions like "Bagno, zona Lambrate, 9 giorni di lavoro".
   - Come lavoriamo: Sopralluogo / Preventivo scritto / Cantiere pulito e puntuale / Consegna e garanzia.
   - Zone: Città Studi, Lambrate, NoLo, Porta Romana, Navigli, Isola, Sesto San Giovanni.
   - Preventivo guidato in 3 passi: tipo di lavoro (Bagno, Cucina, Appartamento, Infissi, Altro), metratura indicativa, quando vorresti iniziare (Entro 1 mese, Entro 3 mesi, Più avanti), nome e telefono → composes the WhatsApp message in the format shown in 5.6.
   - Sticky call button on mobile.
   - Footer: "Arcadi Ristrutturazioni è un'attività inventata. Progetto dimostrativo di Soglia."
2. **Cascina Rovere** (agriturismo with six rooms, Brianza). Direction: rural and warm, wood and leaf tones, an elegant readable serif, generous photography. Content:
   - Language toggle IT/EN that swaps all demo text (keep both strings in a small dictionary; set `lang` on the root accordingly).
   - Hero H1: Sei camere in cascina, a quaranta minuti da Milano. / Sub: Colazione con i prodotti dell'orto, colline e silenzio. Scrivici per la disponibilità: rispondiamo in giornata. / EN: Six rooms in a farmhouse, forty minutes from Milan. / Breakfast from our garden, hills and quiet. Ask us for availability: we reply the same day.
   - Camere: Noce, Glicine, Fienile, Pergola, Frutteto, Torretta, each with photo, guests, one line.
   - Richiesta di disponibilità: arrivo, partenza, ospiti, lingua, nome → WhatsApp message in the format in 5.6.
   - Come arrivare (by car and train, written generically: "In auto da Milano in circa quaranta minuti; in treno fino alla stazione più vicina, poi ti veniamo a prendere"), Nei dintorni (three ideas).
   - Footer: "Cascina Rovere è un'attività inventata. Progetto dimostrativo di Soglia."
3. **Villa Ortensia** (wedding venue, Lake Como). Direction: airy and refined, a fine display serif with a clean sans, lots of white space, large images, restrained motion (one gentle image reveal). Content:
   - Hero H1: Una villa sul lago, per un giorno solo vostro. / Sub: Fino a 180 ospiti, giardino sull'acqua, cerimonia e ricevimento nello stesso luogo. / [Prenota una visita]
   - Spazi: Il giardino sul lago / Il salone delle feste / La terrazza, each with capacity and photo.
   - Stagioni: Primavera, Estate, Autunno, one line each.
   - Fasce indicative: "Da 120 € a persona: menù e allestimento base" / "Da 160 € a persona: menù completo e allestimento floreale" / "Su misura: esclusiva della villa per tutto il weekend". Note: "Fasce indicative di un'attività inventata."
   - Richiesta di visita: data dell'evento (mese e anno), numero di invitati, budget (fascia), nomi → WhatsApp message in the format in 5.6.
   - Footer: "Villa Ortensia è un'attività inventata. Progetto dimostrativo di Soglia."

The Arcadi demo hero is also reused, scaled, in the home hero phone mockup and as the "after" state of the renovation section: build it as a component that can render in a phone frame.

After building the demos, take Playwright screenshots (390×844 and 1440×900) and save them as the images used on /lavori and the case pages.

## 9. Private pitch pages (`/anteprime/[slug]`)

Collection `anteprime`, one Markdown or YAML file per prospect, schema:
`businessName` (string), `sector` (string), `area` (string), `currentSiteUrl` (string, optional), `beforeImage` (image, optional: screenshot of their current site), `afterImage` (image, optional) and/or `afterUrl` (string, optional: link to a live preview), `changes` (array of 3 strings), `note` (string, Lorenzo's personal note), `published` (boolean).

Slugs are `{business-name-in-kebab}-{4 random lowercase letters or digits}`. Only entries with `published: true` are built.

Page (noindex, nofollow, excluded from sitemap, no header nav except the logo, no sticky bar):
- H1: {businessName}, ecco come potrebbe essere il tuo nuovo sito.
- Lead: L'ho preparato senza impegno, partendo dal tuo sito attuale e dalla tua scheda Google.
- Two panels side by side on desktop, stacked on mobile: "Oggi" (beforeImage in a desktop frame, or a note "Oggi non hai un sito: questa sarebbe la tua prima vetrina online." when absent) and "Domani" (afterImage in a phone frame, plus [Apri l'anteprima] if afterUrl).
- H2: Cosa ho cambiato / the three `changes`.
- Personal note block with {note} and the signature "{ownerFirstName}, Soglia".
- Three buttons: [Mi piace, parliamone] → WhatsApp "Ciao {ownerFirstName}, ho visto l'anteprima per {businessName}. Mi piace, parliamone." / [Ho qualche dubbio] → WhatsApp "Ciao {ownerFirstName}, ho visto l'anteprima per {businessName}. Ho qualche dubbio:" / [Non mi interessa] → replaces the button row with: "Grazie per averci dato un'occhiata. Non ti disturbo più." plus a small optional link "Se vuoi, fammelo sapere su WhatsApp" (message "Ciao, ho visto l'anteprima per {businessName}: per ora non mi interessa, grazie.").
- Small text: Questa pagina è privata e non compare su Google. Se preferisci, la cancello: basta un messaggio.
- Also show, compactly, the guarantee line and the founder price if spots remain.

Include one example entry: `arcadi-ristrutturazioni-k7q2`, `published: true`, using the Arcadi demo screenshot as afterImage, a generated screenshot of the old-site component from section 7 as beforeImage, changes "Il numero di telefono ora è sempre in vista, anche dal telefono" / "Le foto dei lavori sono grandi, con il prima e il dopo" / "Chi chiede un preventivo ti scrive su WhatsApp con tutte le informazioni", note "Ho visto che fate bagni e cucine in zona Città Studi: ho messo questi lavori al centro, perché sono quelli che le persone cercano di più." Mark it in TODO-LORENZO.md as an example to delete before launch.

Script `npm run nuova-anteprima -- --nome "Nome Attività" --settore "..." --zona "..." --sito "https://..."` creates a new entry file with a correct random slug, `published: false`, and TODO markers for the images, changes and note, then prints the future URL.

## 10. SEO and technical

- Every page: unique `<title>` and meta description from section 5, canonical URL from `site.url`, Open Graph and Twitter card tags, `og:locale` it_IT, a generated 1200×630 social image (Soglia design: calce background, sill bar, page H1 in Archivo, logo) stored per page.
- Structured data (JSON-LD): `ProfessionalService` on home (name Soglia, url, areaServed Lombardia, priceRange "€€", telephone and email from config, founder Person with name from config); `FAQPage` on home and /come-funziona; `BreadcrumbList` on inner pages; `Service` with `offers` on /prezzi. Skip any property whose config value is still a placeholder.
- Sitemap via `@astrojs/sitemap` with the exclusions in section 4. `robots.txt` as in section 4.
- `public/_headers` for Cloudflare Pages: `Content-Security-Policy` allowing self, `https://api.web3forms.com` (connect-src), the Apps Script domain `https://script.google.com` and `https://script.googleusercontent.com` (connect-src) only if used, `https://static.cloudflareinsights.com` (script-src) and `https://cloudflareinsights.com` (connect-src), `img-src 'self' data:`, `frame-ancestors 'none'`; plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Long cache headers for hashed assets.
- Cloudflare Web Analytics: render the beacon script only when `cfBeaconToken` is set.
- No console errors, no 404 requests, no mixed content.
- Images: every image has Italian alt text describing what it shows; decorative images have empty alt.

## 11. Form backend and automation

- **Web3Forms:** free access key goes in `PUBLIC_WEB3FORMS_KEY`. Document in TODO-LORENZO.md: create the key at web3forms.com with Lorenzo's email.
- **Optional Google Sheet log** (the automation Soglia sells, running on its own site): write `automation/google-apps-script.gs`, a Google Apps Script web app that receives the JSON POST, appends a row (timestamp, all fields) to a sheet named "Richieste", and emails Lorenzo a short summary. Include setup instructions in English in `automation/README.md` (create a Sheet, Extensions > Apps Script, paste, deploy as web app accessible to anyone, copy the URL into `PUBLIC_SHEETS_ENDPOINT`). Validate inputs and ignore requests where `botcheck` is filled.
- **WhatsApp:** no API. All WhatsApp features are `wa.me` links with prefilled text, opened by the visitor.

## 12. Phases, checkpoint and verification

Work through these phases in order. At the end of each: run `npm run check` and `npm run build`, fix every error and warning, commit, tick the phase in CLAUDE.md.

1. **Setup:** scaffold Astro (minimal, TypeScript strict), Tailwind, dependencies, fonts, config, `.env.example`, npm scripts, content collection schemas, base layout with head/SEO component, CLAUDE.md, TODO-LORENZO.md.
2. **Design system:** tokens, type scale, logo and favicons, `<Soglia />` sill, buttons, form fields, icons, header, mobile menu, footer, sticky bar, `/styleguide`. Then screenshot `/styleguide` and the empty home layout at 390 and 1440. Critique your own work against section 1's "avoid" list and section 3, fix, and screenshot again.
   **CHECKPOINT: stop here.** Show Lorenzo the screenshots, list the design decisions in 8 bullet points or fewer, and wait for "ok" or feedback before continuing. Apply feedback to CLAUDE.md as rules.
3. **All pages with final copy:** every page in section 5, static (no animations yet), fully responsive, all states (founders open and closed, placeholder photo, empty reviews).
4. **Interactions:** calculator, multi-step form with validation and fallbacks, contact form, accordion, menu, sticky bar, query-parameter handling.
5. **Demo projects:** the three demos, images, credits, screenshots, case pages, /lavori.
6. **Private pitch pages:** collection, template, example entry, `nuova-anteprima` script.
7. **Animations:** A1 to A9 with matchMedia, reduced-motion and mobile variants, debug mode, then the animation verification screenshots.
8. **SEO and technical:** meta, social images, structured data, sitemap, robots, `_headers`, analytics, 404.
9. **Automation:** Apps Script file and README.
10. **Quality pass:** `npm run screens` (every page at 390, 768, 1440); review every screenshot and fix anything broken, cramped, misaligned or generic; `npm run a11y` (zero serious or critical violations); `npm run lighthouse` (meet section 1's budget on every page, fix and re-run until it does); check every internal link; run `npm run check:placeholders` and confirm the only remaining placeholders are those in `src/config/site.ts`; search the built HTML for "—", "–" between words, "noi " on Soglia pages, "lorem", "TODO" and English words in visible text, and fix them; test the form flow end to end with a Web3Forms test key if one is set (otherwise verify the request payload in the browser network log); test with JavaScript disabled on the form page and home page.
11. **Handover:** write `README.md` (in English): what the project is, how to run it, how to fill `src/config/site.ts`, how to add a pitch page, how to update the founders counter, how to change prices, how to deploy to Cloudflare Pages (push to a GitHub repository, Cloudflare dashboard > Workers & Pages > Create > Pages > connect the repository, framework preset Astro, build command `npm run build`, output `dist`, add the PUBLIC_ environment variables, add the custom domain), and the reminder: "Do not publish before the commercialista meeting and before `npm run predeploy` passes." Do not deploy anything yourself.

## 13. Final report

When everything is done, reply with:
1. A short list of what was built (pages, demos, features).
2. Lighthouse scores per page (table) and the accessibility scan result.
3. Every remaining placeholder and account Lorenzo must set up (this is TODO-LORENZO.md).
4. Anything you could not do or had to approximate, and why.
5. The three things you would improve next.
