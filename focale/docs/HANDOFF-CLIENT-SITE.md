# Handoff: building a real client site

Paste or attach this file at the start of the next chat. It carries everything learned while building
the Focus Design studio site (this repo, `focale/`), so the next session can build a **real, live site for
a paying client**: design, copy, and everything that has to actually work (forms, legal, SEO, hosting,
handover). Read it fully before writing code.

Repo with the reference implementation: `lothesmallcow/thisismyhouse`, folder `focale/`, branch
`claude/sharp-cori-ybysce`. Many patterns below point to files there: reuse them instead of rewriting.

---

## 1. Who you work for and how

- **Lorenzo**, 17, Bocconi student, runs Focus Design: a one-person studio in Milan that redesigns websites
  for Italian small businesses (renovation firms, window fitters, B&Bs, agriturismi, wedding venues).
- **Language:** talk to him in Italian. Blunt, no flattery, no em dashes, short. Say clearly what you are
  unsure about and how sure you are (a percentage) when facts can change (laws, prices, services).
- **How he works:** he iterates by screenshots, often mid-task. He reacts to the visual result, not to
  explanations. Small messages like "poco meglio, ma poco" mean: change direction, not polish.
- **What he wants, learned the hard way:**
  - **Clean over rich.** He removed a laptop switch, viewfinder corners, grids, chips, a "Gratis e senza
    impegno" line: "troppo", "non è clean". One strong idea per section, the rest quiet.
  - **One thing at a time** in any animation or explanation. All-at-once was "confusing".
  - **No fake proof.** No invented reviews, client logos, numbers or "trusted by". Demos are labelled
    as invented.
  - **Believable, not caricature.** A deliberately ugly "before" site backfired ("my site is better than
    that"). Real-looking is more persuasive.
  - **Never make the visitor wait or work.** Estimator: no live price while answering (people game it).
    Films: never pinned, scroll stays free, never mandatory to watch.
  - **Computers must not change when fixing phones**, unless he asks for both. Prove it with a pixel
    diff (method in section 9).
  - He sometimes guesses causes ("is it the lighting?"). Treat that as a hypothesis, not a fact:
    isolate and measure before changing things. Twice in this project the real cause was something else.
- **Report like this:** what changed (by his point number), what you verified and how, what you could
  NOT verify (e.g. no real GPU, no Safari here), and the honest trade-off of each choice.

## 2. First thing in the next chat: discovery (do not code before this)

Ask Lorenzo (AskUserQuestion, several rounds if needed) for the client brief. Build nothing generic.

**Business**
- Business name, legal name, P.IVA, registered address, PEC, REA (if a company).
- Sector, towns or areas served, what they sell, the 3 services that make the most money.
- Who the customer is, how they find the business today, what the customer must do on the site
  (call, WhatsApp, quote request, booking, visit the shop).
- Competitors' sites the client likes or hates.

**Content and assets** (the usual blocker: ask early)
- Logo (vector if possible), real photos (own them? license?), texts, prices or price ranges, opening
  hours, reviews they can prove (link to Google reviews, never copy them in as invented quotes).
- Do they have an old site? Get the URL: keep its URLs for redirects and SEO.

**Accounts and access**
- Domain: who owns it, registrar login, current DNS and email provider (do not break their email).
- Google Business Profile access, Search Console, analytics wishes.
- Where form submissions go: which email, who answers, how fast.

**Functionality** (pick, do not assume)
- Contact or quote form, WhatsApp button, click to call, map, booking or availability calendar,
  quote calculator, multilingual (which languages), blog or news, photo gallery, downloadable brochure,
  gift vouchers, self-editing by the client (CMS or not).
- Use the estimator logic in `src/lib/estimate.ts` + `site.estimate` to price these extras.

**Legal role:** the client is the data controller (titolare del trattamento); Lorenzo is the developer
and possibly a data processor (responsabile) if he hosts or manages the forms. Settle this in the contract.

## 3. Stack that worked (reuse it)

- **Astro (static output)**, TypeScript, no framework runtime unless needed. Content in typed config
  (`src/config/site.ts`) and content collections. Fonts self-hosted (`public/fonts`).
- **GSAP** (timelines, SplitText, ScrollTrigger) only where it earns its place. **Lenis** smooth scroll on
  mouse only. **three.js** only for a hero object, loaded late and gated (section 6).
- **Hosting: Cloudflare Pages** (free, fast in Italy, `_headers` file for security headers and cache).
  Netlify or Vercel are fine alternatives. Static output means no server to maintain.
- **Forms:** Web3Forms (free tier, key in `PUBLIC_WEB3FORMS_KEY`) with a **WhatsApp fallback** that
  pre-fills all answers if the request fails (`src/scripts/forms.ts`). Optional Google Apps Script that
  logs submissions to a Sheet (`automation/`). Confirm Web3Forms' current free limits and its data
  location before using it for a client (I have not checked recently: about 60% sure the free tier is
  still enough for a small business).
- **Analytics:** cookieless only (Cloudflare Web Analytics, Plausible or Umami). Then no cookie banner is
  needed for analytics. Google Analytics 4 means a consent banner and prior blocking: avoid unless the
  client insists.

## 4. Functionality checklist for a real client site

Each item needs to **work in production**, not just look right.

**Contact and conversion**
- Phone as `tel:` link (E.164), WhatsApp as `https://wa.me/<number>?text=<prefilled>`, email `mailto:`.
- Forms: client-side validation with Italian messages (patterns in `forms.ts`: `isPhone`, `isEmail`),
  `aria-invalid` + error text, honeypot field for spam, a privacy checkbox only where consent is the legal
  basis (for answering a request, legitimate interest/pre-contract usually applies: show the notice link,
  the checkbox is often not required; about 70% sure, check with the lawyer), success page
  `/grazie/`, clear failure state with the WhatsApp fallback.
- **Test the real submission** end to end on the live domain: the client receives it, the reply-to is
  the customer, it does not land in spam.
- Sticky mobile call/WhatsApp bar that hides over forms and footers (`StickyBar.astro`).

**Maps and embeds** (privacy)
- A Google Maps iframe loads Google cookies: use a static map image or an address link to Google
  Maps, or click-to-load after consent. Same for YouTube (use `youtube-nocookie` + click-to-load).

**Booking / availability** (B&B, venues)
- Do not build a booking engine. Link or embed the provider the client already uses (Booking channel
  manager, Smoobu, Krossbooking, etc.) and note the provider's own privacy terms. Quote the monthly fee as
  a cost not paid to Lorenzo (the estimator already separates these).

**Self-editing (CMS)**
- Only if the client really edits. Options: Decap CMS or Tina on top of Git (free, static stays static),
  or a hosted CMS. Otherwise: Lorenzo edits on request (simpler, and a recurring service).

**Multilingual**
- Separate URLs per language (`/en/...`), `hreflang` tags, language switcher that keeps the page.
  Translations by a person or checked by one: machine text on a hotel site loses bookings.

## 5. Legal and compliance (Italy / EU)

Not legal advice: write drafts, flag them, and have the client's lawyer or accountant read them.

- **Footer must show the P.IVA** for a business site (art. 35 DPR 633/1972; about 85% sure), plus legal
  name and registered office; REA and share capital for companies.
- **Privacy policy** (GDPR art. 13): who the controller is, what data the forms collect, why, legal basis,
  retention, processors (hosting, Web3Forms or equivalent, email provider), rights, contact. Drafts in
  `src/lib/legal.ts` are a starting point.
- **Cookies:** Garante guidelines of June 2021 (about 85% sure of the date). Technical cookies and
  cookieless analytics need no banner. Anything that tracks (GA4, Meta Pixel, Maps, YouTube, Hotjar)
  needs a banner with "Accetta" and "Rifiuta" equally visible, no pre-ticked boxes, and nothing loaded
  before consent. Easiest compliance: do not use them.
- **Fonts:** self-host, never load Google Fonts from Google's servers (a 2022 Munich court ruling fined a
  site for it; about 90% sure).
