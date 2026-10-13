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
- No monthly plan (the old "Cura") anywhere: Lorenzo can't guarantee ongoing maintenance yet. Don't promise it, not even as a bonus.
- No dark patterns, no popups, nothing pre-ticked.
- Personal/contact data lives only in `src/config/site.ts` as `[DA COMPILARE: ...]` placeholders. Prices, days, percentages are always read from config.
- Privacy: no cookies or storage, self-hosted fonts, third parties only Web3Forms, optional Apps Script, optional Cloudflare beacon.
- WCAG 2.2 AA, 44px targets, reduced motion respected, content readable before JS.
- Avoid the generic AI look (see brief section 1): no gradients/blobs/glass, no identical card grids, no all-caps eyebrows, no middle-dot strings, no emoji icons, no Inter/Roboto.

## Design tokens ("Officina", from reports/Layout e call to action.md)
White paper #FFFFFF · navy ink #0B1B3F · brand blue #13307A (bands, recommended plan, icons, eyebrows) ·
secondary text #4A5572 · alt surface #F1F4FA · hairlines #DDE3EF · orange #FF6A1F ONLY for primary buttons
(navy text on it, never white: 2.86:1). Old token names are kept as aliases (--mandarino now = brand blue).
Navy bands (.section--sole / .on-navy) flip the colour tokens so components inside read white.
Type: Schibsted Grotesk variable (400-900) only, self-hosted. H1 800, H2/H3 700, body 400 at 17-18 px,
buttons 600 at 17 px; nothing below 400; no global tabular-nums (it widens punctuation in this font).
Eyebrows: short, brand blue, sentence case (no all-caps). Buttons: pill, 52-56 px primary, 48 px outline.
One action everywhere: "Voglio l'anteprima gratuita" (sticky bar: "Anteprima gratuita").
Logo: "focus" 800 + "design" 400 in Schibsted outlines (npm run logo); favicon navy with orange point.
The Arcadi demo has its own Archivo @font-face (it's a different business).

## Home (pages/index.astro) — see docs/RICERCA-DESIGN.md
- Layout (research-backed, see reports/): split hero (offer left 7/12, 3D phone right) capped so the navy
  makeover band peeks at the fold; then makeover (with the primary CTA under it), "Per chi lavoriamo" (3 sector
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
- Makeover (Makeover.astro, scripts/makeover.ts): a film like the opening one, not scroll-driven, about 30 s,
  ONE THING AT A TIME (Lorenzo found the all-at-once version confusing: old site, boxes, labels and new site were
  all unclear, too small, too fast). Script in seconds at the top of makeover.ts: the old site (a desktop page at
  220% scaled down, so it stays in its two-column layout); its five problems one by one (the old page zooms on
  the problem, 1.7x-2.4x by height, a red box lights it and dims the rest, the caption says "Problema N di 5");
  the phone lifts and turns, the new site is swapped while it faces away; the five fixes one by one (green box,
  "Risolto N di 5"); a tap on "Chiama ora" rings. The `fixes` list in Makeover.astro pairs each OldSite piece
  with its fix in ArcadiHero (shown without its promise chips, `extra={false}`). Caption and the computer-only
  checklist (red, then green) are worked out from the film's clock (sync), so seeking or replaying never leaves
  them out of step. It plays by itself when the phone is in view, pauses when it leaves, goes on when it comes
  back (restarts if finished). Under the phone: caption (all lines stacked in one cell, nothing moves), a sound
  switch and "Rivedi"; no play/pause, no progress bar (Lorenzo). On phones the phone is bigger and the button
  comes after the film. Sound cues (scripts/sound.ts) are timeline callbacks; one page-wide switch
  (bindSoundButton). Keep GSAP lag smoothing on (smooth.ts): with it off a hitch or a tab switch sent the films
  straight to their end. The old site has a tiny phone number in its header (problem 1).
- Header (Header.astro): on touch screens it never hides on scroll (hiding glitched on iPhone with momentum
  and rubber-band scrolling); with a mouse it hides after 60 px of steady scrolling down, back after 24 px up.
- "Calcola una stima del tuo preventivo" (Estimator.astro on /prezzi/#stima, logic in lib/estimate.ts, numbers in
  site.estimate): questions follow the business (services for trades, rooms and booking for B&B/agriturismi,
  spaces/event types and brochure for venues), then languages, photos, extras. Live result: price range,
  working days, line-by-line breakdown, costs paid to others (domain, booking engine fee, payment fees,
  photographer) kept apart, "stima, non preventivo". No email, nothing sent or stored. One-page sites move to
  Professionale past onePageMaxUnits or with blog/panel/booking. Prices from reports/Stima preventivo siti web.md.
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
  Cascina Rovere: warm serif, rooms gallery sliding sideways, "Una giornata in cascina". Villa Ortensia:
  editorial, spaces as stacking cards, seasons, price bands. Arcadi: "studio" look (stone, ink, one rust
  accent, square buttons, hairlines, quieter pictures): Lorenzo found the bold orange version childish.
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
  Entrances are CSS (play at first paint, no opacity on text: axe measures mid-animation); hover/scroll parts
  are scripts/inner.ts. Never leave a half-empty row: Lorenzo checks for dead space first.
- Colour play: a section with [data-tone="sole|pesca"] floods the whole page with its colour while it holds
  the middle of the screen (inner.ts sets body[data-tone]; muted text and hairlines darken via variables).
  The closing (Closing.astro) is a full-width orange band that runs into the orange footer.
- docs/video/focus-design-home-telefono.mp4: vertical recording of the home (Playwright + ffmpeg).
- `node scripts/overflow-check.mjs` finds cut-off text and sideways scroll on every page at 6 widths.
- Do not use the CSS `translate` property on elements GSAP transforms: GSAP folds it into its own transform.

## Scripts
dev, build, preview, check, check:placeholders, predeploy, screens, screens:demo, lighthouse, a11y,
nuova-anteprima, logo, illustrazioni.

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
