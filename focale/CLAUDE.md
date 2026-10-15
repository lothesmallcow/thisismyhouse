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
  Phone AND laptop (Lorenzo): a "Telefono | Computer" switch under the bar; one film per device (buildFilm),
  each with its own labels in `devices`. The laptop is Laptop.astro (CSS body built to the model's measures)
  with a real 3D model (public/models/macbook.glb, CC BY, credits in docs/CREDITI.md and the footer; logo faces
  cut at load, silver), drawn by the same Rig in phone3d.ts ([data-laptop3d], loaded on the first switch).
  Its pages are drawn 1280 px wide and scaled (--k); the old one boxed in 1000 px like an old theme. The lid
  angle (--lid, --lift; hinge.ts shared by CSS and WebGL) opens at the start, shuts and reopens for the swap;
  a mouse pointer clicks "Chiedi un preventivo" at the end. The device not shown is opacity 0 + inert (not
  visibility: film pieces set their own visibility); on phones it is display none. Sizes: phone and laptop
  widths come from 100svh minus about 300 px, so device + bar + switch fit one screen (checked at 1280x720).
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