- **Accessibility:** target WCAG 2.2 AA anyway. The European Accessibility Act (in force from June 2025)
  applies to some services sold online; micro-enterprises (under 10 staff and under 2 M EUR turnover)
  are exempt for services (about 80% sure). Do not promise "legal compliance", deliver AA and document it.
- **Images and text:** only what the client owns or licensed; keep the license proof in `docs/`.
- **3D models and libraries:** check licenses (CC BY needs visible credit; see `docs/CREDITI.md`).
  Trademarks: no brand logos (the iPhone and MacBook logos were removed from the 3D models).

## 6. Technical lessons (bugs we already paid for)

**Mobile and Safari**
- Hover effects only inside `@media (hover: hover) and (pointer: fine)`; give touch an `:active` state.
- `color-scheme: light only` (meta + CSS) or iOS dark mode recolours form controls.
- Use `svh` for full-height blocks (after a `vh` fallback line); `env(safe-area-inset-*)` for notches.
- Sticky header: opaque background, no blur over moving content, never hide-on-scroll on touch (it
  glitched with iOS momentum and rubber-band scrolling).
- `ScrollTrigger.config({ ignoreMobileResize: true })`, and in your own resize handlers ignore
  height-only changes: the address bar resizes the window all the time on phones.
- Non-breaking space before `€` (` €`), never a lone euro sign on its own line.
- Big buttons need a smaller size at 360 px and below; test 320 px.

