# Extra build time per feature: small static/brochure sites for local businesses (2025-2026)

> Research note, October 2026. **Method caveat:** this sandbox could not fetch most pages directly (DNS failures on uxdesign.cc, playcode.io, jennyb-designs.com, projectcostestimator.com), so most citations below come from search-result extracts, not full-page reads. Treat quoted figures as accurate to the snippet but unverified in context. Published hour figures per *feature* are very scarce. Most sources give totals, prices or calendar weeks, not hours. Where sources are thin, the estimate is marked **[REASONING]**. It is built from the studio's own baseline: 1 page ≈ 7 working days, 6 pages ≈ 10 working days, so each extra standard page ≈ 0.6 working days end to end. Hours assume about 6 productive hours per working day.

## 1. Hours per feature

### Takeaway
Public sources reliably back four figures: copy at 2-4 h per page, content migration at 15-45 min per simple page, 2-3 included revision rounds, and very fast embeds for maps, booking links, Stripe and Shopify (minutes of vendor setup). Everything else has to be built from component-level reasoning. The table below combines both and labels which is which.

### Cited Findings

**General calibration (whole-site hours)**
- A static 5-page site was quoted at 16-24 h by one developer and 40-65 h by another. A third said "a single day or 40 hours" depending on experience and reusable code. Source is an older forum thread (about 2015). — [ProcessWire forum](https://processwire.com/talk/topic/10502-how-many-hours-would-you-quote/)
- One web designer: "a simple brochure site with 5-10 pages may take anywhere from around 40-80 hours, including planning, design, content collection, and development." — [JennyB Designs](https://jennyb-designs.com/how-many-hours-does-it-take-to-design-a-website/)
- A UX freelancer budgets about 2 h of design per page section, about the same again for the navigation and footer, and about 2 h more to build a simple custom section. — [uxdesign.cc, Freelance designer 101](https://uxdesign.cc/freelance-designer-101-pricing-strategies-work-capacity-6039fb6526e2)
- Calendar time: about 1-7 days for a content-ready one-page site, 1-4 weeks for a 5-10 page business site, and 4-16+ weeks for e-commerce or integrated work. Content and review delays drive the timeline. — [PlayCode blog](https://playcode.io/blog/how-long-does-it-take-to-build-a-website)
- Gig listings for 5-page sites quote 5 days to 2-3 weeks of elapsed time. — [Dribbble services](https://dribbble.com/services/66728-Website-Design-Start-from-5-Pages)

**Copywriting per page**
- A self-writing guide budgets 2-4 h per page for writing and review. — [Instrumental, guide to writing your own web content](https://www.instrumental.net/blog/writing-your-own-web-content)
- A freelance web copywriter: 2-3 h to draft a page plus 1-2 h to edit, so 3-5 h per page. — [Contra, Website Copy by Indira Midha](https://contra.com/s/6NX26kPk-website-copy)
- An agency writes a full 7-10 page site in 3-4 h with a research-first process and AI help. This is a low-end outlier. — [Relume community](https://community.relume.io/x/general/rqi32swctdxa/best-practices-for-writing-website-copy-agency-ins)
- "An experienced copywriter can take twelve, fifteen hours or more to write copy for a typical website", and a business owner writing their own may need 2-3 times as long. — [Gecko Hospitality franchise blog](https://franchise.geckohospitality.com/?p=39652)
- A catalog copywriter spends about 1-1.5 h per copy block, and some 150-175-word blocks have taken 4 h. — [Total Retail](https://mytotalretail.com/article/day-with-a-pro-catalog-copywriter-1-290-words-21066/12)

**Content migration per page**
- Manual migration rule of thumb by complexity: Easy 15 min per page, Medium 25 min per page, Hard 45 min per page. Source is from 2014. — [Oshyn, content migration estimation](https://www.oshyn.com/blog/content-migration-estimation)
- About 3 simple pages per hour, and 1-2 h per complex page. Content-type complexity matters more than page count. — [idfive developer docs](https://developers.idfive.com/docs/general/content_migration/overview)
- A university web team prices migration-only work (no content development) at 5-8 h for 0-50 pages and 7-11 h for 51-100 pages. — [WSU CAHNRS migration cost sheet](https://communications.cahnrs.wsu.edu/website-migration-cost-sheet/)
- A dealer-site estimate used 12 min per page. — [search extract, Atlassian wiki](https://arinet.atlassian.net/wiki/x/WYBTBwE)

**Multilingual (2nd and 3rd language)**
- Multilingual premiums reported by vendor blogs:
  - a multilingual B2B site costs 20-35% more than a monolingual one;
  - Berlin build premium 25-45%;
  - Amsterdam premium 30-50%;
  - one Europe/Africa piece says each extra language adds 40-60%, which is per language rather than one-off.

  — [Kolonell blog, multilingual B2B build cost 2026](https://kolonell.com/en/blog/multilingual-b2b-website-build-cost-2026); [Kolonell Berlin](https://kolonell.com/en/blog/multilingual-b2b-website-cost-berlin-2026); [Kolonell Amsterdam](https://kolonell.com/en/blog/multilingual-b2b-website-cost-integration-amsterdam-2026); [Kolonell Europe-Africa](https://kolonell.com/en/blog/multilingual-website-cost-europe-africa-2026). **Caveat:** these are near-identical city-variant SEO articles from one vendor, so they are weak evidence.
- Translation: €0.10-0.18 per word for professional human translation, €0.04-0.08 per word for AI post-editing with professional review. Hreflang setup plus sitemaps: €300-800 per language, one-off. — [ProjectCostEstimator, multilingual website cost 2026](https://projectcostestimator.com/blog/multilingual-website-cost-2026) (via search extract)
- €1,800-4,500 per additional language. Hreflang for a 3-language site: €400-900. "The real risk is not the price: it is a mis-implemented hreflang." — [Kolonell Brussels](https://kolonell.com/en/blog/multilingual-website-cost-brussels-2026); [Kolonell Berlin](https://kolonell.com/en/blog/multilingual-b2b-website-cost-berlin-2026)

**Booking engines (hospitality)**
- **Beds24:** the iFrame Generator is under Settings > Booking Engine > Booking Widgets ("Get Code", then paste into the site). Beds24's own wiki warns that iframes "can offer a sub-optimal usability experience" and suggests opening the booking page in a new tab instead. Search widgets can pass dates and guests through URL parameters. — [Beds24 wiki, Embedded Iframe](https://wiki.beds24.com/index.php/Embedded_Iframe); [Beds24 booking widgets](https://beds24.com/en/features/booking-widgets)
- **Smoobu:** under Configuration > Booking Engine > Embed in Website there are two codes, one for all accommodations and one per property. A plain "Book Now" link to the external page is also supported. — [Smoobu support](https://support.smoobu.com/hc/en-us/articles/360010836700-How-to-integrate-Smoobu-booking-engine-into-my-external-site-)
- **SiteMinder:** integration is "through some links and widgets": a Book Now button and a date-picker widget that redirects to the booking engine, with HTML snippets provided per integration type. — [SiteMinder help](https://help-classic.siteminder.com/en/articles/8673807-booking-engine-integrate-the-booking-engine-with-your-website-using-links-and-widgets)
- **AvaiBook:** offers a direct link or an iframe, and the link can carry a source identifier for attribution. — [AvaiBook help](https://helpcenter.avaibook.com/en/articles/1589779-web-link-configure-link-or-iframe)
- **Mews:** the site must be served over HTTPS, and the widget snippet must not be placed inside an iframe. — [Mews booking engine guide](https://docs.mews.com/booking-engine-guide/booking-engine-widget/getting-started)
- **Octorate and Krossbooking:** no public integration docs turned up in search (see Gaps).

**Payments, vouchers, e-commerce**
- Stripe Payment Links create a hosted payment page without code. They can go on a website, and an embeddable buy button is also available. — [Stripe docs, no-code](https://docs.stripe.com/payments/no-code); [Stripe Payment Links](https://docs.stripe.com/payment-links)
- A small business can put a static catalog page on Payment Links and "start accepting online payments with no further development effort." — [Soliant Consulting](https://www.soliantconsulting.com/blog/stripe-payment-links/)
- Shopify Buy Button: vendor blogs say it works on the $5/month Starter plan and "takes 15 minutes to set up", suits about 1-25 products, and gives limited design control (any style change means generating and pasting a new embed). — [EasySell](https://easysellapp.com/blogs/wiki/how-to-add-shopify-buy-button-any-website); [Let's Talk Shop](https://www.letstalkshop.com/blog/shopify-buy-button-on-external-website). These are third-party sources, so verify plan pricing with Shopify.

**Maps and other embeds**
- A basic Google Maps iframe embed takes about 5 minutes. API work (routing, geo-analytics) is a much larger job. — [Wezom, Google Maps integration guide 2026](https://wezom.com/blog/complete-google-maps-platform-integration-guide-for-websites-and-applications)
- Calculators list a contact form, Google Maps and a newsletter signup as standard add-ons, without hours. — [Vividfy calculator](https://vividfy.com/project-estimation-cost-calculator/)

**Blog / CMS on Astro**
- Decap CMS on Astro: off Netlify, you must create your own OAuth routes. Authentication is the main extra work. — [Astro docs, Decap CMS](https://v4.docs.astro.build/ar/guides/cms/decap-cms/)
- Keystatic is Git-based with no database and can edit content in the GitHub repo through Keystatic Cloud. Internal linking is manual via relationships. — [Cosmic Themes, Keystatic](https://cosmicthemes.com/blog/keystatic-cms-integrated/)
- For structured content, multiple authors, permissions, previews and localization, Sanity, Storyblok, Payload or headless WordPress are stronger choices, but they are heavier to set up. — [bitdoze, best headless CMS for Astro](https://www.bitdoze.com/md/best-headless-cms-for-astro.md)
- No source gave setup hours for a CMS (see Gaps).

**Revision rounds**
- Included rounds are usually 2-3 for web design, and "3 rounds of revisions are usually sufficient." Extra rounds are billed hourly; sample clauses use $75/h and $149/h. — [DEV, pricing web design projects](https://dev.to/brenohal/how-to-price-web-design-projects-a-practical-guide-for-freelancers-5e0f); [DEV, scope of work template](https://dev.to/brenohal/web-design-project-scope-of-work-template-a-complete-guide-for-freelancers-3990)
- No source gives hours per round.

### Inferences

**[REASONING] Feature-time table for a one-person Astro studio, copy and images included.** Hours are focused working hours. Days assume 6 h per day.

| Feature | Fixed setup | Per unit | Notes / basis |
|---|---|---|---|
| Extra standard page (copy + images + build + QA) | none | **3-6 h** (about 0.5-1 day) | Matches the studio baseline (≈0.6 day per page) and copy at 2-4 h per page ([Instrumental](https://www.instrumental.net/blog/writing-your-own-web-content), [Contra](https://contra.com/s/6NX26kPk-website-copy)) plus 1-2 h of build when reusing sections. |
| Room/apartment page (B&B, agriturismo): gallery, amenities, prices, CTA | **4-8 h** (content-collection schema, room template, gallery/lightbox, amenity icons, price table) | **2-4 h per room** (≈120-250 words of copy, choosing and cropping 8-20 photos, amenity/price data, alt text) | Scales linearly once the template exists. Prices that change seasonally belong in the booking engine, not in static text. |
| Service page (windows, renovation): technical copy, FAQ, materials, CTA | 2-4 h (template) | **4-6 h per service** | Copy needs technical facts from the client (materials, warranties, incentives such as Italian tax bonuses), so it often waits on a client call. |
| Portfolio / before-after gallery | **4-8 h** (grid, filter, lightbox, before/after slider component) | **15-30 min per project** (2-6 photos, short caption, location/type) | Photo curation is the real cost. Raw client photos often need rotating, straightening and cropping. |
| 2nd language (translation + QA + hreflang) | **4-8 h** (Astro i18n routing, language switcher, hreflang alternates, localized sitemap, metadata, UI strings, form and email templates) | **1-2 h per page** (AI or pro translation plus native-level review), plus **0.5 h per page** of QA for layout, overflow and links | Comes to roughly **+20-35% of base time** for the 2nd language, consistent with the vendor 20-35% / 25-45% bands ([Kolonell](https://kolonell.com/en/blog/multilingual-b2b-website-build-cost-2026)). Outsourced translation is a separate cost (€0.04-0.18 per word). |
| 3rd language | about 1-2 h (setup reused) | same per page | About **+12-25% of base** each. The jump in effort is the 2nd language; later ones are mostly per-page. |
| Booking engine: deep link / Book Now button | none | **0.5-1 h** | Links with UTM or source parameters, tested on mobile. Beds24 itself recommends a new tab ([Beds24 wiki](https://wiki.beds24.com/index.php/Embedded_Iframe)). |
| Booking engine: iframe or JS widget (search bar or full engine) | **2-6 h** | +0.5-1 h per extra property or language variant | Responsive height, styling within the vendor's limits, language parameters, cookie-consent gating, test booking. Vendor docs show copy-paste snippets ([Smoobu](https://support.smoobu.com/hc/en-us/articles/360010836700-How-to-integrate-Smoobu-booking-engine-into-my-external-site-), [SiteMinder](https://help-classic.siteminder.com/en/articles/8673807-booking-engine-integrate-the-booking-engine-with-your-website-using-links-and-widgets)). Add 1-3 h when the client's account or rooms are not configured yet. |
| Booking engine: custom API integration (live availability or prices rendered on the site) | **3-10+ days** | — | Out of scope for a brochure package; quote separately. Depends on whether the vendor has an API and access to it. |
| Availability-request form (dates, guests, room, message) | **3-6 h** | — | Form endpoint (Netlify Forms, Formspree, or a Cloudflare Worker with an email API), validation, date picker, anti-spam, GDPR consent, autoresponder, test sends. |
| Multi-step quote form with email + WhatsApp routing | **8-20 h** (1.5-3 days) | +1-2 h per extra product branch | Conditional steps, photo upload, routing by service or area, a prefilled `wa.me` link, email templates, mobile UX and testing. API-based WhatsApp Business messages add more time and a provider. |
| Blog: none | 0 | — | — |
| Blog, developer-managed (Markdown content collection) | **4-8 h** | 1-3 h per post if the studio writes it | Index page, post template, RSS, tags. |
| Blog with Git-based CMS (Decap, Keystatic, Pages CMS) | **8-16 h** (1-3 days) | — | Schema config, OAuth/hosting setup (Decap off Netlify needs its own OAuth routes, per [Astro docs](https://v4.docs.astro.build/ar/guides/cms/decap-cms/)), editor preview, client training (1 h) and a written guide. |
| Blog with headless CMS (Sanity, Storyblok) | **16-32 h** (3-5 days) | — | Schemas, build webhooks, previews, image pipeline, plan limits. Only worth it if the client publishes often. |
| Event / wedding / package pages | 2-4 h (template) | **4-6 h per package page** | Like service pages: menus, capacity, inclusions, price "from", gallery, enquiry form prefill. Downloadable PDF brochure +2-4 h. |
| Google Maps embed | — | **0.5-1 h** (2 h with click-to-load consent placeholder) | The iframe takes about 5 min ([Wezom](https://wezom.com/blog/complete-google-maps-platform-integration-guide-for-websites-and-applications)). Time goes on consent gating for EU users. |
| Google Business Profile setup or optimisation | **2-4 h** of work | — | Elapsed time is uncontrollable because verification can take days. Keep it outside the critical path. No source found on verification times. |
| Reviews | static curated quotes **1-2 h**; third-party widget (Trustindex-type) **1-2 h**; build-time fetch via Places API **4-8 h** | — | Widgets add JavaScript weight and consent issues. Static quotes with a link to the profile is the lightweight default. |
| Newsletter (Brevo, Mailchimp, MailerLite embed or API form) | **1-3 h** | — | Double opt-in, GDPR text, styled form, test. More if the account has to be created or the client's list migrated. |
| Gift voucher via Stripe Payment Links | **2-4 h** | +0.5 h per voucher denomination | Stripe setup is no-code ([Stripe](https://docs.stripe.com/payments/no-code)). Time goes on the voucher page, terms, success page, and agreeing how the voucher is delivered and redeemed (manual email/PDF, or via Zapier). |
| Shop via Shopify Buy Button (about 1-25 products) | **4-8 h** | 15-30 min per product (photos + copy) | Vendors say "15 minutes" to set up ([EasySell](https://easysellapp.com/blogs/wiki/how-to-add-shopify-buy-button-any-website)). Real time goes on store settings, shipping, taxes, legal pages and styling. |
| WooCommerce | **3-6+ days** | — | Needs a separate WordPress stack (hosting, updates, security), which conflicts with a static Astro build. Recommend against it, or quote it as a separate project. |
| Content migration from the old site | 1-2 h (inventory, redirect map) | **15-45 min per page** as-is; **1-2 h per page** for complex pages; plus copy time if rewritten | Per [Oshyn](https://www.oshyn.com/blog/content-migration-estimation) and [idfive](https://developers.idfive.com/docs/general/content_migration/overview). 301 redirect map: 1-2 h for a small site. |
| Image optimisation | 1-2 h (pipeline: Astro `<Image>` / `astro:assets`, formats, sizes) | **5-10 min per image** curated (crop, colour, rename, alt text), so **1-2 h per 10-20-photo gallery** | Compression and responsive output are automatic in Astro. Selection and editing are the human cost. |
| Copywriting | — | **2-4 h per standard page**; 4-6 h per service or sales page; 1-1.5 h per room | [Instrumental](https://www.instrumental.net/blog/writing-your-own-web-content), [Contra](https://contra.com/s/6NX26kPk-website-copy). |
| Client revision rounds (2 included) | — | **2-6 h per round** for a 1-6 page site, plus 1-3 working days of waiting per round | 2-3 rounds is the norm ([DEV](https://dev.to/brenohal/how-to-price-web-design-projects-a-practical-guide-for-freelancers-5e0f)). Hours per round are not published; this is an estimate. |

**[REASONING] Cross-checks against the baseline:**
- Copy at about 3 h, images at about 1 h and build at about 1.5 h make roughly 5.5 h per page. That matches the studio's own 0.6 day per extra page.
- A 6-room agriturismo with a 2nd language works out as follows:
  - base 6-page site: 10 days;
  - room template: 1 day;
  - 6 rooms × 3 h = 18 h, about 3 days;
  - booking widget: 0.5-1 day;
  - availability form: 0.5-1 day;
  - EN on about 12 pages: (6 + 12 × 1.75 h) ≈ 27 h ≈ 4.5 days.

  Total: about 19.5-20.5 working days before contingency.

### Gaps
- No published, recent, per-feature hour benchmarks for static or Jamstack builds turned up. Clutch and GoodFirms publish price and calendar-time data, not hours per feature, and I could not retrieve it in this session.
- No hours-per-revision-round figure found.
- No CMS setup-hour figures found for Decap, Keystatic or Sanity.
- Reddit r/webdev and r/freelance threads did not appear in search results. The forum data used here (ProcessWire) is old.
- Octorate and Krossbooking public integration docs were not found. Both are common in Italy and likely provide a link plus a widget snippet like Beds24 and Smoobu, but this is unverified. Ask the client's account manager for the snippet.
- Google Business Profile verification times were not researched.

## 2. Which features scale linearly and which are fixed setup costs; typical multipliers

### Takeaway
Most features are "fixed template + per-unit" hybrids. The template cost is paid once, and the per-unit cost (pages, rooms, projects, languages × pages) dominates as the site grows. Vendor sources put multilingual at roughly +20-50% per project or per language, and treat migration and copy as linear per page.

### Cited Findings
- Multilingual: +20-35% (B2B), +25-45% (Berlin), +30-50% (Amsterdam), or +40-60% per extra language (Europe/Africa). Hreflang and sitemaps are a one-off €300-800 per language. Translation is per word. — [Kolonell](https://kolonell.com/en/blog/multilingual-b2b-website-build-cost-2026); [Kolonell Europe-Africa](https://kolonell.com/en/blog/multilingual-website-cost-europe-africa-2026); [ProjectCostEstimator](https://projectcostestimator.com/blog/multilingual-website-cost-2026)
- Migration is estimated per page by complexity tier. — [Oshyn](https://www.oshyn.com/blog/content-migration-estimation)
- "The number of pages and features required directly impacts the design time." — [JennyB Designs](https://jennyb-designs.com/how-many-hours-does-it-take-to-design-a-website/)
- Detailed estimates split effort by work type (design, markup, development, QA, project management), with each feature as a user story. — [MindK](https://www.mindk.com/blog/detailed-estimate-from-a-web-and-mobile-app-development-company/)
- The Shopify Buy Button suits about 1-25 products, so product count is linear content work. — [EasySell](https://easysellapp.com/blogs/wiki/how-to-add-shopify-buy-button-any-website)

### Inferences
- **[REASONING] Fixed (one-off) costs:**
  - i18n infrastructure;
  - room, service and portfolio templates;
  - booking widget;
  - forms;
  - CMS setup;
  - newsletter;
  - Maps;
  - reviews;
  - Stripe or Shopify setup;
  - redirect map;
  - image pipeline.
- **[REASONING] Linear costs:**
  - standard pages;
  - rooms;
  - services, events and packages;
  - portfolio items;
  - translated pages (pages × languages);
  - migrated pages;
  - products and vouchers;
  - images.
- **[REASONING] Step costs:**
  - the 2nd language (big step), then each further language (smaller step);
  - moving from a Markdown blog to a CMS (step);
  - moving from embed to API (large step, a separate project).
- **[REASONING] Suggested multipliers for the quote form:**
  - 2nd language: +25% of base (range 20-35%);
  - 3rd language: +15% (12-25%);
  - "content supplied by the client, not edited": −15-25% (removes most copy time);
  - "migration of an existing site with rewrite": +0.5 day per page;
  - "client has no photos" (stock search or coordinating a photographer): +1-2 days.
- **[REASONING]** Hospitality sites are heavy on linear costs (rooms × languages). Renovation and window sites are heavy on fixed costs (quote form, portfolio). Ask room/service count and language count first; they explain most of the variance.

### Gaps
- No independent (non-vendor) source for multilingual percentages; the Kolonell figures are repetitive SEO content.
- No published multipliers specific to hospitality or trades sites.

## 3. Risks that blow up timelines and how estimators buffer

### Takeaway
Client-side content and feedback delays, not development, are the dominant risk. Practitioners buffer with ranges plus 15-30% contingency, per-phase buffers, fixed feedback windows, and capped revision rounds. When content is not ready, overruns of 30-50% are reported.

### Cited Findings
- One agency adds a +15% buffer to the announced timeline. Freelancer posts suggest +20% per phase, and some say a 20-30% buffer minimum. — [search extracts: LowCode Agency](https://www.lowcode.agency/blog/website-redesign-timeline); [Kolonell Berlin timeline](https://kolonell.com/en/blog/website-redesign-timeline-sme-berlin-2026); [Reddit snapshot](https://reddit.sentinel-team.org/posts/1o7f187/snapshots/2026-02-23T12%3A25%3A37.491863Z)
- Projects can extend 30-50% beyond typical ranges when content isn't ready, decisions are slow, or scope grows. — [search extract, Kolonell timeline articles](https://kolonell.com/en/blog/website-project-timeline-how-many-weeks-amsterdam-2026)
- "Every week of content delay adds a week to the development phase." Late client content costs about 1-3 weeks; the countermeasure is a contractual content deadline. The bottleneck "is almost never development but content sign-off on the client side." — [search extracts: Clique Studios](https://cliquestudios.com/faq/website-redesign-timeline-and-process); [Kolonell Manchester](https://kolonell.com/en/blog/corporate-website-timeline-delivery-manchester-2026)
- Recommended practice: 3-5 days of buffer per phase gate for feedback and sign-off, a 3-day feedback window for design reviews, and at most 2 included revision rounds. Each major scope addition pushes the timeline 2-5 weeks (agency scale). — [search extracts: Kolonell Toronto](https://kolonell.com/en/blog/website-project-timeline-b2b-toronto-2026); [LowCode Agency](https://www.lowcode.agency/blog/website-redesign-timeline)
- Content and review delays drive calendar timelines more than build time. — [PlayCode](https://playcode.io/blog/how-long-does-it-take-to-build-a-website)
- Freelancer method: break the spec into tasks, estimate hours per task, multiply by the rate, add contingency. — [Overclockers forum](https://forums.overclockers.co.uk/threads/charge.18745528/)
- Third-party constraints:
  - Mews requires HTTPS and forbids putting its widget inside an iframe ([Mews](https://docs.mews.com/booking-engine-guide/booking-engine-widget/getting-started));
  - Beds24 warns about iframe usability ([Beds24](https://wiki.beds24.com/index.php/Embedded_Iframe));
  - changing a Shopify Buy Button's style means regenerating the embed ([Let's Talk Shop](https://www.letstalkshop.com/blog/shopify-buy-button-on-external-website)).

### Inferences
- **[REASONING] Risk list for this studio's niche**, with suggested buffers:
  1. **Client content and photos late.** This is the biggest risk, and agriturismi and B&Bs in season are especially slow. Quote in working days that start when content arrives, and set a content deadline in the contract. +20-30% calendar buffer, or bill a pause/restart fee.
  2. **Booking engine account not configured, or no access.** The owner doesn't know their Octorate or Krossbooking credentials, or rooms and rates aren't set up yet. Treat the engine as a dependency, use a deep link as fallback so the site can go live, and add +0.5-1 day.
  3. **Translations.** The client wants to review them, or a relative "who speaks English" edits them. Add one dedicated translation-review round and +1-2 days of calendar time per language.
  4. **Third-party accounts** (Stripe KYC, Shopify, Google Business Profile verification, domain or DNS access held by the old provider). Keep them off the critical path, start them on day 1, and allow +1-3 calendar days.
  5. **GDPR and cookie consent for embeds** (Maps, booking iframe, reviews widget, YouTube). This is often forgotten. Add 2-4 h fixed for a consent solution and placeholders.
  6. **Migration surprises** (no access to the old CMS, content only in PDFs or images). Inventory pages before quoting, and price per page with an "as-is vs rewrite" choice.
  7. **Scope creep** ("can we also add a shop / events / blog?"). Price add-ons from this table and handle them as change requests.
- **[REASONING] How to buffer:**
  - Show the client a **range**: low = sum of feature hours; high = low × 1.2-1.3.
  - Add a **content-dependency clause**: the delivery date moves day-for-day with content delays.
  - Include 2 revision rounds, and bill extra rounds hourly.
  - Effort contingency: 15% for a simple brochure site, 25% when it has booking, e-commerce, migration or 3+ languages.
- **[REASONING] Fast quoting (studio formula):**
  - Days = base (7 days for 1 page / 10 days for 6 pages) + Σ feature days + Σ (per-unit × count).
  - Apply language multipliers to the content portion.
  - Then ×1.15-1.25 contingency.
  - Cost = days × day rate.

### Gaps
- Most buffer and timeline figures come from vendor or agency blogs (several from one SEO-heavy source, Kolonell) and from search extracts that could not be fully fetched. There is no peer-reviewed or survey-based data (Clutch or GoodFirms data was not retrieved).
- No data specific to Italian hospitality or trades clients on how late their content typically arrives.
