# Focus Design: website

Focus Design is a small web studio in Milan founded by Lorenzo (Bocconi student). It rebuilds
websites for small Italian businesses (renovation firms, window fitters, B&Bs, agriturismi,
wedding venues) so they get more enquiries. The site is Astro (static) + Tailwind + GSAP,
hosted on Cloudflare Pages. All visible copy is Italian; code, comments and docs are English.
The original brief is `docs/BRIEF.md` (written for the name "Soglia", renamed Focus Design: see `docs/NOME.md`).
The project folder is still called `focale/` (the first working name).

## Non-negotiables
- Italian copy, verbatim from the brief. No em or en dashes as punctuation. Italian numbers (3.000 €).
- Studio voice: first person plural ("noi") on Focus Design pages. Never claim a big team, offices or invented staff.
- No fake proof: no testimonials, stars, client logos/counts, countdowns, invented stats. `Reviews` renders nothing while `site.reviews` is empty.
- Founders counter is static text from config, never animated.
- Prices (Lorenzo, 21 Nov 2026): Essenziale 600 €, Completo 900 € (key `professionale`), Su misura 1.200 €, plus the optional
  "Cura del sito" at 39 €/month (site.care). Founders' programme off (foundersSpotsLeft 0). All from src/config/site.ts.
- No dark patterns, no popups, nothing pre-ticked.
- Personal/contact data lives only in `src/config/site.ts` as `[DA COMPILARE: ...]` placeholders. Prices, days, percentages are always read from config.
- Privacy: no cookies or storage, self-hosted fonts, third parties only Web3Forms, optional Apps Script, optional Cloudflare beacon.
- Avoid the generic AI look, but the theme is now deliberately Apple-like (Lorenzo): see "Design tokens".
- WCAG 2.2 AA, 44px targets, reduced motion respected, content readable before JS.
- Avoid the generic AI look (see brief section 1): no gradients/blobs/glass, no identical card grids, no all-caps eyebrows, no middle-dot strings, no emoji icons, no Inter/Roboto.

## Design tokens: theme "Mela" (Lorenzo, 21 Nov 2026, from his Claude Design file "Analisi del sito v4")
Apple-like: white #FFFFFF, text #1D1D1F, secondary #6E6E73, light grey surfaces #F5F5F7, hairlines #E8E8ED, ONE accent
blue #0071E3 (hover #0077ED, links and small blue text #0066CC: #0071E3 is too light for small text on tints).
No navy, no light blue, no orange. Old token names are kept as aliases (--blu, --fuoco, --mandarino are the blue).
Type: Geist variable, self-hosted (public/fonts/geist-*.woff2, SIL OFL, credits in docs/CREDITI.md), capped at 600 in
its @font-face so old 700/800 requests render semibold; titles big, tight (-0.04/-0.05em); Geist Mono for small numbers.
Buttons: blue, white text, 14 px corners, 56 px, an arrow → after the label (CSS ::after on .btn--primary);
secondary buttons light grey without border. Fields: light grey, no border, 14 px corners, 60 px.
Cards: white or light grey, 22 px corners, no shadows; the featured card (recommended plan) is blue with white text
and a white button. The old navy bands (.section--sole, .on-navy, footer, mobile menu) are light grey or white with
dark text; --on-dark-muted is white on blue cards and grey inside bands. Layouts and motion are unchanged.
The demo sites keep their own looks. OG images (pages/og) are white with a blue button (Satori still uses the
Schibsted TTFs: it cannot read woff2).