**Typography and motion**
- SplitText line masks clip descenders: add `padding-bottom: .16em; margin-bottom: -.16em` to masks and
  `split.revert()` when the rise ends.
- `font-synthesis-weight: none` (not `font-synthesis: none`, which kills italics).
- Keep GSAP `lagSmoothing` on (`500, 33`): with it off a tab switch sent films straight to their end.
- Animate transforms and opacity only; moving things with transforms gives zero layout shift (CLS).
- After `timeline.invalidate()`, unplayed tweens with immediateRender re-apply their start values, and
  `time(t)` with the same `t` draws nothing: step to `t - 0.001` then `t`.
- Respect `prefers-reduced-motion`: the final, readable frame without any animation.

**Astro and CSS**
- Scoped styles do not reach elements built by scripts: use `:global(...)` for them.
- Two rules with equal specificity: the later one wins. A phone rule further down overrode a laptop rule;
  doubled class (`.a.a--desk`) fixed it.
- `offsetLeft` math needs the expected ancestor to be positioned (`position: relative`).
- `display: contents` on a column lets phones reorder its children with `order`.
- An ancestor with `overflow: hidden` clips a scaled child: check every ancestor when something is cut.

**3D in the page (three.js + HTML screen on top)**
- Gate it: no WebGL, Save-Data, under 4 GB memory or under 4 cores means CSS fallback. Handle
  `webglcontextlost`. Free probe contexts (iOS allows few).
- Preload models at idle, create the renderer at the first gesture, and make the film wait for
  "ready": otherwise the CSS stand-in is seen turning into the 3D model.
- Surfaces that must be black (screen, bezel) use an unlit material: glossy black mirrors the environment
  and turns grey, mauve or white depending on the angle.
- Canvas room must cover perspective: a laptop base comes towards the camera and was clipped.
- Headless Chromium here has no GPU: 3D frames are very slow, timings and some screenshots lie. Never
  conclude a bug from a headless 3D timing alone; verify with numbers (computed transforms) and say what
  needs a real device.

**Performance**
- Static HTML, self-hosted fonts with `font-display: swap`, responsive `astro:assets` images (AVIF/WebP,
  width and height set), lazy below the fold, heavy scripts loaded with `later()` (idle) or at first
  gesture. Budget: Lighthouse mobile 90+ on every page.

