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
