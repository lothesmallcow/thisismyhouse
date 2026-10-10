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
marker #D7392B (renovation demo only). No black or near-black surfaces: the user asked for white and orange mixed.
Orange light = soft radial gradients from mandarino through miele to transparent (hero stage, closing, OG images).
Archivo variable: headings weight 300 at width 125% with negative tracking; UI 500. Literata for long body text.
Logo: lowercase "focus" (500) + "design" (300) in Archivo wide, no symbol (`npm run logo` regenerates the paths).

## Home motion (scripts/hero.ts, scripts/motion.ts)
- Hero: headline letters rise on load; on scroll the stage (white panel with a phone) pins, opens to full screen,
  an orange light rises and three notifications arrive, one per caption. Phone width is set by viewport height
  so the stage always fits; check with a fit test at 360-1920 px widths before changing it.
- Hero sector chooser ("Che attività hai?"): radios + CSS `:has()` show the chosen path with no JS;
  scripts/paths.ts adds the entrance, scrolls to it, remembers the choice (localStorage) and refreshes ScrollTrigger.
  Each path links to the preview form with `?settore=` so the form arrives pre-filled.
- The renovation scene (Renovation.astro) is no longer on the home: Lorenzo found it weak. Kept for reference.
- Demo sites: full-bleed heroes with a shade for legible text; Demo layout reveals content softly on scroll.
- Manifesto words light up on scroll (faded colour #A3897B keeps 3:1 for large text). Bento tiles rise in.
- Reel pins and slides sideways with a slight 3D turn (desktop, fine pointer). Pointer label "Guarda" on reel cards.
- Primary buttons are magnetic (fine pointer). Everything is skipped under reduced motion.
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