## 7. SEO and local presence

- One `<h1>` per page, titles and descriptions written by hand, canonical URLs, sitemap, `robots.txt`.
- JSON-LD `LocalBusiness` (or the right subtype: `HomeAndConstructionBusiness`, `LodgingBusiness`...),
  with NAP (name, address, phone) identical to the Google Business Profile.
- Old site: map every old URL to a new one with 301 redirects (`_redirects` on Cloudflare Pages).
- OG images per page. Real alt text on photos (describe the job: "bagno rifatto a Lambrate").
- After launch: Search Console property, submit the sitemap, link the site in Google Business Profile.

## 8. Process that worked

1. Discovery (section 2) and a written brief in `docs/BRIEF.md`.
2. Content first: real texts and photos drive the layout. Placeholders as `[DA COMPILARE: ...]` in one
   config file, highlighted in dev, and `npm run predeploy` fails while any remain.
3. Build in this order: layout and type, pages with real copy, functionality, motion last.
4. After each batch: run every check (section 9), look at screenshots at 1440, 1280 and 390 px yourself,
   then commit, push, and publish the preview artifact.
5. Show Lorenzo screenshots or the preview link, ask for reactions, iterate.
6. Launch checklist (section 10), then handover.

## 9. Quality checks (scripts already in `focale/scripts/`)

- `npm run check` (astro check + tsc): 0 errors.
- `node scripts/overflow-check.mjs`: no clipped text at any width.
- `node scripts/a11y.mjs`: axe on every page, with and without reduced motion: no violations.
- `npm run test:forms`: real form flows, including the failure fallback.
- `npm run check:copy`: banned words, em dashes, placeholder leaks.
- `npm run check:placeholders` / `npm run predeploy`: blocks the build while `[DA COMPILARE]` remains.
- Lighthouse script for performance budgets.
- **Pixel diff** when only phones should change: build the previous commit in a git worktree, serve it on
  another port, screenshot both at 1440 and 1280 with reduced motion, compare with PIL.
- Preview: `node scripts/export-artifact.mjs`, then publish `preview/` as an artifact (models ship as
  base64 `.txt`; diff the file list with the previous publish and null out removed files).
- Debug hooks for films (`window.__mkTl`) are temporary: add, use, and remove before committing.

## 10. Launch and handover checklist

- [ ] Every `[DA COMPILARE]` filled; legal pages read by a professional; P.IVA in the footer.
- [ ] Domain DNS on Cloudflare without touching MX records (client email keeps working); HTTPS on;
      `www` and bare domain redirect to one canonical host.
- [ ] Form sends to the client's real address, tested from a phone on mobile data; SPF/DKIM of the
      sending service checked so replies do not hit spam.
- [ ] Old URLs redirected; 404 page useful (call/WhatsApp on it).
- [ ] Search Console verified, sitemap submitted, Google Business Profile links to the site.
- [ ] Analytics cookieless and working; no third-party cookies before consent (check DevTools).
- [ ] Real devices: an iPhone in Safari, a mid Android in Chrome, a laptop in Safari and Chrome.
- [ ] Accessibility statement and checks documented in `docs/`.
- [ ] Handover doc for the client in plain Italian: how to ask for changes, where the site lives, who owns
      which account (the client should own domain and accounts; Lorenzo gets access).
- [ ] Contract covers: what is included, revisions, who is controller/processor, hosting and renewal costs,
      maintenance terms.

## 11. Open risks to raise with Lorenzo early

- He is a minor: contracts, invoicing and the P.IVA question need his accountant (and possibly a parent
  or guardian) before he takes payment. Not legal advice.
- Content delays from the client are the usual reason projects stall: set a date for assets in writing.
- 3D and heavy motion look great on his laptop; on a cheap Android they can stutter. Keep the CSS
  fallback, test on a low-end phone, and prefer less motion on a client site than on his own showcase.

---

