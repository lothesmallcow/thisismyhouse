# Mobile-first design quality for a marketing site (why "great on laptop" looks "slightly cheaper" on a phone), 2023-2026

Research context: Focus Design Astro site (Schibsted Grotesk; H1 800, H2 700, body 17-18px; navy/white/orange). Tokens under review: `--fs-display: clamp(2.375rem, 1.6rem + 3.6vw, 4.5rem)`, `--fs-h2: clamp(1.75rem, 1.2rem + 2.2vw, 3rem)`, `--space-section: clamp(3.5rem, 2rem + 5vw, 7.5rem)`, gutter 16-24px.

Method note for the report writer: I tried to measure live premium sites (Stripe, Linear, Vercel, Apple, Basecamp) at 390x844 with a headless browser. The session's egress policy blocked all of those hosts (403 on CONNECT), and WebFetch could not resolve nngroup.com or m3.material.io. So **I have no measured H1/H2 sizes for Stripe, Linear, Vercel or Apple at 390px.** Every number below comes from a cited source, or from my own arithmetic on the site's tokens, which I label as inference. Several figures come from secondary mirrors of Apple and Material docs; I flag those.

---

## 1. What do Apple HIG, Material 3, WCAG, Baymard, NN/g and others recommend for mobile type, spacing, touch targets and hierarchy? What sizes do premium sites use at 390px?

### Takeaway
The platform floors are consistent. Body text is about 16-17px; secondary text bottoms out at about 11-13pt, and 14px or more is safer for the web. Touch targets are 44pt (Apple), 48dp (Material) or 1cm (NN/g), with WCAG 2.2 AA requiring at least 24x24 CSS px. Native mobile headline sizes are far smaller than most desktop-first web H1s: Apple's Large Title is 34pt and Material's Headline Large is 32sp. The site's phone H1 of about 38-41px is at the top of what native platforms use, so it needs short, controlled lines.

