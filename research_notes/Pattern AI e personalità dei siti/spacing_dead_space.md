# Spacing, vertical rhythm and dead space on small-business websites

> Research note, 22/11/2026. Source caveat: in this session WebFetch could not reach utopia.fyi, nngroup.com, every-layout.dev or m3.material.io (DNS blocked by the session network). Findings for those sources come from search-result excerpts of their pages, not full reads. Many available sources are practitioner or vendor blogs, and I mark them as such. Anything labelled "general knowledge" or "inference" has no source fetched in this session.

## 1. Intentional white space vs dead space: definitions and diagnosis

### Takeaway
No standard reference defines "dead space". In practitioner writing the difference is intent and function. White space groups, separates, frames or points to something. Dead space is empty area that does none of these: it looks accidental or uneven, often sits next to a crowded area, and on the web it usually comes from layout mechanics (empty tracks, stacked padding, fixed heights) rather than from a design decision.

### Cited Findings
- Dead space is described as "more of an oversight": space that may have been missed. It may start unintentional, but a designer can use it deliberately. — [Vox Illustration](https://voxillustration.com/blog/dead-space-in-graphic-design-difference-between-dead-space-and-whitespace/); see also [Asclique](https://www.asclique.com/blog/white-space-vs-dead-space-in-graphic/) and [Oneupweb](https://www.oneupweb.com/blog/whitespace-or-dead-space-beware-the-horror-of-web-design/) (vendor blogs; definitions vary by author)
- "Active" white space is placed on purpose to direct attention (for example to a CTA). "Passive" white space is the natural spacing that stops elements from touching. — web-design blogs summarized in [Tuts+ Webdesign](https://webdesign.tutsplus.com/using-white-space-or-negative-space-in-your-designs--webdesign-3401a) and [AND Academy](https://www.andacademy.com/resources/blog/graphic-design/white-space-in-design/)
- "White space" comes from print design, where the paper was white. The space does not have to be white. — [Wikipedia: White space (visual arts)](https://en.wikipedia.org/wiki/White_space_(visual_arts))
- Refactoring UI: "You don't have to fill the whole screen". Available space does not need to be filled. Give elements a max-width instead of sizing them to a grid, and shrink them only when the screen is narrower than that max-width. — Refactoring UI excerpts via [studylib copy of the book](https://studylib.net/doc/27063975/pdfcoffee.com-refactoring-ui-v102pdf-3-pdf-free) and [Bookey PDF](https://cdn.bookey.app/files/pdf/book/en/refactoring-ui.pdf) (unofficial copies)
- A Refactoring UI-based skill gives the example "paragraph max-width: 600px is fine even if nav is 1200px". — [gnurio/refactoring-ui-plugin](https://github.com/gnurio/refactoring-ui-plugin/blob/main/skills/04-apply-consistent-spacing/SKILL.md) (community summary)
- Refactoring UI: start with too much white space, then remove it. Adding space step by step tends to stop as soon as something "isn't actively bad" instead of when it is good. — [KeynesYouDigIt wiki summary](https://github-wiki-see.page/m/KeynesYouDigIt/Knowledge/wiki/Refactoring-UI); [TalTech course slides](https://courses.cs.taltech.ee/w/images/7/7c/ITI0209_22_08_Tips_for_Layout.pdf)
- A design-review checklist contrasts "intentional empty space that frames content" with space that "looks accidental or uneven". It warns against crowding one area while leaving too much empty space in another, and asks whether white space is roughly even on each side. — [jezweb design-review SKILL.md](https://github.com/jezweb/claude-skills/blob/main/plugins/frontend/skills/design-review/SKILL.md); [DesignShifu checklist](https://www.designshifu.com/blog/design-review-checklist-for-non-designers)
- Stacked padding on adjacent sections can create unneeded empty space "even when each section looks fine on its own". Blank space also comes from copying desktop spacing onto mobile and from several wrappers that each add padding. — [Elegant Themes, Divi 5 mobile best practices](https://www.elegantthemes.com/blog/divi-resources/mobile-responsive-design-with-divi-5); [FrontFixer: Section leaving big blank space](https://frontfixer.com/section-leaving-big-blank-space/) (vendor and practitioner)
- `repeat(auto-fill, …)` keeps empty tracks as real columns, so a short last row leaves blank space at the end. `auto-fit` collapses empty tracks to zero. — [MDN repeat()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/repeat); [DEV: Your grid has invisible columns](https://dev.to/parsajiravand/your-grid-has-invisible-columns-auto-fill-vs-auto-fit-3hh1)

### Inferences
- A working taxonomy of dead space for an LLM-driven build (inference, built from the sources above). Each pattern is a mechanism that leaves an area empty with no grouping or framing role:
  1. **Empty grid cells / orphan cards.** Last row has 1 of 3 (or 1–2 of 4) items, or auto-fill tracks stay empty.
  2. **Height mismatch in two-column splits.** Short text beside a tall image leaves a large blank block under the text, or the reverse.
  3. **Padding-dominated sections.** Padding is larger than the content height, for example 2×120px padding around a 2-line paragraph.
  4. **Double padding.** Section padding, wrapper padding and component margin add up (the Divi and FrontFixer finding).
  5. **Empty half on desktop.** A text-only block with a narrow max-width is left-aligned in a 1440px container with nothing on the right. The fix is to centre it or pair it with something, not to stretch the text (stretching breaks the measure).
  6. **Forced 100vh/100svh sections** with little content, which turns the empty area into the main visual.
  7. **Desktop spacing copied to mobile.** The same 120px padding at 390px leaves screens of padding between short blocks.
- Diagnostic phrase for review: ask whether each empty area *groups*, *separates*, *frames* or *points to* something. If none applies, it is dead space.

### Gaps
- No authoritative source (NN/g, Material, HIG) gives a formal definition of "dead space". The term lives in practitioner blogs.
- Could not confirm the exact Refactoring UI wording beyond the excerpts from unofficial copies.

## 2. Spacing systems: 4/8pt grids, modular and fluid scales, tokens, proximity, section padding

### Takeaway
Use a small, constrained set of spacing values (about 6–10 tokens, on a 4/8 base or a modular ratio), made fluid with `clamp()`. Apply proximity strictly: space inside a group is always clearly smaller than space between groups, and a heading sits closer to its content than to the section before it. Section padding is typically about 48–64px minimum on mobile and about 96–120px maximum on desktop. Every source treats these numbers as starting points, not standards.

### Cited Findings
- **Refactoring UI scale.** Summaries list a 4-based scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128… (the exact list varies between summaries: some omit 12, some go to 96/128 or higher). Large page sections sit around 48–64px, and space between groups must be larger than space within groups. — [s0xDk/refactoring-ui-skill](https://github.com/s0xDk/refactoring-ui-skill/blob/main/SKILL.md); [Saglitz Design notes](https://saglitz.com/design/refactoring-ui); [craftwork.design](https://craftwork.design/skills/refactoring-ui) (secondary summaries; they disagree on the exact steps)
- **8-point grid in practice.** A common working set is 4, 8, 12, 16, 24, 32, 48, 64, with 4 and 12 for fine adjustment in dense controls. Pick about 6–8 values and avoid the rest. — [Pixso 8-point grid](https://pixso.net/articles/8-point-grid-spacing-system/); [UI/UX Atlas](https://uiuxatlas.com/lessons/visual-design/spacing-rhythm-and-the-8pt-grid/)
- **Every Layout.** The modular scale is built from custom properties: `--ratio: 1.5`, `--s0: 1rem`, `--s1: calc(var(--s0) * var(--ratio))`, and so on (multiply up, divide down). The Stack primitive puts margin between siblings through the parent with the "owl" `* + *` selector, and defaults to `var(--s1)`. The first child gets no top margin. — [Every Layout: Modular scale](https://every-layout.dev/rudiments/modular-scale/); [Every Layout: The Stack](https://every-layout.dev/layouts/stack/) (search excerpts)
- `gap` now works on flex and grid, so the owl selector is no longer strictly needed for siblings in a flex/grid container. — [LogRocket: lobotomized owl guide](https://blog.logrocket.com/css-lobotomized-owl-selector-modern-guide/)
- **Utopia.** Fluid space tokens are derived from "Step 0" of the fluid type scale with t-shirt names (`--space-3xs` … `--space-3xl`), output as `clamp()`. It also generates "space value pairs" such as `--space-xl-2xl`, which interpolate across more than one step for more dramatic changes between small and large viewports. By default it creates one-step pairs, and custom pairs are allowed. — [Utopia space calculator](https://utopia.fyi/space/calculator/); [Smashing: Meet Utopia](https://www.smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales/); [utopia-core](https://github.com/trys/utopia-core)
- **Material 3.** Window size classes: compact < 600dp, medium 600–839dp, expanded 840–1199dp, large 1200–1599dp, extra-large ≥ 1600dp. Margins are 16dp on compact and 24dp from medium up. One reference lists gutters of 8dp compact, 16dp medium and 24dp large. Columns are 4 / 8 / 12. Sources disagree on the base unit: one says a 4dp base grid, another an 8dp system. — [1440px.com M3 breakpoints](https://1440px.com/breakpoints/material-design/); [hamen/material-3-skill layout reference](https://github.com/hamen/material-3-skill/blob/master/skills/material-3/references/layout-and-responsive.md); [pub.dev material_design](https://pub.dev/packages/material_design) (secondary, not m3.material.io itself)
- **Proximity (NN/g).** "Items close together are likely to be perceived as part of the same group". Deliberately larger spacing between groups makes each set read as separate. Headings should sit closer to their own content than to the previous section. Grouping is conveyed by proximity and white space, or explicitly by enclosure (common region). — [NN/g Proximity principle](https://www.nngroup.com/articles/gestalt-proximity/); [NN/g Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/); [NN/g Form white space](https://www.nngroup.com/articles/form-design-white-space/) (search excerpts)
- NN/g's form example: when labels sit farther from their own fields than the fields sit from each other, the labels read as belonging to the wrong inputs. — [NN/g Group form elements using white space](https://www.nngroup.com/articles/form-design-white-space/)
- Increase space between groups to signal separation and reduce it within a group to signal connection. Consistency is essential for communicating hierarchy. — [gestaltprinciples.com: Proximity](https://www.gestaltprinciples.com/principles/proximity)
- **Section padding examples (practitioner).** `clamp(48px, 8vw, 96px)` for padding-block; `clamp(32px, 5vw, 80px)`; `clamp(2rem, 6vw, 6rem)`; a Divi ramp from 64px (mobile floor) to 120px (desktop ceiling). For content-heavy blogs, keep maximums around 64–80px. Test `clamp()` values at intermediate widths too, not only at the extremes. — [FrontFixer](https://frontfixer.com/section-leaving-big-blank-space/); [clampgenerator.com spacing guide](https://clampgenerator.com/guides/layout-spacing-padding-margin-gap-css-clamp/); [Elegant Themes clamp ramp](https://www.elegantthemes.com/blog/divi-resources/how-to-build-a-fluid-spacing-ramp-with-clamp-in-divi-5)
- Set desktop spacing first, then refine mobile only where the layout feels too tall or compressed. Check both viewports. — [Elegant Themes](https://www.elegantthemes.com/blog/divi-resources/mobile-responsive-design-with-divi-5) (vendor)

### Inferences
- Suggested token rules for the Focus Design `tokens.css`. These are inferences synthesizing the sources above, not quoted standards:
  - Base on 4/8: `--space-1: 4px` up to `--space-10: 128px`, with no off-scale values. Or adopt Utopia-style fluid tokens.
  - **Proximity ratio rule:** gap between groups ≥ 2× the gap within the group, the way the Refactoring UI scale steps 16 → 32 → 64. Heading-to-own-content gap < gap above the heading. Both can be checked automatically (section 5).
  - **Section padding token:** `--section-pad: clamp(3rem, 2rem + 4vw, 6rem)` (48 → 96px) as the default, plus a larger variant (≤ 120–128px) reserved for one or two "breathing" moments per page. Use the content-heavy limit of 64–80px for list or blog pages.
  - **No stacking:** apply section padding at one level only, for example `section > .container` gets none and `section` gets `padding-block`. Adjacent sections with the same background can share padding: use the top padding only, or halve it.
- Utopia defaults from general knowledge, not verified in this session: min viewport 320px, max 1240px. Space multipliers of step 0 are 3xs 0.25, 2xs 0.5, xs 0.75, s 1, m 1.5, l 2, xl 3, 2xl 4, 3xl 6.

### Gaps
- Apple HIG spacing/margin values: not found in this session (no search result, and the site was not fetched).
- Material 3 official page (m3.material.io) was blocked, so the numbers rely on consistent secondary sources.
- Exact Utopia default multipliers could not be verified (utopia.fyi blocked).
- No controlled study gives an "optimal" section padding in px. Every number is practice.

## 3. Grid filling: odd counts, orphans, column balance

### Takeaway
Orphans and empty cells are a direct result of a fixed column count meeting real content counts (3, 5, 7 items). The fixes are: pick column counts that divide the data (3 → 3 columns, 4 → 2×2 or 4, 5 → 3+2 or 2+3 with spans), use `auto-fit` (not `auto-fill`) when stretching is fine, and detect widows with `:nth-child`/`:last-child` (or `:has()` quantity queries) to center or span them. For text beside images, either stretch the image to the text height (`object-fit: cover`) or make it sticky with `align-self: start`, so neither column leaves a blank block.

### Cited Findings
- Combine `:nth-child()` and `:last-child` to detect a widow in the last row, then offset it with `grid-column-end` so it looks centred. — [CSS { In Real Life }: Controlling leftover grid items](https://css-irl.info/controlling-leftover-grid-items/) (Michelle Barker)
- CodePen variant for 3 columns: target the last item when the count matches `3n-2` (one orphan) or `3n-1` (two orphans). — [CodePen: CSS Grid + nth-child](https://codepen.io/michellebarker/pen/aMVLxb)
- Alternative technique: double the column count (for example 6 tracks for 3 visual columns), make each item span 2, and start the orphan at track 2. It only centres when the last row is short by one. — [Bill Erickson: CSS Grid center last item](https://www.billerickson.net/css-grid-center-last-item/)
- A Tailwind plugin generates `nth-last-child` rules for centering the last row, up to 12 columns by default. — [tailwind-grid-center](https://github.com/khoohaoyit/tailwind-grid-center)
- A native pseudo-class for "last item in each row/column of a wrapped grid" is only a 2026 CSSWG proposal, not shipped. — [W3C public-css-archive, Mar 2026](https://lists.w3.org/Archives/Public/public-css-archive/2026Mar/0917.html)
- `auto-fit` collapses empty repeated tracks, so items stretch across the row. `auto-fill` keeps them. Use auto-fit if a stretched last row is acceptable; otherwise auto-fill is the deliberate choice. Usual form: `repeat(auto-fit, minmax(<min>, 1fr))`. — [MDN repeat()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/repeat); [DEV: invisible columns](https://dev.to/parsajiravand/your-grid-has-invisible-columns-auto-fill-vs-auto-fit-3hh1)
- Grid's default `align-items: stretch` makes columns equal height automatically. — [CodeFronts: equal height two-column](https://codefronts.com/layouts/css-two-column-layout/css-two-column-layout-equal-height/)
- A sticky element needs a taller containing column to slide within. Stretching can stop a sticky image from moving, so set `align-self: start` on the sticky item. — [WebmasterWorld thread](https://www.webmasterworld.com/css/5099620.htm) (forum)

### Inferences
- CSS patterns (general knowledge and inference; check them in the browser):
  - **Odd-count-aware card grid.** `.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:var(--space-m)}`. auto-fit lets 1–2 leftovers stretch instead of leaving empty cells.
  - **Flex alternative that centers orphans:** `display:flex;flex-wrap:wrap;justify-content:center` with `flex:0 1 calc((100% - 2*gap)/3)`. The last row centres naturally.
  - **Quantity query with `:has()`:** `.grid:has(> :nth-child(5):last-child){grid-template-columns:repeat(6,1fr)}` with `.grid > *{grid-column:span 2}` and `.grid > :nth-child(4){grid-column:2 / span 2}`. This makes a 3+2 layout with the bottom pair centred. Make the first card span 2 for "4 = 1 big + 3" or "5 = 2 big + 3" bento layouts.
  - **Content counts should drive layout.** Since the facts live in `src/content/*.json`, the component can pick the layout from `items.length` at build time (Astro): `cols = n%3===0 ? 3 : n%4===0 ? 4 : n===5 ? '3+2' : 2`. This is simpler and more robust than CSS tricks.
  - **Text vs image split:** grid with `align-items:stretch` and `img{width:100%;height:100%;object-fit:cover}` inside a wrapper with `min-height:0`, so the image matches the text height. Or give the image a fixed `aspect-ratio` (4/5, 3/2) and set `align-items:center`, so the shorter column centres instead of hanging at the top with a gap below. For long text, make the image `position:sticky;top:var(--space-l);align-self:start`.
  - **Rule of thumb:** in a 2-column split, the height ratio of the two columns should be roughly 0.67–1.5. Outside that range, change the image aspect ratio, add content (a quote, data from business.json) or switch to a stacked layout.
- Masonry: native CSS masonry was still being specified in 2025–2026 as far as I know (not verified this session). For small-business galleries, a fixed grid with uniform `aspect-ratio` plus `object-fit: cover` avoids ragged bottoms without JS.

### Gaps
- No primary source fetched on `:has()` quantity queries specifically. The pattern is general knowledge.
- Native CSS masonry status was not verified in this session.

## 4. Mobile density at about 390px

### Takeaway
On phones the main dead-space risks are desktop padding copied to mobile, every desktop column turned into its own padded block (endless scroll), and forced full-height sections. Practitioner consensus: page margins of about 16px (Material compact) to 20–24px, section padding of about 48–64px, horizontal "peek" rails for sets of peer items you browse, and stacks or grids only where users need to compare.

### Cited Findings
- Material 3 compact (< 600dp) uses 16dp margins and 8dp gutters (some sources); medium and up use 24dp margins. — [1440px.com](https://1440px.com/breakpoints/material-design/); [hamen/material-3-skill](https://github.com/hamen/material-3-skill/blob/master/skills/material-3/references/layout-and-responsive.md)
- Mobile floors in practitioner `clamp()` examples: 32px, 48px and 64px. — [FrontFixer](https://frontfixer.com/section-leaving-big-blank-space/); [clampgenerator.com](https://clampgenerator.com/guides/layout-spacing-padding-margin-gap-css-clamp/); [Elegant Themes](https://www.elegantthemes.com/blog/divi-resources/how-to-build-a-fluid-spacing-ramp-with-clamp-in-divi-5)
- A horizontal rail of peers works when the next card is cut off at the viewport edge, which signals that the row scrolls. Hero sliders are bad; rails usually are not. — [21st.dev: React carousel components](https://21st.dev/blog/react-carousel-components) (practitioner)
- Implementation: `overflow-x: auto; scroll-snap-type: x mandatory`, with cards about 80% of the screen width so the next card shows. When users need to scan or compare many choices, a grid or vertical list is often better. — [envydesign peek carousel](https://envydesign.jp/patterns/en/carousel-peek/); [Suleiman: horizontal scrolling lists best practices](https://blog.iamsuleiman.com/horizontal-scrolling-lists-mobile-best-practices/); [lirunning: mobile carousels](https://lirunning.com/how-to-plan-mobile-carousels/)
- `100vh` on mobile is measured as if the toolbar were hidden, so heroes get clipped. The fix is `min-height: 100vh; min-height: 100svh;`, with `min-height` (not `height`) so content can grow. Use `svh` for stable heroes, and avoid `dvh` heights with transitions (they re-animate as the browser chrome moves). — [Web Designer Wall](https://webdesignerwall.com/tutorials/css-fix-for-ios-vh-unit-bug); [cssawwwards 2026](https://cssawwwards.com/blog/css-dvh-100vh-mobile-fix-2026); [talkingtech](https://talkingtech.io/100vh-is-a-lie-on-mobile-and-three-new-css-units-fix-it/)

### Inferences
- Concrete mobile targets for 390px (inference from the above):
  - Inline page margin 16–24px (`--gutter: clamp(1rem, 4vw, 1.5rem)`).
  - Section padding-block about 48–64px, rarely 80px. Above 80px at 390px is a red flag unless the section is a deliberate pause.
  - Inside a card: 16–24px padding, 8–12px between label and value, 16px between paragraphs.
  - **Padding share rule:** in a section at 390px, padding should not exceed about 40% of the section's total height. A 2-line block with 2×64px padding is about 75% padding and should be merged with a neighbour or lose padding.
  - Turn 3–6 peer cards (services, team, reviews) into a scroll-snap rail at 85% card width, instead of 6 stacked cards each 400px tall. Keep a stacked list for things to compare, such as price lists and opening hours.
  - Use `min-height: 100svh` only for a hero whose content (headline, sub, CTA, image) actually fills it. Otherwise use `min-height: auto` or a capped `min(80svh, 44rem)`.
  - Two-column desktop sections should stack with the image *above* the text, at a shorter `aspect-ratio` (for example 4/3 instead of 4/5), so the phone does not show a full screen of image.

### Gaps
- No NN/g article on mobile rails or carousels was retrieved (blocked). The evidence for rails is practitioner-level.
- No empirical source gives an "ideal" mobile section padding.

## 5. Detecting dead space automatically

### Takeaway
No off-the-shelf "dead space detector" turned up. A custom Playwright script is feasible and grounded in documented APIs: get bounding boxes for sections and their visible children at 390 and 1440px, then compute padding share, empty-cell counts, column-height mismatch and per-viewport ink coverage. Add a blurred-screenshot "squint test" and screenshot diffs for human or LLM review.

### Cited Findings
- Playwright's `boundingBox()` is relative to the viewport like `Element.getBoundingClientRect()`, and scrolling changes it (x/y may be negative). — [Playwright Locator docs](https://playwright.dev/docs/api/class-locator)
- Playwright's layout pseudo-classes (`:right-of`, `:near`, etc.) are deprecated and may be removed. Don't build an audit on them. — [Playwright other locators](https://playwright.dev/docs/other-locators)
- Elements with no content or `display:none` have an empty bounding box and count as not visible. Filter them out to avoid false gaps. — [Playwright LocatorAssertions](https://playwright.dev/docs/api/class-locatorassertions)
- Screenshot assertions (`toHaveScreenshot`) can cover visual checks that no layout API exposes. — [Playwright issue #14233](https://github.com/microsoft/playwright/issues/14233)
- **Squint test:** step back and partly close your eyes, or blur the page. View the whole design at 100%, then check that the most prominent blobs match the intended hierarchy. It mainly addresses layout, balance and hierarchy. — [Data Savvy: the squint test](https://datasavvy.me/2017/12/22/design-concepts-for-better-power-bi-reports-part-4-the-squint-test/); [takumi on note.com](https://note.com/takumi_uchu/n/n38b5e3927edd?hl=en); [Tony Olsson](https://olssontony.medium.com/did-you-squint-that-design-dca4226b80b9)
- Checklist items: even weight and white space on each side; elements that sit close together are related; no background or border louder than content; empty space looks intentional; no crowded area next to an empty one; small elements not packed so tightly they blur in the squint test. — [jezweb design-review SKILL.md](https://github.com/jezweb/claude-skills/blob/main/plugins/frontend/skills/design-review/SKILL.md); [DesignShifu](https://www.designshifu.com/blog/design-review-checklist-for-non-designers)
- An academic paper on LLM/GPT design evaluation lists distance between elements and consistent spacing between texts as measurable signals of white-space quality. — [arXiv 2410.08885](https://arxiv.org/pdf/2410.08885)

### Inferences
- Proposed automatic checks (inference; the thresholds are starting points to tune on the studio's own sites). Run each in Playwright at viewports 390×844 and 1440×900:
  1. **Padding share per section:** `(section.height - contentUnion.height) / section.height`, where contentUnion is the union bounding box of visible descendants (text nodes via Range rects, img, svg, button). Flag if > 0.5 at 1440 or > 0.4 at 390.
  2. **Absolute vertical gap:** sort the visible leaf boxes by y. Flag any vertical gap with no content across the full container width that is > 160px at 1440 or > 96px at 390. Exclude gaps that hold a background image or decoration.
  3. **Horizontal emptiness:** for each section at 1440, compute the union of content x-extents. Flag if content covers < 55% of container width and is not centred (|left margin − right margin| > 20% of container width). This catches the "empty right half".
  4. **Grid orphans:** for each grid/flex-wrap container, group children by `top` to get rows. Flag if the last row count < columns and the leftovers are not centred or spanning (an orphan left-aligned with empty cells to the right). Also count `getComputedStyle(grid).gridTemplateColumns` tracks against the number of children to spot empty auto-fill tracks.
  5. **Split-column mismatch:** for 2-child grid/flex rows, flag a height ratio > 1.5 or < 0.67, or a blank area under the shorter column > 120px when `align-items` isn't stretch or center.
  6. **Viewport-height sections:** flag sections with computed `min-height` ≥ 90% of viewport height where the content union is < 50% of the section height.
  7. **Ink coverage per viewport:** scroll in viewport steps and screenshot. Compute the share of pixels that differ from the section background colour (or edge-detect). Flag a viewport with < 8–10% ink below the hero (catches "screens of nothing" on mobile).
  8. **Proximity checks:** for each heading, `gapBelow` (to the next sibling) must be < `gapAbove` (to the previous sibling). Within a card stack, the internal gap must be < the gap between cards. Flag any violations.
  9. **Off-scale spacing:** read computed `margin`, `padding` and `gap` on all elements. Flag values not in the token set (± 1px rounding), which enforces the CLAUDE.md rule that only tokens are used.
  10. **Squint artefact:** save a blurred screenshot (for example CSS `filter: blur(8px)` on `html`, or sharp/ImageMagick blur) next to the normal one in `screenshots/`, for LLM or human review of balance.
- Turn the screenshots into visual regression baselines (`toHaveScreenshot`) once a page passes review, so later edits that reintroduce gaps show up as diffs.

### Gaps
- No published tool or study found that measures "dead space ratio" on web pages. The thresholds above are untested proposals.
- No validated mapping from pixel-ink coverage to perceived emptiness.

## 6. Vertical rhythm: line-height, baseline, heading/paragraph/button spacing

### Takeaway
Modern practice uses a unitless line-height (≥ 1.5 for body text) and spaces flow content in line-height units (`lh`/`rlh`, supported in all browsers since 2023), or uses a Stack with a single token. Strict baseline grids are optional. Consistent relationships matter more: the heading sits closer to its paragraph than to the previous block, with one consistent gap between paragraphs and a slightly larger gap before buttons.

### Cited Findings
- `lh` equals the element's own computed line-height and `rlh` the root's (CSS Values 4). All browsers have supported them since 2023. Older browsers can fall back to `calc(var(--line-height) * 1rem)`. — [Paweł Grzybek: vertical rhythm with lh and rlh](https://pawelgrzybek.com/vertical-rhythm-using-css-lh-and-rlh-units/); [Vincent Bernat 2026](https://vincent.bernat.ch/en/blog/2026-css-vertical-rhythm); [Trevor Lasn](https://www.trevorlasn.com/blog/css-lh-and-rlh-units)
- A unitless line-height scales properly with zoom. Use at least 1.5 for main paragraph content (an accessibility recommendation). — [MDN line-height](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/line-height)
- A common pattern is `* + * { margin-block-start: 1rlh }`, which gives one consistent gap that lines up headings, paragraphs and captions of different sizes on one grid of lines. `lh` scales with the element (bigger headings get bigger gaps). `rlh` keeps the gap uniform. Tall inline images or emoji can break the grid. — [Vincent Bernat](https://vincent.bernat.ch/en/blog/2026-css-vertical-rhythm); [Benjamin Crozat](https://benjamincrozat.com/css-lh-rlh)
- Every Layout Stack: one spacing value between siblings, set through the parent (`* + *`), default `--s1`. Nested stacks can use different values. — [Every Layout: The Stack](https://every-layout.dev/layouts/stack/)
- Headings closer to their own content than to the preceding section (proximity). — [NN/g Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
- Further reading on baseline-grid approaches: [iamsteve: a guide to vertical rhythm](https://iamsteve.me/blog/a-guide-to-vertical-rhythm); [Valerie Roske: adventures in vertical rhythm](https://valerie-roske.github.io/adventures-in-vertical-rhythm/)

### Inferences
- Rhythm recipe for the studio's `tokens.css` and prose blocks (inference):
  - `body{line-height:1.55}` for body text, headings 1.1–1.25. Cap paragraph measure at about 60–75ch (`max-width: 65ch`), which matches the Refactoring UI max-width advice.
  - `.flow > * + * { margin-block-start: var(--flow-space, 1rlh) }`, with `h2, h3 { --flow-space: 2rlh }` (more space *above* a heading) and `h2 + *, h3 + * { --flow-space: 0.5rlh }` (less *below*). Use `.flow > .btn, .flow > .actions { --flow-space: 1.5rlh }` before CTAs.
  - Eyebrow → heading 0.5rlh, heading → lead 0.75rlh, lead → CTA 1.5rlh. Every gap comes from one token family, so it is consistent and testable with check 8 above.
- A strict 4px baseline grid with cap-height trimming (`text-box-trim`) is optional polish. It is not needed to avoid dead space.

### Gaps
- `text-box-trim`/`text-box-edge` browser support was not verified in this session.
- No primary NN/g or Material source fetched with numeric heading/paragraph spacing ratios.