## 12. Visitor psychology: what the research says (and how to apply it to a client)

Full reports with sources are in the repo root `reports/` (research notes in `research_notes/`):
`Why visitors dive into websites.md`, `Layout e call to action.md`, `Sito desktop su iPhone e mobile.md`,
`Stima preventivo siti web.md`. They were written for the studio's own site; the rules below are the
parts that transfer to a client's local-business site. Evidence marks: **[E]** measured study or standard,
**[P]** practitioner or vendor data (directional), **[S]** our judgment.

**The order a visitor decides in** (the core model): looks simple and familiar in under a second, says
what it offers and for whom in about ten seconds, then every scroll proves a real, reachable, competent
business stands behind it.

1. **First 50 ms: simple and familiar wins.** Appeal is judged in 50 ms and the judgment sticks; low
   visual complexity plus "looks like a typical site of its kind" rates best; trust at 50 ms is driven
   by visual appeal (Lindgaard; Tuch/Google; Reinecke) [E]. Design look is the most cited credibility
   factor (Stanford, 46% of comments) [E]. **Apply:** conventional skeleton (nav, offer headline, real
   work, contact), craft in the details, not in a weird structure.
2. **Ten seconds, two screens.** 57% of viewing time above the fold, 74% in the first two screens; 80%
   of fixations on the left half (NN/g eyetracking) [E]. Value proposition must land in ~10 s [E].
   **Apply:** first viewport on a 375 px phone = one sentence the customer understands (what, for whom,
   where), one reason to believe (a real photo of the work), one primary action, a visible sliver of the
   next section.
3. **False floor.** A full-screen hero or a wide empty band makes the page look finished and people stop
   (NN/g "illusion of completeness") [E]. Whitespace groups; dead space ends the page. Let the next
   section peek.
4. **Headings carry the argument.** People scan headings ("layer cake") and dip into text [E]. Write
   headings as takeaways ("Bagno rifatto in 10 giorni, preventivo scritto"), never "Chi siamo" alone.
5. **Real photos are content, stock is ignored.** Real people and real products get studied; decorative
   stock gets skipped (NN/g) [E]; owner photo beats stock in trust (BrightLocal, small sample) [P].
   **Apply:** push the client hard for real photos of jobs, rooms, team. A face looking toward the CTA
   pulls attention to it [E, thin].
6. **Trust without testimonials:** named owner with face, P.IVA, published "from €" prices or price for
   common cases (hidden prices send people to competitors, NN/g) [E], written process, true risk reducer.
   Voluntary cost transparency raised sales up to ~20% (HBS) [E]. **Fake or manipulated reviews are
   illegal** (Omnibus, D.Lgs. 26/2023) [E]: link to real Google reviews instead.
7. **One action, repeated after each proof.** Single-CTA pages converted 13.5% vs 10.5% (Unbounce,
   secondary source) [P]. Put the same button (same words, same destination) in hero, after the main
   proof, on price cards, at the end, plus a sticky mobile bar. Never two filled buttons in one section.
8. **Button: contrast, not hue.** "Red beats green" is an isolation effect [E/P]. One accent colour used
   only for the action. Check WCAG: 4.5:1 text, 3:1 UI. Watch white on orange (often fails) and white on
   WhatsApp green #25d366 (1.98:1, fails): use navy labels / outlined WhatsApp button.