### Cited Findings
**Typography: platform scales**
- Apple iOS Dynamic Type (default "Large" setting), size/leading in pt: Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline 17 semibold/22, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption 1 12/16, Caption 2 11/13. The default body size is 17pt and the minimum recommended size is 11pt. Avoid light or thin weights at small sizes. — [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography). CAVEAT: the page would not render its body for fetching, so these values came back from the fetch tool's general knowledge of Apple's published table, not from page text. A third-party HIG summary corroborates "never below 11pt; 17pt preferred body" — [ios-design-guidelines summary](https://skills.cat/skills/ehmo/platform-design-skills/ios-design-guidelines). Verify against the live page.
- Material 3 baseline (size/line-height in sp): Display Large about 57/64, Headline Large about 32/40, Body Large about 16/24. These values come from memory in the search tool's answer, not a fetched page. The Compose API confirms the 13-style structure (display/headline/title/body/label) and describes headlineLarge as "the largest headline, reserved for short, important text or numerals" — [Android Developers, M3 Typography](https://developer.android.com/reference/kotlin/androidx/compose/material3/Typography). Verify the exact values at m3.material.io.

**Line length**
- Baymard: the optimal line length for body text is 50-75 characters, and Ruder's narrower optimum is 50-60. Users tire on lines of 100+ characters. In CSS, use `max-width` of about 70ch or 34em. Supporting values: line-height 1.5, paragraph spacing 2em, word spacing 0.16em, letter spacing 0.12em. — [Baymard, Line length readability](https://baymard.com/blog/line-length-readability)
- Mobile-specific ranges, from a secondary source: mobile 30-50 characters per line, a minimum font size of 14-15px, and line-height 1.3-1.5 — [UXPin, Optimal line length](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/). This source has no clear primary citation; I found no Baymard figure specific to mobile (Baymard's mobile guidelines are paywalled).

**Fluid type scale reference (Utopia)**
- Utopia calculator with a 320px minimum viewport, 18px base and 1.2 ratio, scaling to a 20px base and 1.25 ratio at 1240px. At 320px the steps are 18 (body), 21.6, 25.9, 31.1 (h3), 37.3 (h2) and 44.8px (h1). — [Utopia type calculator](https://utopia.fyi/type/calculator/); per-step values from the search tool's arithmetic on that calculator's clamp output. On a 1.2 mobile ratio, an 18px body therefore gives an H2 of about 26-31px and a display H1 of about 37-45px at 320-360px.

**Touch targets**
- NN/g: interactive elements should be at least 1cm x 1cm (0.4in) for fast, accurate taps (Parhi, Karlson & Bederson). Fingertips are 1.6-2cm wide (MIT Touch Lab). Measure physically rather than in pixels. — [NN/g, Touch Target Size](https://www.nngroup.com/articles/touch-target-size/) (text via search snippet; the page itself could not be fetched).
- Apple: default control size on iOS/iPadOS is 44x44pt, minimum 28x28pt, and spacing between controls matters as much as size — [mirror of HIG Accessibility table](https://glama.ai/mcp/servers/@tmaasen/apple-dev-mcp/blob/b82f0efe2115dc4539c83a2374a714a84aeb350a/content/universal/accessibility.md); 44pt corroborated by [Deque iOS touch target rule](https://dequeuniversity.com/rules/attest-ios/1.0/touch-target-size).
- Material: 48x48dp. WCAG 2.2 AA: 24x24 CSS px — [UXPin comparison](https://www.uxpin.com/studio/blog/responsive-design-touch-devices-key-considerations/).
- WCAG 2.2 SC 2.5.8 (AA): targets of at least 24x24 CSS px. A smaller target passes only if a 24px-diameter circle centred on it does not intersect another target or its circle. Inline links in a paragraph are exempt, but a list of links is not. — [DAISY KB](https://kb.daisy.org/publishing/docs/wcag/target-size-minimum.html); [Adrian Roselli, 2.5.8 Adversarial Conformance (Dec 2023)](https://adrianroselli.com/2023/12/2-5-8-adversarial-conformance.html) notes the criterion still allows "very small, and difficult to activate" targets, so 24px is a legal floor, not a design target.

**Fluid type and accessibility**
- When `clamp()` caps a size or uses `vw`, text may fail to reach 200% under browser zoom, which fails WCAG 1.4.4 (Roselli, quoted by Maxwell Barvian). Test at 200% and 500% zoom. — [Smashing Magazine, Addressing Accessibility Concerns With Using Fluid Type (Nov 2023)](https://smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type); [Smashing, Fluid Typography: Predicting a Problem With Your User's Zoom-In (Dec 2022)](https://shop.smashingmagazine.com/2022/12/fluid-typography-predict-problem-users-zoom-in/)

**Spacing**
- The most common mobile complaint on theme platforms is too much top/bottom section padding on phones. Desktop-scale pixel padding takes a disproportionate share of a phone screen and makes the page "feel sparse and slow to scroll". — [Fudge.ai, mobile spacing in Shopify (2026)](https://www.fudge.ai/guides/how-to-improve-mobile-spacing-in-shopify). The recommended fix is `clamp()` or per-breakpoint section padding — [Base docs, spacing](https://docs.base.org/mini-apps/design-ux/foundations/spacing). Both are low-authority sources but match the symptom.

### Inferences
- **The site's tokens on phones (my arithmetic, 1rem = 16px):**
  - `--fs-display` resolves to 38px at 320px, about 38.6px at 360px, 39.1px at 375px, **39.6px at 390px**, 40.5px at 414px and 41.1px at 430px. The display size barely changes across phones and sits about 16% above Apple's 34pt Large Title.
  - `--fs-h2` sits at its 28px floor from 320px to about 400px, then reaches 28.3px at 414px and 28.7px at 430px. That equals Apple's Title 1 (28pt).
  - `--space-section` sits at its 56px floor across every phone width, because 2rem + 5vw only reaches 56px at 480px. That gives 112px of empty space between two sections' content, about 13% of an 844px-tall viewport.
- **Display H1 line length at 390px:** content width with 20px gutters is about 350px. At an assumed average glyph width of about 0.55-0.6em for a grotesk at weight 800 (my assumption, not measured), a 39.6px H1 fits about 15-16 characters per line. A single long Italian word ("personalizzato", 14 characters) can fill an entire line. That is the mechanism behind "awkward breaks" and one-word orphan lines.
- **Body line length:** 17px body across 350px gives about 40 characters per line, inside the 30-50 mobile band. 18px gives about 38. Body size is not the problem.
- **H1/H2/body ratios:** on a phone the hierarchy is H1 about 40px, H2 28px, body 17px. The H1/H2 ratio of 1.41 and H2/body ratio of 1.65 are both healthy. The H2-to-H3/card-title step likely is not (see section 2): mid-level type in cards often lands at 18-20px, so it reads close to body.
- **Recommended mobile starting values** (synthesis of HIG, Material and Utopia, not from a single source):
  - Display H1 34-40px, line-height 1.05-1.1, 3-4 lines maximum.
  - H2 26-30px, line-height 1.15.
  - Card title 19-21px.
  - Body 16-18px, line-height 1.5.
  - Secondary text 14-15px minimum; 13px only for legal or meta text.
  - Buttons 48px or more tall.
  - Gutters 20px, or 16px only at 320-360px.

### Gaps
- **No measured values for Stripe, Linear, Vercel, Apple or Basecamp H1/H2 sizes or section padding at 390px.** The egress policy blocked these hosts. To fill this gap, open each site in Chrome DevTools at 390x844 and read the computed `font-size` of `h1`/`h2` and the `padding-block` of sections.
- No primary Baymard or NN/g figure for mobile-specific line length or minimum font size was retrievable.
- The Apple and Material type tables were not fetched from the primary pages; the values above come from tool knowledge and mirrors.

---

## 2. Why do desktop-first designs degrade on phones? (oversized headings, small secondary text, cramped or excessive padding, long stacked lists, shrunken illustrations, mockups-in-mockups, sticky elements, hero without a CTA)

### Takeaway
"Slightly cheaper" on a phone rarely comes from one bug. It comes from proportions designed at 1440px and squeezed into 390px: heading size that does not shrink much, so lines carry 2-3 words with ragged breaks; padding that stays large in absolute pixels; side-by-side compositions that become long single columns; and detailed visuals (screenshots, phone mockups, floating labels) shrunk until their text is unreadable. The cure is to design the 390px composition explicitly, not inherit it.

### Cited Findings
- Desktop-scale padding on phones makes pages "feel sparse and slow to scroll"; it is the most common complaint about mobile spacing — [Fudge.ai (2026)](https://www.fudge.ai/guides/how-to-improve-mobile-spacing-in-shopify).
- Attention drops sharply below the first screen. NN/g eye-tracking (2018) found about 57% of viewing time above the fold and about 74% in the first two screenfuls. The study used a 1920x1080 desktop screen; secondary sites that call 57% a mobile figure are misattributing it. — [NN/g, Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/) (via search snippet); misattribution example [CT.gov style guide](https://portal.ct.gov/ctcontentstyleguide/Fix-My-SEO/Writing-for-Mobile-Devices).
- Heading line breaks: `text-wrap: balance` evens out heading lines. Chromium applies it only to blocks of 6 lines or fewer, Firefox to 10 or fewer. It is meant for short text such as headings; `text-wrap: pretty` targets orphans in paragraphs. Unsupported browsers ignore both and wrap normally, so they are safe progressive enhancement. — [Savvy, text-wrap pretty/balance](https://savvy.co.il/en/blog/css/css-text-wrap-pretty-balance/); [LogRocket (Sep 2025)](https://blog.logrocket.com/css-text-wrap-balance-vs-text-wrap-pretty/). Sources disagree on Safari support for `pretty`: LogRocket says Firefox lacked `pretty` as of Sept 2025, and a mid-2024 article said Safari lacked both. Check caniuse before relying on either.
- Fluid headings that are capped or `vw`-based can block zoom enlargement (WCAG 1.4.4) — [Smashing (2023)](https://smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type).
- Rotating carousels are often "annoying to users and definitely error prone" — [NN/g video, carousels](https://www.nngroup.com/videos/carousels-websites-mobile-apps/). Carousels show low click-through and people scroll past them — [Smashing, Better Carousel UX (2022)](https://www.smashingmagazine.com/2022/04/designing-better-carousel-ux).

### Inferences (mapped to this site; design judgement, not from sources)
- **Split hero with a 3D phone.**
  - Failure mode: on the phone the 3D phone sits below or behind the text, so above the fold you get either the H1 alone, without its visual, or a small phone with no CTA.
  - At 390x844 the usable height after a header of about 56-64px is about 780px.
  - A 4-line H1 at 40px with line-height 1.1 takes about 176px. A 3-line lede at 17px with line-height 1.5 takes about 77px. Eyebrow and gaps take about 80px, and a 52px button with gaps about 90px. That totals about 420px, which leaves about 300-350px for a cropped visual.
  - Recommendation: show the phone at about 60-70% scale, cropped by the bottom edge of the screen or bleeding off the side. Do not show it full-height below the fold.
- **Navy before/after film with a phone mockup and floating labels.** Floating labels sized for desktop (12-14px) fall to 10-11px if the composition is scaled. They also overlap the phone or clip at the 16-20px gutter. On phones, labels should become an ordered caption list, chips under the device, or numbered pins, with label text at 14px or more.
- **Sector cards with screenshots.** A desktop website screenshot inside a card about 350px wide shrinks to about 25% scale, so its UI text becomes about 3-4px: decorative noise. Use a mobile screenshot, or a tight crop of one meaningful region, at a 4:5 or 1:1 aspect ratio. Do not show the full 16:10 page.
- **Phone inside a phone.**
  - A full-device mockup in a 390px viewport renders at about 180-260px wide, so its UI text lands at 6-9px.
  - Treat the mockup as a framed crop: show the top half of the device, bleeding off the bottom of the section; drop the device frame; or zoom into one screen region.
  - Never stack two or more full phones in a phone viewport. The "phone fan" on inner pages should become one hero device plus offsets, or a horizontal rail.
- **Bento grid of benefits.** On phones, a bento becomes a list of equal stacked boxes, and the tile rhythm that made it a bento is lost. Keep 2 columns for short stat or icon tiles at 390px (each about 167px wide with a 16px gap), give one in every 3-4 tiles the full width, and keep each tile's copy to at most 2 lines.
- **Three price cards with feature lists.** Three stacked cards with 8-12 features each produce 2-3 screens of identical bullets. Show at most the top 4-5 differentiators per card, put "all features" behind an accordion, and keep the recommended plan first or visually distinct. A horizontal swipe rail with the next card peeking is the alternative (see section 3).
- **Sticky elements.** A sticky header of about 64px plus a sticky CTA bar of about 64-72px plus the iOS Safari chrome can consume about 20-25% of the 844px viewport. Choose one persistent element. A header that hides on scroll-down and shows on scroll-up, with a slim 48-56px bar, is the usual compromise.
- **Secondary text.** Eyebrows, card meta, footnotes, price small print and form hints set at 12-13px with uppercase tracking read as "cheap" or cramped at 3x density. Use 14px or more, with a weight of 500-600 on uppercase eyebrows.
- **Section rhythm.**
  - At 56px top and bottom, the gap between sections is 112px. That is acceptable, but only if spacing inside sections is proportionally tighter, about 24-32px between heading and content.
  - The cheap look comes when inner gaps remain large too (for example, 48px between H2 and cards), producing "floaty" sections.
  - A common premium pattern is a 48-64px section block and a 16-24px gap between H2 and its body. That is design judgement, not a sourced figure.

### Gaps
- No primary study quantifies "perceived cheapness" on mobile. These are expert heuristics.
- No sourced data on how much screen sticky bars occupy across real iOS versions. Safari toolbar height varies with the compact tab bar and scroll state.

---

## 3. Mobile-specific treatments: swipe rails vs stacks, accordions, collapsed feature lists, reordering, shorter copy, simpler motion

### Takeaway
Use stacks for content people must read in order (steps, FAQ) and swipe rails only for comparable, browsable sets, with the next item visibly peeking. Use accordions to collapse long secondary detail, but with care. Rewrite rather than shrink: shorter headlines, fewer bullets, and simpler motion that respects `prefers-reduced-motion`.

### Cited Findings
- Accordions save space on mobile but can disorient and cause excessive scrolling; small design fixes, such as a sticky accordion heading and a visible open state, improve them — [NN/g video, Accordions on Mobile](https://www.nngroup.com/videos/accordions-on-mobile/).
- Horizontal rails on phones are gesture-controlled. Keep the first and last items partly visible so the rail signals that it scrolls. — [Smashing, Better Carousel UX (2022)](https://www.smashingmagazine.com/2022/04/designing-better-carousel-ux).
- Auto-advancing carousels are disruptive; people often scroll past them — [Smashing (2022)](https://www.smashingmagazine.com/2022/04/designing-better-carousel-ux); [NN/g video](https://www.nngroup.com/videos/carousels-websites-mobile-apps/).
- Sticky mobile CTA bars: evidence is vendor A/B tests with mixed results. One test saw add-to-cart up 3.9% and conversion up 0.8% — [Cleancommit](https://cleancommit.io/ab-tests/mobile-bottom-sticky-add-to-cart-button/). Another saw add-to-cart rise but conversion fall 7.7% and revenue per visitor fall 22.1% — [Cleancommit](https://cleancommit.io/ab-tests/sticky-mobile-add-to-cart-button/). These are e-commerce tests; I found no Baymard primary source on sticky CTAs, and a widely repeated "73% scroll past the buy button" claim attributed to Baymard has no primary source I could find.

### Inferences (per-section treatment for this site)
- **4 steps:** keep as a vertical stack with a numbered rail line, because order matters. Use a compact step card: number, title at 19-20px, at most 2 lines of copy.
- **Price cards:** either (a) stack them with the recommended plan first and the feature list collapsed after 4-5 items behind "See all features", or (b) use a scroll-snap rail at 85% card width with a 16px peek and "1/3" pagination dots. A stack is safer for comparison anxiety; a rail looks premium but hides two prices.
- **Sector cards:** a horizontal rail fits well here, because it is a comparable browsable set. Use cards at about 78-85% of viewport width and a 4:5 crop.
- **Bento:** a 2-column mini-grid, not a rail.
- **FAQ:** an accordion with a whole-row tap target of 56px or more, a 17px question at weight 600, and only one item open at a time.
- **Closing 3-step form:** one field group per step, inputs at least 48px tall with a 16px or larger font (iOS Safari zooms inputs under 16px, a widely known WebKit behaviour not sourced here), and a full-width primary button.
- **Copy:** cut H1 and H2 to 3-4 phone lines maximum, either by writing shorter mobile headlines or by allowing `<br class="desk">` breaks only on desktop. Use `text-wrap: balance` on h1-h3 and `pretty` on paragraphs.
- **Reordering:** in the split hero, use H1, then lede, then CTA, then the visual. In feature rows, put the image before the text only if the image carries meaning; otherwise the text comes first.
- **Motion:**
  - On phones, drop parallax, pointer-follow tilt on the 3D phone (there is no hover), long scroll-pinned sequences and floating label choreography.
  - Keep one entrance per section: opacity plus a translateY of 12-16px over about 300-400ms.
  - Wrap all of it in `@media (prefers-reduced-motion: reduce)`.
  - Scroll-pinned "film" sections should become short autoplaying loops or a static before/after toggle on screens 480px wide or less.
- **Navigation:** a 56-64px header with logo, one compact CTA (at least 44px tall) and a menu button at least 44x44. The full-screen menu should use 22-28px link text with 56px rows.
- **Buttons:**
  - Primary CTA full-width, or at least 75% width, on phones.
  - Height 48-56px, label 16-17px at weight 600-700.
  - Two CTAs stack vertically with a 12px gap, or the secondary becomes a text link.
- **Tables and multi-column content:** never use a horizontally scrolled table for marketing comparisons. Convert to stacked cards per plan, or to per-feature rows with checkmarks under a sticky plan header.

### Gaps
- No primary 2023-2026 research comparing swipe rails with stacks for pricing cards specifically.
- No primary source found for performance or motion limits specific to mobile marketing sites. The motion advice is practitioner judgement.

---

## 4. How to QA visual quality systematically across 320/360/375/390/414/430

### Takeaway
Test the widths real users have: the world's top mobile widths cluster between 360 and 414px. Judge each section at actual size on a real device, not in a scaled-down desktop window. Use a fixed checklist: line breaks, minimum text size, target size, crop legibility, above-fold content, sticky overlap and zoom.

### Cited Findings
- Statcounter worldwide mobile shares, July 2026: 414x896 13.23%, 360x800 9.14%, 390x844 6.67%, 393x873 5.04%, 384x832 4.17%, 360x780 3.08%. — [Statcounter mobile screen resolution](https://gs.statcounter.com/screen-resolution-stats/mobile/worldwide) (figures from the search tool's summary of Statcounter). In June 2026, 375x812 also ranked in the top 5 across mobile and tablet — [Statcounter mobile+tablet](https://gs.statcounter.com/screen-resolution-stats/mobile-tablet/worldwide).
- Mobile resolutions cluster tightly in the 360-412px width range — [Hobo Web, best screen size (2025)](https://www.hobo-web.co.uk/best-screen-size).
- Test fluid type at 200% and 500% browser zoom — [Smashing (2023)](https://smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type).
- WCAG 2.5.8 target spacing can be checked with the 24px circle test — [DAISY KB](https://kb.daisy.org/publishing/docs/wcag/target-size-minimum.html).

### Inferences (a QA protocol)
1. **Widths:** 320 (stress test), 360, 375, 390, 414, 430, plus 768 for tablet. Heights: 568 (SE first generation), 667 (SE 2/3), 844 and 932. At 390x844, record what is visible above the fold. The H1, lede and primary CTA must all be visible without scrolling, plus at least a hint of the hero visual.
2. **Per section, screenshot at 1x on a real iPhone or at 390 in DevTools**, then check:
   - (a) No heading line holds a single short word (an orphan), and no heading runs to more than 4 lines.
   - (b) No visible text is under 14px, except legal text at 13px or more.
   - (c) Every tappable element is at least 44x44, with 8px or more between targets.
   - (d) Text inside any image or mockup is at least 9-10px rendered, or the image is clearly decorative.
   - (e) No horizontal overflow: `scrollWidth` equals `innerWidth`.
   - (f) Gutters are consistent (one value, 20px for example) across all sections.
   - (g) Spacing follows one rhythm, such as 8px multiples, with heading-to-body gaps of 12-16px and block-to-block gaps of 24-32px.
   - (h) No more than one sticky element is visible at once, and it covers less than 10% of viewport height.
3. **Squint test:** view the full-page phone screenshot zoomed out. Each section should have one dominant element. If every section looks like "heading + grey box + list", density and contrast are flat.
4. **Side-by-side test:** put the 390 screenshot next to the 1440 screenshot at the same physical height. If the phone version has lost the visual (cropped illustration, shrunken mockup) while keeping all the words, the composition is desktop-first.
5. **Automation:** a Playwright script that loops over the widths, captures full-page screenshots and asserts overflow, minimum font size and target size. The repo already has an overflow checker (task #13 in the project history). Add a check that every `h1`/`h2` has `text-wrap: balance` and fewer than 5 lines.
6. **Zoom and Dynamic Type:** test 200% browser zoom and iOS text-size settings, so clamp caps do not block enlargement.
7. **Real-device pass:** check iOS Safari with the bottom toolbar both expanded and collapsed. 100vh differs from the visible height, so use `svh`/`dvh` for full-height heroes.

### Gaps
- No authoritative published "visual quality at phone size" scoring rubric from a top studio was found. The checklist above is a synthesis.
- No case studies (2023-2026) from named agencies with before/after numbers were retrievable in this session.