## Home (pages/index.astro) — see docs/RICERCA-DESIGN.md
- Layout (research-backed, see reports/): split hero (offer left 7/12, 3D phone right); then (Lorenzo, 22 Nov
  2026, replacing the phone/laptop makeover film, which he found useless there) the analysis entry `.hs-check`
  (grey band: a search-style bar, form GET to /analisi-sito/?url=..., which fills the address and starts at once;
  under it ReportTeaser.astro: "Bello da vedere. 51 su 100." The example is "Respiro" (Lorenzo, 22 Nov 2026: a site
  that LOOKS well made but loses points), an invented pilates studio at public/esempi/respiro/ (banner says so,
  noindex, its analytics tag is inert type="text/plain"). ExampleSite.astro shows it in a phone with numbered pins
  on each spot that costs points ([data-why] in its HTML; positions from `node scripts/example-shot.mjs` after a
  build, which also writes src/assets/esempi/respiro-telefono.png); picking a point scrolls the phone there; narrow =
  one point at a time with ‹ ›; it walks through the points when in view until touched. The same block appears in
  the report when the example is open ("Dove si vede sul sito"). Score ring, "51 → 74", link to
  /analisi-sito/?esempio=1#voto-esempio. Examples come from src/scorer/samples.ts (Respiro's speed numbers are
  simulated and the report says so). Re-run example-shot.mjs whenever the Respiro page changes), "Per chi lavoriamo" (3 sector
  cards with demo screenshots), "Cosa ricevi" bento, 4 steps with timings, prices (per-plan CTA, recommended plan
  navy), Lo studio, FAQ, closing band on navy with the 3-step PreviewForm embedded. Nothing pins, no ambient
  motion (living background, ticker and colour floods were removed). Section blocks (.hs-*) live in global.css
  and are reused by inner pages. Sticky mobile bar appears after the hero CTA leaves and hides over forms.
- The phone: IPhone.astro is the HTML phone (live screen in cqw units, Dynamic Island, status bar). In the hero
  and the makeover a real 3D model (scripts/phone3d.ts, public/models/iphone.glb, credits in docs/CREDITI.md)
  is drawn with WebGL under it and copies its CSS 3D pose every frame (CSS transform chain up to the
  [data-phone3d] rig, camera = CSS perspective). The HTML screen stays on top; the CSS body hides (.iph--gl).
  three.js + model load at the visitor's first gesture (Lighthouse and first load stay light); until then,
  or without WebGL, the CSS phone shows (`solid` adds CSS thickness and a back for the makeover spin).
  The 3D canvas is sized to the phone only and moved with transform (no layout shift).
- Opening film (scripts/hero.ts): tap on "Chiama ora" rings the Dynamic Island, iOS banners drop in.
  Sound (scripts/sound.ts) only after the visitor presses the speaker button.