9. **Labels name what you get:** "Chiedi il preventivo gratuito", "Prenota la visita", never "Invia",
   "Contattaci", "Scopri di più" [P]. Microcopy next to the doubt ("Rispondiamo entro 24 ore", "Niente
   spam"), and **only if literally true**: false reassurance backfires [P].
10. **Forms: short.** Text areas, drop-downs and phone fields cost conversions (HubSpot, 40k pages) [E];
    explain why you ask for a phone (Baymard) [E]. 3 to 4 single-line fields. Multi-step only if data
    shows drop-off (big multi-step claims come from vendors) [P].
11. **Italy runs on WhatsApp:** ~90% of Italian internet users [E]. Always offer `wa.me` with a
    prefilled message next to the form and phone. No controlled test proves it beats forms [S].
12. **Motion explains, never hijacks.** Moving things steal attention from the headline; UI transitions
    100 to 500 ms (NN/g) [E]. Scrolljacking hurts control, discoverability and task success [E]; parallax
    can cause dizziness [E]. Before/after demos are legitimate motion (they explain the product). Loops
    over 5 s need a pause/replay control (WCAG 2.2.2) [E].
13. **3D is evidence of craft, not a conversion driver.** No independent A/B test of a 3D hero exists;
    a concrete-fact hero beat an animated one (+18% vs +5%, vendor study) [P]. Headline and CTA sit above
    or beside the visual, never below it; the headline renders as plain HTML so LCP never waits for WebGL.
    For most client sites: skip 3D, spend the craft on real photos and speed.
14. **Phones and speed set the ceiling.** ~88% of Italians' online time is on mobile [E]; in Italy
    Android is ~63 to 66% of mobile traffic and Chrome ~68 to 70% (StatCounter) [E]: "works on my iPhone"
    covers one mobile visitor in three. Vodafone Italy: 31% better LCP gave 8% more sales [E]; bounce
    rises 32% from 1 s to 3 s load (Google) [E].
15. **Typography for owners aged 45 to 65:** body 17 to 18 px, x-height ≥ 0.50 em, never weights below
    400 at text sizes, 50 to 75 characters per line (40 to 60 on phones), inputs ≥ 16 px (iOS zoom) [E].
    No font proved universally best (Adobe/Wallace) [E]. Avoid the template look (Inter, a serif accent
    word, the "second tier" Satoshi/Manrope/DM Sans/Bricolage) [P/S]: pick a face with a real story.
16. **Pricing honesty:** a genuine top tier can anchor the middle plan; "Consigliato" is fine, "Il più
    scelto" is not unless true; no fake countdowns or "posti rimasti" [P/S]. For quotes: a reasoned range
    beats an exact number; show the result only at the end (people game live prices) [S, Lorenzo].

**What nobody has measured** (test with 5 real customers of the client, five-second tests and recorded
sessions, rather than assume): template look vs trust, 3D vs static, CTA repetition count, WhatsApp vs
form for Italian local services, Italian button copy.

## 13. How to make things (recipes from this project)

### A 3D device with a live HTML screen (iPhone / laptop)
Files: `src/components/IPhone.astro`, `src/components/Laptop.astro`, `src/scripts/phone3d.ts`,
`src/scripts/hinge.ts`, `src/scripts/makeover.ts`.

1. **The HTML device is the truth.** Build the device in CSS (screen in container units so its content
   scales with the width), animate it with CSS/GSAP transforms inside a rig element with `perspective`.
   This is also the fallback when WebGL is missing.
2. **Find a model:** GLB with a commercial licence (CC0 or CC BY with credit). Sketchfab and most CDNs
   are blocked from the build machine; `raw.githubusercontent.com` mirrors work (the iPhone came from a
   tutorial repo, the MacBook from `william-laverty/rigged-macbook-3d`, already rigged at the hinge).
   Verify the licence on the original page, credit it in the footer and `docs/CREDITI.md`.
3. **Inspect it:** `npx @gltf-transform/cli inspect model.glb` (meshes, materials, sizes). Render it alone
   in a scratch page with three.js to find which mesh is what (paint one mesh red at a time).
4. **Optimise:** `gltf-transform optimize --compress meshopt --texture-compress webp --texture-size 1024`;
   load with `GLTFLoader().setMeshoptDecoder(MeshoptDecoder)`. Aim for about 1 MB.
5. **Clean it:** hide or cut brand logos (trademark): hide the logo meshes, or drop faces by normal
   direction when the logo shares a mesh with something you keep. Recolour (silver here).
6. **Black parts that must stay black** (screen, bezel): `MeshBasicMaterial` (unlit). Glossy black
   mirrors the environment and shows grey, mauve or white by angle.
7. **Sync 3D with CSS:** multiply the CSS transforms from the device up to the rig (`chain()` in
   `phone3d.ts`), convert to three.js axes (flip y), and build a camera that reproduces the CSS
   perspective and perspective-origin. Place the model so its screen sits exactly under the HTML screen
   (measure the model's screen size and hinge; the laptop lid shares one angle via `hinge.ts`).
   The HTML screen stays on top, the canvas sits behind with an alpha background.
8. **Gate and load:** WebGL + no Save-Data + ≥ 4 GB + ≥ 4 cores, else CSS. Preload models at idle,
   create renderers at the first gesture, draw only when the pose changes or the rig is on screen,
   lower pixel ratio while moving, sharp frame when still, handle `webglcontextlost`.
9. **WebKit traps** (mobile report): `preserve-3d` flattens under `overflow`, `opacity < 1` or `filter`
   on an ancestor; too many layers + WebGL + big images can kill the tab on iPhone. Test the direct URL,
   not the claude.ai preview (its iframe throttles timers to ~30 fps and audio follows the silent switch).

### A short explanatory film (before/after, product demo)
Files: `src/components/Makeover.astro`, `src/scripts/makeover.ts`, `src/components/demo/OldSite.astro`.

- One GSAP timeline in seconds, written as a script at the top of the file; one thing at a time.
- Plays when in view (IntersectionObserver), pauses when it leaves, **never pinned**, stays finished
  once over; a replay button and a sound toggle are the only controls.
- Status text derived from the timeline clock (`sync(t)`), so seeking or replaying never desyncs it.
- "Lens" zoom: scale only the piece in place (transform-origin computed so the scaled box lands inside
  the screen), dim the rest with a huge box-shadow spotlight, a floating label explains it.
- Measure pieces on layout boxes (`offsetLeft` chain), re-measure on width changes only, redraw after
  `invalidate()`.
- Mini-film pattern: device alone in the middle, then it glides to its column and the words come in;
  transforms only (no CLS), words hidden with autoAlpha and revealed with a stagger.
- Without JS or with reduced motion: the final frame and an `sr-only` list of what changes.

### Sound
`src/scripts/sound.ts`: every cue is synthesised with Web Audio (no audio files). Off until the visitor
presses a speaker button; one page-wide switch; `navigator.audioSession.type = "playback"` on iOS.

### Images when there are no photos yet
`scripts/illustrations/`: scenes written as SVG code and rendered to JPEG with `sharp`. Good for
clearly-labelled demos; **for a real client, real photos win** (section 12, point 5).

### Logo and favicons from a font
`scripts/logo.mjs` + `scripts/fonts-build/`: glyph outlines extracted with fontTools, written as SVG,
favicons rendered with `sharp`. Licence of the font must allow it (OFL does).

### Quote estimator
`src/lib/estimate.ts` (logic shared by server and client) + `src/components/Estimator.astro` (one question
per screen, result only at the end, a range not a number, costs not paid to the studio listed apart).
Ask about mechanisms ("vuoi che le camere si aggiornino da sole?"), not counts.

### Scrollable demo of a site inside a device
`src/components/DemoViewer.astro`: a real iframe rendered at 390 or 1280 px and scaled, loaded when in
view; on touch it wakes with a tap so a swipe never traps the page.

### Verifying visual work without a real device
- Screenshots at 1440, 1280 and 390 px (Playwright, `scripts/browser.mjs`), contact sheets with PIL, look
  at them before claiming anything.
- For animations, a temporary debug hook (`window.__mkTl`) to seek the timeline to exact beats.
- Measure instead of guessing: computed transforms, pixel colours sampled from the user's screenshot,
  a red material to reveal misalignment.
- Headless has no GPU: 3D timing and some frames lie. Say what needs a real iPhone and a mid Android.
