# Focale

Website for **Focale**, a one-person web studio in Milan that rebuilds the websites of small
Italian businesses so they get more enquiries. Static Astro site, Italian copy, hosted on
Cloudflare Pages. Nothing has been deployed yet.

> **Do not publish before the commercialista meeting and before `npm run predeploy` passes.**
> What is left to do is in [`TODO-LORENZO.md`](TODO-LORENZO.md).

## What's inside

- **Pages:** home, come funziona, prezzi, lavori (+ 3 case pages and 3 full demo sites),
  3 sector pages (`/per/...`), chi sono, anteprima gratuita (3-step form), contatti, grazie,
  private pitch pages (`/anteprime/...`), condizioni, privacy, cookie, 404, `/styleguide`.
- **Signature animation:** an old website renovated on scroll (GSAP ScrollTrigger, Flip,
  DrawSVG), with a mobile version and a static version for reduced motion and no JavaScript.
- **Calculator**, FAQ accordions, mobile menu, sticky mobile bar, WhatsApp fallbacks.
- **SEO:** titles and descriptions per page, canonical URLs, Open Graph images generated at
  build time, JSON-LD (ProfessionalService, FAQPage, BreadcrumbList, Service), sitemap,
  robots.txt, security headers for Cloudflare (`public/_headers`).
- **Privacy:** no cookies, no storage, self-hosted fonts, no third-party requests except
  Web3Forms on submit, the optional Apps Script and the optional Cloudflare beacon.

## Run it

Requires Node 22.12 or newer.

```
npm install
npm run dev          # http://localhost:4321, placeholders get a dashed yellow outline
npm run build        # static site in dist/
npm run preview      # serve dist/ on http://localhost:4321
```

### Checks

| Command | What it does |
| --- | --- |
| `npm run check` | `astro check` and `tsc` |
| `npm run check:placeholders` | Lists every `[DA COMPILARE: ...]` left in `src/` and `dist/` |
| `npm run check:copy` | Scans built pages for dashes, "noi", English words, leftovers |
| `npm run predeploy` | Build, then fail if any placeholder remains |
| `npm run test:forms` | End-to-end tests of forms, calculator, menu, pitch page, demos (Web3Forms mocked) |
| `npm run screens` | Full-page screenshots of every page at 390, 768, 1440 into `docs/screens/` |
| `npm run a11y` | axe-core scan of every page (writes `docs/a11y.md`) |
| `npm run lighthouse` | Lighthouse mobile on every page (writes `docs/lighthouse.md`) |
| `node scripts/anim-shots.mjs` | Animation verification frames into `docs/screens/animations/` |

The browser-based scripts need `npm run preview` running in another terminal. They use
Playwright's Chromium (`npx playwright install chromium` once) or `PW_CHROMIUM` / `CHROME_PATH`.

## Filling in the business data

Everything personal or business-specific lives in **`src/config/site.ts`**: name, age, legal
name, VAT number, address, email, phone, WhatsApp, domain, prices, delivery days, deposit,
founders' spots. Prices, days and percentages shown anywhere on the site are read from there.
Environment variables (see `.env.example`):

- `PUBLIC_WEB3FORMS_KEY`: form emails via Web3Forms.
- `PUBLIC_SHEETS_ENDPOINT`: optional Google Sheet log (`automation/README.md`).
- `PUBLIC_CF_BEACON_TOKEN`: optional Cloudflare Web Analytics (cookieless).

### Founders counter

Edit `foundersSpotsLeft` in `src/config/site.ts`. At `0` the founders section closes and
founder prices disappear everywhere.

### Changing prices

Edit `prices` in `src/config/site.ts`. Plan features are in `src/lib/plans.ts`.

### Adding a pitch page for a prospect

```
npm run nuova-anteprima -- --nome "Nome Attività" --settore "Impresa edile" --zona "Milano, Lambrate" --sito "https://..."
```

It creates `src/content/anteprime/{name}-{4 random characters}.yaml` with `published: false`
and prints the future URL. Add a screenshot of their current site and one of the new homepage
on a phone to `src/assets/anteprime/`, write the three changes and your note, set
`published: true`, rebuild. The page is `noindex`, excluded from the sitemap and blocked in
robots.txt; the random suffix makes the URL unguessable.

### Reviews

Only real Google reviews, never paid for. Add them to `reviews` in the config; the section
appears by itself.

## Deploy to Cloudflare Pages

This folder lives inside a larger repository, so set the root directory.

1. Push the repository to GitHub.
2. Cloudflare dashboard > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**,
   pick the repository.
3. Build settings:
   - Framework preset: **Astro**
   - Root directory: **`focale`**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
   - Environment variable `NODE_VERSION` = `22`
4. Add the `PUBLIC_` variables above (Settings > Environment variables), then redeploy.
5. **Custom domains** > add your domain. Then set `url` in `src/config/site.ts` to it and
   redeploy, so canonical URLs, the sitemap and social images use the real domain.

Do not use Vercel's free plan: it is for non-commercial use only. Cloudflare Pages' free plan
allows commercial sites and has no bandwidth cap.

## Project map

```
src/config/site.ts        business data and placeholders (the only place for them)
src/content/              FAQ, sectors, demo projects, pitch pages (YAML, zod schemas in content.config.ts)
src/lib/                  helpers: formatting, plans, legal texts, schema.org, OG registry
src/components/           UI; demo/ holds the Arcadi hero, the old site and the slider
src/scripts/              client-side TypeScript: hero, renovation, calculator, forms, smooth scroll
src/pages/                routes; og/[key].png.ts renders social images at build time
scripts/                  logo, illustrations, screenshots, Lighthouse, axe, tests, pitch pages
automation/               optional Google Apps Script request log
docs/                     brief, original plan, name rationale, credits, reports
```

## Notes

- Design decisions and rules for future changes: `CLAUDE.md`.
- The demo illustrations are drawn by `scripts/illustrations/` (`npm run illustrazioni`);
  see `docs/CREDITS.md`.
- Logo and favicons are generated from the Archivo font: `npm run logo`.