- Makeover on the home = Casa Turati 3 (Lorenzo: it replaced the invented Arcadi film). ProjectFilm.astro
  feeds Makeover.astro (now props + slots, no defaults): the old site is INVENTED (demo/OldBnb.astro, the
  apartment only had its Airbnb listing; the lead says so), the new one the real page (demo/ShotPage.astro,
  shots and boxes from scripts/tour-shots.mjs) that scrolls to each fix (roll). Texts and pairs in the yaml
  `film`. The band is a lighter blue (--blu-chiaro #2350b8). The film is NOT on the project page (Lorenzo);
  that page keeps the real site to scroll (RealTour.astro: no numbered steps, Lorenzo found them confusing) and
  the price. At the end of the film the real page scrolls back to its top as the device glides away. Notes below about Arcadi pieces describe the old film's mechanics.
- Makeover (Makeover.astro, scripts/makeover.ts): a film like the opening one, not scroll-driven, about 30 s,
  ONE THING AT A TIME (Lorenzo found the all-at-once version confusing). Script in seconds at the top of
  makeover.ts: the old site (a desktop page at 220% scaled down, so it stays in its two-column layout); its five
  problems one by one (a lens: only that piece grows in place, 1.3x-1.8x, over its neighbours, nothing else
  moves; a page-wide zoom hid what it zoomed on and 2.4x was too much; a red box lights it and dims the rest; a floating label, beside the phone with a dashed line on computers,
  over the phone under the box on phones); the phone lifts and turns, the new site is swapped while it faces
  away; the five fixes one by one (green box, label turns green); a tap on "Chiama ora" rings. The `fixes` list
  in Makeover.astro pairs each OldSite piece with its fix in ArcadiHero (`extra={false}`: no promise chips).
  Under the phone a slim pill bar: one-line status worked out from the film's clock (sync), sound switch,
  "Rivedi"; no play/pause, no progress bar (Lorenzo). It plays when in view, pauses when it leaves, goes on
  when it comes back (restarts if finished). Phones: bigger phone, button after the film, the sticky bar
  hides over .mk__bar. Sound cues are timeline callbacks; one page-wide switch (bindSoundButton). Keep GSAP
  lag smoothing on (smooth.ts): with it off a hitch or a tab switch sent the films straight to their end.
  The section's padding is set in global.css (`.home .scenes > section.mk`): it once was 0 and the phone
  touched the band's edge. The old site (demo/OldSite.astro) is NOT a joke site: a decent WordPress-style
  theme made for computers (top bar with a tiny number, menu, slider, services, small work photos, quote
  behind "Contatti", news stopped in 2019). Lorenzo: if it looks ridiculous, a prospect says "mine is better";
  when it looks like theirs, they see the real problem. It fills the whole phone screen.
  Device by screen (Lorenzo): iPhone under 900 px, a laptop on computers (it fills the right side; a
  Telefono | Computer switch was tried and dropped as too much). The laptop is Laptop.astro (CSS body
  built to the model's measures) with a real 3D model (public/models/macbook.glb, CC BY, credits in
  docs/CREDITI.md and the footer; logo faces cut at load, silver) drawn by the same Rig in phone3d.ts
  ([data-laptop3d]). Models are preloaded at idle (preloadModels) and drawn from the first gesture
  (index.astro); the laptop film waits for data-gl="ready" (3 s at most) before opening the lid, or the
  CSS stand-in was seen opening and then turning into the real laptop (Lorenzo: "a block"). Its pages are drawn 1280 px wide and scaled
  (--k); the old one boxed in 1000 px like an old theme (doubled classes: the phone's 220% rule must not
  win). The lid angle (--lid, --lift; hinge.ts shared by CSS and WebGL) opens at the start, shuts and
  reopens for the swap; a mouse pointer clicks "Chiedi un preventivo" at the end. One film per device,
  built only for the device on screen (a hidden one measures 0); crossing 900 px swaps and restarts.
  Sizes from 100svh minus about 240 px, so device + bar fit one screen.
  Mini film (Lorenzo): the phone starts alone in the middle of the band (stage translated, transforms
  only: no layout shift), no words or buttons; when the tap is over it glides to the right and the words
  ([data-mk-word]) come in one by one. Nothing pinned, the page scrolls freely. Once over it stays over
  (coming back does not restart it, the words stay); "Rivedi" replays from the middle. When the band is
  already on screen at start-up (a reload keeps the scroll), the device glides to the middle instead of jumping.
  Numbers stay (Lorenzo): each numbered box stays on, softer, after its label goes, so the problems add
  up on the old site until it is swapped and the fixes on the new one until the device glides to its
  place. Labels stay one at a time (labels with lines round the laptop, and a "shrink and map" ending,
  were tried and dropped as too much). At the end the bar shows Prima | Dopo (either site, clean),
  sound, replay. The laptop's box includes its 3D base (padding-bottom 0.28w) so the bar never touches it.
  Left column kept clean on purpose (Lorenzo): title, lead, one button, "Vedi i tre siti completi" under it;
  no chip, no viewfinder corners, no grid, no "Gratis e senza impegno" line.
- Header (Header.astro): on touch screens it never hides on scroll (hiding glitched on iPhone with momentum
  and rubber-band scrolling); with a mouse it hides after 60 px of steady scrolling down, back after 24 px up.
- "Calcola una stima del tuo preventivo" (Estimator.astro on /prezzi/#stima, logic in lib/estimate.ts, numbers in
  site.estimate): it asks about size and MECHANISMS, not counts (Lorenzo: "how many rooms" confuses; what moves
  price is whether things happen by themselves). Questions: activity; size (one page / complete up to 6 pages /
  big site); "vuoi aggiungere da solo..." (panel that makes new pages); the key mechanism for the business
  (trades: guided form included, or an automatic indicative price; hospitality: request or link included, or
  booking inside the site; venues: form included, or a visit calendar, plus brochure); languages; photos;
  extras. ONE QUESTION PER SCREEN ("Domanda N di 7", Indietro/Avanti) and the estimate only at the end, never
  live (Lorenzo: a price that moves while you answer invites answering for the lowest number); "Rifai le
  domande" resets. Result: range, working days, breakdown, costs paid to others kept apart, "stima, non
  preventivo". No email, nothing sent or stored. Prices from reports/Stima preventivo siti web.md.
- Home prices: each package card lists what is included (from lib/plans.ts). Under the packages (home and
  /prezzi/) PlanHelp.astro: "Nessun pacchetto fa per te?" (estimator) and "Non sai cosa scegliere?" (WhatsApp).
- Sector chooser (Choose.astro, scripts/paths.ts): radios + CSS :has(), Flip. Each path shows the live demo.
- Live demos (DemoViewer.astro, scripts/demo-viewer.ts): a real iframe of /lavori/<slug>/demo/, phone frame
  (390 px wide, scaled) on phones, browser window (1280 px, scaled) on computers, a switch between them.
  Loaded only when visible. On touch the site wakes with a tap ("Fatto" puts it back to sleep) so it never traps
  the page scroll. Demo pages hide their banner when framed (Demo.astro adds .in-frame).
- Demo sites are built like real client sites with a shared motion kit (scripts/demo-motion.ts, loaded by
  layouts/Demo.astro, data attributes documented at the top of the file): fixed header that turns solid and
  hides on scroll ([data-dh], sits under the Focus banner via --banner), full-screen phone menu ([data-menu]),
  line-by-line headings ([data-split]), mask reveals ([data-rise], never on forms: clip-path blocks clicks),
  picture wipes, parallax, pinned sideways galleries ([data-hscroll]), stacking cards ([data-stack]),
  count-ups, highlighter strokes ([data-mark]), magnetic buttons. Lenis on mouse only. Language switches must
  use setText() from demo-motion so split headings survive.
  Villa Ortensia: editorial, spaces as stacking cards, seasons, price bands. Arcadi: "studio" look (stone, ink, one rust
  accent, square buttons, hairlines, quieter pictures): Lorenzo found the bold orange version childish.
  Theme "Mela" variants (Lorenzo, 22 Nov 2026: the demos in the new style, each a different colour): a block at the
  end of each demo's styles sets Geist (no serif, no italics), tight semibold titles, 14 px buttons with an arrow,
  grey fields, rounded pictures, and one accent: Arcadi brick orange #c2410c, Villa Ortensia sage green #2e7d5b,
  Studio Linea indigo #5e5ce6 (white text 5:1 on each). Re-shoot their screenshots with `npm run screens:demo`.
- Home sections alternate white and grey (#f5f5f7) with one padding; two white sections in a row share one gap.
  Makeover.astro, ProjectFilm.astro and the laptop model are no longer on any page (kept in the repo).
- Lavori: the first project is a REAL client's site, Casa Turati 3 (Paolo's apartment in Milan, permission
  given), built in the repo lothesmallcow/studio-starter and online at `url` in its yaml. It replaced the
  invented B&B Cascina Rovere (deleted, still in git history). Every place that shows a project words it
  through `src/lib/lavori.ts` (`isReal`, `kindLabel`, `siteHref`, `siteAlt`): a real site is never called
  "dimostrativo", a demo never passed off as a client. A real site shows no results it has not had yet
  ("Cosa fa il sito", not "Cosa ottiene"). DemoViewer shows a real site as screenshots in the frames with
  its link, no iframe (another host may refuse framing or be down). Screenshots: build the client repo
  locally and shoot 1440x900 and 390x844 @2x. A project may carry a `quote` (CaseQuote.astro): what it
  would cost at our prices, from the estimator plus made-to-measure lines priced in site.estimate, with
  a "why" per line and what it did not need. "È costato" only with `paid` (the real price: Paolo paid 390 €). Price follows structure (Lorenzo): a
  second language on a one-page site costs little (language.setupOnePage). The CSP in `public/_headers` allows framing that host
  (frame-src), in case a live embed comes back; update it when the client moves to its own domain.
- Demos on phones: long lists are swipe rails (`:is(ul, ol).d-rail`, focusable, with aria-label), Arcadi's works
  show 3 then "Altri lavori" (`.d-more` + `.d-more-btn` anywhere in the section). Grid children holding a
  rail need `min-width: 0` or they widen the page. Arcadi's call bar appears after the hero.
- Phones: no backdrop blur over moving content, no filters on redrawing layers, the living background is
  100lvh and pauses while scrolling on touch, the 3D phone draws at 1x while moving. Animate transform, never
  left/top (layout shift).
- Inner pages (PageHead.astro): text on the left, the page's own picture on the right (slot "visual",
  components/visual/*): thermal-printer receipt on Prezzi, WhatsApp chat on Come funziona (seen from the customer's phone: it plays
  when in view, "sta scrivendo…" with typing dots before each Focus reply, a soft pop if sound is on, "Rivedi"), "Siti per [sector] che lavorano bene"
  rolling pill and a camera shot (all sharp, flash, only the middle stays sharp) on Lo studio, contact card on
  Contatti, phone fan on Lavori and sector pages, a huge "0 €" on La garanzia (no circles, no emoji-prone glyphs like ✳: iPhone draws them as emoji).
  Lo studio "Focus vuol dire" (FocusLens.astro): a camera shot, AF pill that hunts then locks green, an
  exposure line, a six-blade iris that fires, corners turn green. Lavori cards: text centred in its column
  (no margin-top:auto: it left dead space). Prezzi: `.pz` has no bottom padding (the estimator follows).
  Entrances are CSS (play at first paint, no opacity on text: axe measures mid-animation); hover/scroll parts
  are scripts/inner.ts. Never leave a half-empty row: Lorenzo checks for dead space first.
- Colour play: a section with [data-tone="sole|pesca"] floods the whole page with its colour while it holds
  the middle of the screen (inner.ts sets body[data-tone]; muted text and hairlines darken via variables).
  The closing (Closing.astro) is a full-width orange band that runs into the orange footer.
- docs/video/focus-design-home-telefono.mp4: vertical recording of the home (Playwright + ffmpeg).
- `node scripts/overflow-check.mjs` finds cut-off text and sideways scroll on every page at 6 widths.
- Computers must stay exactly as designed (Lorenzo): phone fixes go in phone-only media queries
  ((max-width: 599px), (hover: none), (pointer: coarse)), never in the base tokens. Check with a pixel diff of
  the old and new build at 1440 and 1280 (reduced motion): every page must come out identical.
- Hero title (hero.ts): SplitText line masks get room below (descenders) and the split is reverted when the
  rise ends; masks left at rest cut "p" and "g" at the bottom on every device. Demo headings get the same room.
- Phones and tablets (reports/Sito desktop su iPhone e mobile.md): every :hover lives under
  `(hover: hover) and (pointer: fine)` (on touch it sticks after a tap); touch gets a quick :active press instead;
  no tap flash, `touch-action: manipulation`, `font-synthesis: none`, `color-scheme: light only` (meta + :root)
  against Chrome/Samsung forced dark. Full-height blocks use svh (never bare 100vh). `.wrap` and the sticky bar
  respect left/right safe areas (landscape notch). The sticky bar is opaque (Safari 26 tints its bars from fixed
  elements). Phone mockup screens keep a -webkit-mask on touch devices so Safari holds the rounded clip. three.js only with
  WebGL, no Save-Data, >= 4 GB and >= 4 cores, and it hands back to the CSS phone on webglcontextlost.
  Sound asks for audioSession "playback" (silent switch) and follows the AudioContext state. ScrollTrigger
  ignores mobile resizes. H1 is 34 px on phones under 600 px (iOS large title); prices use a non-breaking space before €;
  the recommended plan comes first on phones. The claude.ai preview is a cross-origin iframe: iOS throttles it
  to about 30 fps until touched, so judge smoothness on the real URL, not the preview.
- Do not use the CSS `translate` property on elements GSAP transforms: GSAP folds it into its own transform.
- Phones fit the screen's height (Lorenzo, seen in the claude.ai preview at about 390x650): devices are
  sized by width AND height, as big as the screen allows (makeover phone min(84vw, 420px, (100svh - 200px)/2.06),
  hero phone min(70vw, 300px, (100svh - 200px)/2.06)), and every
  panel (package cards, project cards, request card, receipt and chat visuals by `zoom`) fits one screen
  with the header and the sticky bar, about 100svh - 156px. Rules live in (max-width: 599px) or 899px
  blocks, placed AFTER the base rules (same specificity: the later one wins). Check by measuring at 390x650.
- Home on touch phones: CSS scroll snap "proximity" on html, the makeover stage `scroll-snap-align: center`
  (Lorenzo: it settles exactly on the phone when you stop near it, scrolling stays free). Touch only:
  on computers Lenis drives the scroll and would fight CSS snapping.

## Website Scorer (/analisi-sito/) — see docs/SCORER.md
- Free private site report (score /100, top 5 fixes, legal flags) + "Cosa possiamo fare noi" + one CTA
  (email with unticked consent). Engine in src/scorer/ (plain TS, shared by Pages Functions in functions/,
  CLI and tests). Rubric src/scorer/rubric.json is versioned: change it, bump version; every sector
  profile must total 100 (tests). Sectors: fitness, ospitalita, ristorazione, edilizia, salute, bellezza,
  professionisti, immobiliare, negozio, eventi, altro. Flags have 0 points and never claim compliance.
- Deterministic: HTML signals only (hidden text ignored), speed from CrUX else lab in wide bands, PSI
  numbers cached per URL per day. Store only URL, score, email, consent record; never page content.
  Reports are never published; no rankings or comparisons with named businesses.
- Never exempt ourselves: `npm run scorer:selftest` (CI: .github/workflows/focale-scorer.yml) scores our
  demos (Studio Linea fitness, Arcadi, Villa Ortensia) and the scorer page; all must be >= 90. It
  writes src/scorer/benchmark.json, the only source of the "projected score". No demo = no number.
- The page is the Claude Design file "Analisi del sito v4" (Lorenzo) wired to the engine: screens start,
  waiting (ring builds while check names go by), report (ring by category, summary, fixes with the score
  climbing, flags, every check), error (by API `code`). Prices in offer.json = site.ts (600/900/1.200 + Cura).
  The "→ N" comparison uses benchmark.json only; without a measured demo for the sector it shows no number.
- Render report strings with textContent only: "found" sentences quote the analysed page.
- prospects/ (batch CLI output) is git-ignored: other businesses' results stay private.
- reports/Requisiti siti per settore.md: per-sector requirements and build checklists for future sites.

## Scripts
dev, build, preview, check, check:placeholders, predeploy, screens, screens:demo, lighthouse, a11y,
nuova-anteprima, logo, illustrazioni, test, scorer, scorer:batch, scorer:selftest.

## Rules learned while building
- Demo photos could not be downloaded from this environment: demos use generated illustrations
  (`scripts/illustrations/`, `npm run illustrazioni`). Same room before/after, so sliders line up.
- `.check` is the global checkbox-row class: don't reuse it for lists.
- Satori sizes are content-box: subtract padding from width/height.
- Below-the-fold scripts load through `later()` (after load + idle) to keep LCP under 2 s.
  Stylesheets are inlined (`inlineStylesheets: "always"`) for the same reason.
- Hero fades start at opacity 0.01 so the paragraph counts as painted for LCP.
- Preview link: `node scripts/export-artifact.mjs` writes `preview/` (relative links, `_astro` renamed `assets`).
- Arcadi orange: #c4510e for button backgrounds (white text 4.6:1), #a8430b for small text.
- Scoped Astro styles don't reach child component roots: style `<Icon class>` via `:global()`.

## Phases
- [x] 1 Setup
- [x] 2 Design system (checkpoint skipped: Lorenzo was away and asked not to wait)
- [x] 3 Pages with final copy
- [x] 4 Interactions
- [x] 5 Demo projects
- [x] 6 Private pitch pages
- [x] 7 Animations verified
- [x] 8 SEO and technical verified
- [x] 9 Automation
- [x] 10 Quality pass
- [x] 11 Handover
