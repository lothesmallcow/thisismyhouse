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
- No dark patterns, no popups, nothing pre-ticked.
- Personal/contact data lives only in `src/config/site.ts` as `[DA COMPILARE: ...]` placeholders. Prices, days, percentages are always read from config.
- Privacy: no cookies or storage, self-hosted fonts, third parties only Web3Forms, optional Apps Script, optional Cloudflare beacon.
- WCAG 2.2 AA, 44px targets, reduced motion respected, content readable before JS.
- Avoid the generic AI look (see brief section 1): no gradients/blobs/glass, no identical card grids, no all-caps eyebrows, no middle-dot strings, no emoji icons, no Inter/Roboto.

## Design tokens
Warm studio palette: latte #FFF8F2 (bg) · nebbia #FCEBDC (alt bg, stage) · cacao #24130C (text) · grafite #6B5248 (secondary text) ·
mandarino #FF5B22 (primary buttons, orange sections, footer; cacao text on it, never white) · miele #FFB23F · pesca #FFD3BC ·
marker #D7392B (renovation demo only). No black or near-black surfaces (the iPhone bezel is the exception): the user asked for white and orange mixed.
Orange light = soft radial gradients from mandarino through miele to transparent (hero stage, closing, OG images).
Archivo variable: headings weight 300 at width 125% with negative tracking; UI 500. Literata for long body text.
Logo: lowercase "focus" (500) + "design" (300) in Archivo wide, no symbol (`npm run logo` regenerates the paths).

## Home (pages/index.astro) — see docs/RICERCA-DESIGN.md
- A website, not slides: only the opening fills the screen and only the makeover pins; every other section
  has its natural height and its own layout, over one living WebGL background (LiveBackground.astro,
  scripts/live.ts). No exit fades. Content enters with a clip-path mask ([data-in], no opacity: axe measures
  half-faded text). A ResizeObserver refreshes ScrollTrigger when the page height changes.
- Order: opening film, sector ticker (CSS marquee, wraps with reduced motion), "Che attività hai?" chooser,
  makeover, Metodo (heading sticky on the left, steps on a rail that fills in orange), Prezzi, CTA + FAQ.
- The phone: IPhone.astro is the HTML phone (live screen in cqw units, Dynamic Island, status bar). In the hero
  and the makeover a real 3D model (scripts/phone3d.ts, public/models/iphone.glb, credits in docs/CREDITI.md)
  is drawn with WebGL under it and copies its CSS 3D pose every frame (CSS transform chain up to the
  [data-phone3d] rig, camera = CSS perspective). The HTML screen stays on top; the CSS body hides (.iph--gl).
  three.js + model load at the visitor's first gesture (Lighthouse and first load stay light); until then,
  or without WebGL, the CSS phone shows (`solid` adds CSS thickness and a back for the makeover spin).
  The 3D canvas is sized to the phone only and moved with transform (no layout shift).
- Opening film (scripts/hero.ts): tap on "Chiama ora" rings the Dynamic Island, iOS banners drop in.
  Sound (scripts/sound.ts) only after the visitor presses the speaker button.
- Makeover (Makeover.astro, scripts/makeover.ts): pinned, scrubbed. A scan runs down the old non-responsive
  site and boxes its five problems in one pass (numbered red boxes on the screen, labels beside the phone on
  wide screens), the phone lifts and turns 360 degrees (back and cameras visible), the site is swapped while
  it faces away (the new site is painted under the old one by opacity, so nothing decodes mid-turn), then each
  label glides to the part of the new site that fixes it and turns green, and a tap calls. The `fixes` list in
  Makeover.astro pairs each OldSite piece with its fix in ArcadiHero.
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
