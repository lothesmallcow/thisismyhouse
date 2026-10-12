# Typography for a trustworthy yet distinctive one-person web studio site (Milan, 2025-2026)

Scope: a font recommendation (one or two families, free, open-license, self-hostable, full Italian coverage including à è é ì ò ù, the ’ apostrophe and €) for a studio site aimed at Italian small-business owners aged 35-65, mostly reading on phones. The owner rejected Archivo wide light (wght 300, wdth 125) and Bricolage Grotesque bold. The site must not look like the generic AI or template look.

Method note: many primary pages (ACM, NN/g, PMC, jeffhuang.com, readabilitymatters.org, basement.studio) could not be fetched from this environment (DNS and proxy blocks), so the study findings below come from search-result extracts of those pages. Treat exact wording as secondhand. The npm registry was reachable, so the font metrics, file sizes and glyph coverage below were **measured directly in this session** with fontTools on the Fontsource v5.3.x packages (`@fontsource-variable/<name>`, latin subset, upright wght axis only). There is a "Measured" table under Question 5.

---

## 1. What legibility research says about typeface, x-height, weight and size on mobile, and serif vs sans for trust

### Takeaway
No single font is fastest for everyone. Within ordinary, well-made text faces the speed differences are modest and preference does not predict speed. Weight and size matter more than the choice of family. Light and ultra-light weights measurably hurt legibility and raise cognitive load, and older readers rate them lowest. Body text should be regular weight (400 or slightly above), at least 16px and better 17-18px on phones, in a face with a generous x-height. On trust, serif and sans both do fine. What hurts trust is script or monospace text, not the lack of serifs.

### Cited Findings
**Wallace et al. 2022 (ACM TOCHI, "Towards Individuated Reading Experiences", Adobe/Readability Group)**
- They tested 16 fonts with hundreds of crowdsourced participants and normalized font size by perceived size. Each reader's fastest font was 35% faster in words per minute than their slowest, with no loss of comprehension. Which font was fastest depended on the individual. — [Adobe Research](https://research.adobe.com/publication/towards-individuated-reading-experiences-different-fonts-increase-reading-speed-for-different-individuals); [paper PDF](https://jeffhuang.com/papers/Readability_TOCHI22.pdf)
- Averaged across readers, Garamond was fastest at 312 WPM, Oswald was second at 295 WPM and Open Sans was slowest at 254 WPM, a 23% gap between best and worst. On speed *rank*, Franklin Gothic scored highest at 59%, with Garamond and Avenir Next both near 48-50%. — [paper PDF](https://jeffhuang.com/papers/Readability_TOCHI22.pdf); [ACM full text](https://dl.acm.org/doi/fullHtml/10.1145/3502222)
- Age: the younger group read faster on average in most fonts, but the older group was faster in EB Garamond and Montserrat. — [paper PDF](https://jeffhuang.com/papers/Readability_TOCHI22.pdf)
- Preference did not predict speed. "Personal preference for fonts did not necessarily predict reading speed" (co-author Ben Sawyer). A reader's preferred font "was seldom best". Readers preferred Noto Sans, Montserrat and Garamond, while Noto Sans and Lato won on speed plus comprehension combined. — [UCF IEMS](https://iems.ucf.edu/study-shows-personalized-fonts-speed-up-reading-maintain-comprehension/); [Readability Matters](https://readabilitymatters.org/articles/2022/03/29); [Readability Matters, earlier study](https://readabilitymatters.org/articles/accelerating-adult-readers-with-typeface)
- NN/g's summary is titled "Best Font for Online Reading: No Single Answer". — [NN/g](https://www.nngroup.com/articles/best-font-for-online-reading/)

**Burmistrov and Zlokazova (NordiCHI 2016) and follow-ups, on light weights**
- In an eye-tracking study, light and ultra-light fonts were less legible than regular and bold at two contrast levels and in both polarities. Fixation duration and saccade amplitude showed higher cognitive load. The authors recommend avoiding light and ultra-light weights for body text. — [Burmistrov NordiCHI'16 PDF](https://flatisbad.com/publications/Burmistrov-NordiCHI16.pdf); [ACM/Unpaywall record](https://unpaywall.org/10.1145%2F2971485.2996745)
- In an earlier performance study, lightweight fonts hurt legibility and raised cognitive load in word-search tasks. — [Burmistrov NordiCHI'16 PDF](https://flatisbad.com/publications/Burmistrov-NordiCHI16.pdf)
- In ECCE 2017, 63 subjects compared Helvetica Neue weights in pairs. Users of all ages rated ultralight very low for legibility. Younger users found ultralight more attractive than older users did. Objective legibility and subjective appeal do not always match. — [search extract of Burmistrov publications](https://flatisbad.com/publications/Burmistrov-NordiCHI16.pdf); [Faint Design project](https://web-archive.nli.org.il/National_Library/20160526010038mp_/http://faint.design)
- A counterpoint: in a VSS 2024 poster ("Light or Bold? Navigating Font Weights and Grades"), lighter grades and weights were read slightly faster, but the difference was not statistically significant and the effect was larger in younger readers. — [VSS 2024](https://www.visionsciences.org/presentation/?id=1032); [Readability Matters VSS round-up](https://readabilitymatters.org/articles/vss-2024-readability-research-posters-published)

**Size and x-height**
- Legge and Bigelow (2011) found a "fluent" range of print sizes where reading reaches maximum speed, spanning x-heights of about 0.2° to 2° of visual angle (1.4 mm to 14 mm at 40 cm). Below the critical print size, reading speed drops sharply. For some readers and conditions the critical size is larger, around 4.5-5 pt equivalent. — [Legge & Bigelow 2011, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3428264); [UMN PDF](https://legge.dl8.umn.edu/sites/legge.psych.umn.edu/files/2020-08/Legge%20Bigelow%202011%20Does%20size%20matter%20for%20reading%3F%20A%20review%20of%20findings%20from%20vision%20science%20and%20typography.pdf); [Bigelow & Holmes blog](https://lucidafonts.com/blogs/bigelow-holmes-blog/why-the-new-york-times-magazine-s-redesign-is-probably-not-more-legible-than-its-previous-design)
- VSS also has a poster titled "Font Size, X-Height, and Readability: How Typography Affects Reading Speed Across Different Sizes". I did not get its result. — [VSS](https://www.visionsciences.org/presentation/?id=2645)
- Practitioner guidance: body text should be at least 16px (1rem) on mobile, and size needs grow with age, so use rem units and respect the browser setting. One accessibility guide suggests about 19 CSS px (14 pt) for older audiences. Most sites use 15-18px. — [Front-End Checklist](https://frontendchecklist.io/rules/css/font-size); [PowerMapper](https://www.powermapper.com/resources/best-practices/usability-font-size/); [Marvel, "Your Body Text Is Too Small"](https://marvelapp.com/blog/body-text-small/)

**Serif vs sans for trust and credibility**
- AMCIS 2008 tested a simulated online banking site. Serif and sans-serif faces both produced more user trust than monospace and script faces. The study shows that serif and sans *together* beat novelty styles, not that serif beats sans. — [AIS eLibrary, AMCIS 2008](https://aisel.aisnet.org/amcis2008/215)
- Errol Morris's 2012 NYT experiment, where Baskerville increased agreement with statements, is widely retold, but I only found it secondhand. — [Mere Inkling summary](https://mereinkling.net/tag/baskerville/)
- A "9% more trustworthy" figure attributed to Monotype is repeated in agency blogs, and I could not verify it. — [Heart Internet](https://www.heartinternet.uk/blog/?p=24428)
- There is a peer-reviewed study on serif vs sans for e-commerce usability (PMC9680897). I could not read its results. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9680897/)

### Inferences
- **Translating Legge and Bigelow to phones (my own calculation, not from a source).** On a modern iPhone (DPR 3, about 460 ppi) one CSS px is about 0.166 mm. A 16px font with an x-height of 0.53 em gives an x-height of about 1.4 mm, which is about 0.24° at 33 cm. With a 0.48 em x-height it is about 0.22°. Both sit close to the lower edge (0.2°) of the fluent range. Presbyopic 50-65-year-olds often hold phones further away and have larger critical print sizes. **Recommendation: 17-18px body text (1.0625-1.125rem) in a face with an x-height of at least 0.50 em**, line-height about 1.5-1.6, and a measure of about 35-45 characters on phones.
- The rejected Archivo wide light (wght 300) is exactly what Burmistrov warns against. Older users rate light weights lowest, and that is the core audience here. Body text should be 400, and up to about 450 if the variable axis allows. Light weights should not be used even at display sizes for this audience.
- Since preference does not predict speed and differences between ordinary text faces are small, the family can be chosen mainly for personality and trust signal. The legibility constraints are only about weight, size and x-height.

### Gaps
- I could not read the full Wallace paper's per-age-group preference ranking or the font list from the primary source.
- I found no study directly measuring perceived trust of specific modern grotesques (e.g., Schibsted vs Inter) for small-business sites.
- I could not retrieve the Beier or Sanocki & Dyson findings. Searches did not surface them and their pages were not fetchable, so they are not cited here.

---

## 2. What respected agency, studio and SaaS sites use (2025-2026) and close free equivalents

### Takeaway
Top SaaS and studio sites mostly use either commercial grotesques (Söhne at Stripe; Neue Montreal, Founders Grotesk and Söhne on Typewolf picks) or open faces they commissioned (Geist for Vercel by Basement; Instrument Sans for Instrument). Linear uses Inter. The free equivalents are well known, and several of them are now the default output of AI and template tools. Distinctiveness therefore comes from less-used open grotesques with a clear origin, such as Schibsted Grotesk (news media), Host Grotesk and Funnel, not from cloning Söhne or Linear.

### Cited Findings
- **Stripe** uses Söhne (Klim). Inter is called the closest free equivalent. — [fontalternatives.com](https://fontalternatives.com/inspiration/stripe-sohne/)
- **Linear** uses Inter, not a custom face. One comparison lists Inter Variable as its display font. This is secondhand from one blog series. — [opendesigner.io](https://opendesigner.io/es/blog/recreating-stripe-linear-vercel-design-systems-with-design-md); [webdesignhot](https://www.webdesignhot.com/design.md/linear/diff/vercel/)
- **Vercel** uses Geist Sans, Geist Mono and Geist Pixel. They are OFL, released Oct-Nov 2023, made with Basement Studio. — [Basement Studio, "The Birth of Geist"](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web); [opendesigner.io](https://opendesigner.io/de/blog/recreating-stripe-linear-vercel-design-systems-with-design-md)
- **Instrument (agency)** commissioned Instrument Sans from Rodrigo Fuenzalida and Jordan Egstad (2023). It is open-sourced on Google Fonts, with variable weight and width, italics and 12 stylistic sets. — [Google Fonts](https://fonts.google.com/specimen/Instrument%2BSans/about); [GitHub Instrument/instrument-sans](https://github.com/Instrument/instrument-sans); [Fontsource](https://fontsource.org/fonts/instrument-sans/about)
- **Typewolf Site of the Day picks in 2025** were mostly commercial: Athletics (Söhne and Feature), Kin (Tobias, Söhne and Söhne Mono), Nestig (Gooper and Matter), Great Catering (Feature and Founders Grotesk), Dream Recorder (Times Now and Neue Montreal). — [Typewolf](https://typewolf.com:443)
- **Schibsted Grotesk** was designed by Bakken & Bæck with Henrik Kongsvoll for digital interfaces at Schibsted, a Scandinavian news media group. It is OFL, with variable weight and italics. — [RightFont](https://rightfontapp.com/family/schibsted+grotesk); [Google Fonts DESCRIPTION mirror](https://secret.blahaj.dedyn.io/misc/Fonts/fonts-main/ofl/schibstedgrotesk/DESCRIPTION.en_us.html); [Figma fonts](https://www.figma.com/fonts/schibsted-grotesk/)
- **Host Grotesk** is a uniwidth variable sans from Element Type, open source on Google Fonts. Its widths stay constant across weights, so a hover weight change does not reflow the text. — [Adobe Fonts listing](https://fonts.adobe.com/fonts/host-grotesk)
- **Hanken Grotesk** is by Alfredo Marco Pradil (Hanken Design Co., 2015), OFL. — [RightFont](https://rightfontapp.com/family/hanken+grotesk)
- A Milan studio directory (maxibestof.one) attributes PP Mori, Marlide Display and Giga to Pop-Eye Studio, but the attribution is unclear. — [maxibestof.one](https://maxibestof.one/directory/pop-eye-studio)
- Self-hosting is rising: the HTTP Archive 2025 Web Almanac shows Google Fonts still leads but its share is slipping as more sites self-host. — [Web Almanac 2025 Fonts](https://almanac.httparchive.org/en/2025/fonts)

### Inferences
- Close free equivalents of the commercial faces above: Söhne / Neue Haas → Inter, Geist, Schibsted Grotesk, Hanken Grotesk. Neue Montreal → Host Grotesk, Funnel Sans, Instrument Sans. Founders Grotesk → Schibsted Grotesk, Libre Franklin. These pairings are my judgement from letterform similarity, not from a cited comparison.
- Geist strongly signals "Vercel / developer tool". It is also the default in Next.js starters and v0 output, so it reads as dev-SaaS or AI-built rather than as a local studio that serves bakeries and plumbers. I did not verify the default in this session. Avoid it as the primary face.
- I found no free-licensed, documented "house font" at any notable Italian studio. Italian studios seem to use commercial faces, Pangram Pangram (PP) faces in particular.

### Gaps
- I could not verify the 2025-2026 fonts on Framer, Locomotive, Basement's own site or Pentagram's site. Fetches were blocked and search gave nothing reliable.
- I found no Fonts In Use entries for Milan web studios.
- I could not confirm the designer or foundry of Funnel Display / Funnel Sans from a source. I believe it was made for Funnel (by NB Studio), but this is not verified.

---

## 3. Pairings that read professional + warm + modern; display vs text sizes, tracking, number of weights

### Takeaway
For this audience, one variable grotesque family covering both headlines and body is the safest way to look professional and modern. It is one file and one voice, the way news media do it. Warmth should come from weight contrast, tight-tracked heavy headlines and Italian copy, not from a decorative serif. If a second family is used, it should be a superfamily partner (Funnel Display + Funnel Sans) or a serif used only for a few large words. It should not be an Instrument Serif or Fraunces italic accent, because those are AI-template tells (see Q4). Use two or three weights at most.

### Cited Findings
- Trend commentary for 2026 cites expressive and "soft" serifs, variable fonts as the default expectation, and a return to investment in custom or licensed type. These sources are trend blogs, not data. — [Made Good Designs, Font Trends 2026](https://madegooddesigns.com/font-trends-2026/); [Inspo AI, Typography trends 2026](https://www.inspoai.io/blog/typography-trends-2026); [Speckyboy](https://speckyboy.com/exploring-latest-trends-web-typography.md)
- Variable fonts are now the standard expectation for serious releases in 2026. — [Made Good Designs](https://madegooddesigns.com/font-trends-2026/)
- Instrument Sans ships 12 stylistic sets and a width axis. Inter has opsz ("Inter Display" optical size) in the Fontsource `opsz` file. — [Google Fonts Instrument Sans](https://fonts.google.com/specimen/Instrument%2BSans/about); measured Fontsource file list (see Q5)

### Inferences (practical spec, my synthesis; no single source)
- **Weights:** body 400, emphasis and buttons 600, headlines 700-800. Do not ship anything under 400.
- **Mobile sizes:** body 17-18px (line-height 1.55). Lead paragraphs 19-20px. H1 about clamp(2.25rem, 8vw + 0.5rem, 4.5rem), so roughly 36-40px on a 390px phone, line-height 1.05-1.1. H2 26-30px. Labels and eyebrows 13-14px, weight 600, uppercase, tracking +0.06em.
- **Tracking:** headlines at 32px and above at -0.02 to -0.035em (heavier and larger means tighter). Body text at 0, never negative below 20px. Uppercase micro-labels positive (+0.04 to +0.08em).
- **Numbers:** use `font-variant-numeric: tabular-nums` for prices in € and for counters. In my GSUB check of the Fontsource latin files, Schibsted Grotesk, Funnel Sans/Display, Instrument Sans, Onest, Golos, Public Sans and Atkinson Hyperlegible Next expose `tnum`. Hanken Grotesk, Host Grotesk and Libre Franklin did not show it in the subset. This is a quick check, so verify it in a browser.
- **Warmth without the cream and terracotta cliché:** a warm off-white or pure white with a deep ink colour, plus heavy headlines in a humanist-leaning grotesque with a slightly quirky "a", "g" or "R" (Schibsted, Funnel). Italian-language micro-typography also helps: proper ’ apostrophes (l’azienda), « » or “ ” quotes, and € with a non-breaking space ("da 490 €" in Italian convention, or "€ 490"; pick one and use it consistently).

### Gaps
- I found no empirical source on optimal heading tracking values. The values above are conventional practice.

---

## 4. Fonts that currently signal "AI-generated / template" and should be avoided

### Takeaway
The clearest documented tells are Inter or Roboto everywhere with a purple or indigo gradient on white, Space Grotesk as the "creative" default, and a condensed or editorial serif accent, specifically Instrument Serif, which has become the default of LLM-assisted and vibe-coded sites. The prompt guidelines that AI coding tools themselves ship now explicitly ban these fonts, so models steer toward the next tier (Satoshi, Manrope, Plus Jakarta Sans, DM Sans, Outfit, Bricolage). That tier is quickly becoming the new template look.

### Cited Findings
- A University of Georgia data-science blog post says certain serifs now signal AI ("tasteslop"). It names Instrument Serif as having moved from a niche DTC-brand nod to the default output of LLM-assisted and vibe-coded web work, helped by being free on Google Fonts. — [UGA AgTech Data, "AI Has Come for Serif Fonts"](https://agtechdata.uga.edu/ai-has-come-for-serif-fonts/)
- Analysis of serif branding at AI companies. — [Keya Vadgama, Substack](https://keyavadgama.substack.com/p/the-serif-renaissance-in-ai-branding)
- Monotype's 2024 trend report presented the return of classic serifs as a deliberate, nostalgia-driven move, which is a counterpoint to reading every serif as AI. — [AAP / Monotype release](https://www.aap.com.au/aapreleases/cision20240208ae32562)
- Anthropic's frontend-design skill, as mirrored by third parties, tells the model to avoid "overused font families (Inter, Roboto, Arial, system fonts)" and purple gradients on white. It says never to converge on common choices "(Space Grotesk, for example)". A community variant adds Space Grotesk to a never-use list. — [skillselion mirror of anthropics frontend-design](https://skillselion.com/skills/smithery.ai/anthropics-frontend-design); [mcp.directory](https://mcp.directory/skills/anthropic-frontend-design); [Smithery frontend-aesthetics](https://smithery.ai/skills/bejranonda/frontend-aesthetics)
- Other AI-design skill files ban Inter and Roboto as primary fonts. One lists Helvetica, Arial, Roboto, Open Sans, Montserrat, Playfair Display, Poppins and Lato as overused. — [skillselion vibe skill](https://skillselion.com/skills/othmanadi/vibe-skills/vibe); [skills.sh fonts](https://skills.sh/jacbk/persona/fonts)
- Inter is described as Figma's system font, a default in many design systems and the most-used font on Google Fonts. — [Made Good Designs, "Popular Fonts Designers Actually Use (2026)"](https://madegooddesigns.com/?p=237)
- Inter + Instrument Serif and Inter + Space Grotesk are listed as common pairings in type directories. — [maxibestof Inter + Instrument Serif](https://maxibestof.nuxt.dev/typefaces/inter/pairing/instrument-serif); [maxibestof Inter + Space Grotesk](https://maxibestof.nuxt.dev/typefaces/inter/pairing/space-grotesk)

### Inferences
- **Avoid as primary:** Inter / Inter Tight, Geist, Space Grotesk, Instrument Serif (especially in italic as an accent word), Playfair Display, Poppins, Montserrat, DM Sans, Plus Jakarta Sans, Manrope, Outfit, Sora, Satoshi, General Sans, Fraunces (the "warm craft" template serif), and Bricolage Grotesque. The owner has already rejected Bricolage. The "anti-Inter" instructions in AI tools steer models toward these fonts, which makes them the 2025-2026 template tier. This is my inference from how the skills are worded and from common template catalogues. I found no quantitative source ranking them.
- **The tell is the combination, not the font alone:** Inter + gradient + bento cards, or a sans + italic serif accent word + cream/terracotta. A less-seen grotesque in a confident, plain layout reads as human-made.

### Gaps
- I found no quantitative dataset (e.g., counts of fonts in v0, Lovable or Bolt output) showing which fonts AI tools pick by default.

---

## 5. File size, performance and licensing (OFL, self-hosting) of candidates

### Takeaway
Every Google Fonts / Fontsource candidate is SIL OFL 1.1, so self-hosting, subsetting and bundling with the site are allowed. The Google "latin" subset already contains à è é ì ò ù, À È É Ì Ò Ù, ’ “ ” « » and €. I verified this for every font in the table below, so Italian needs only the latin file and latin-ext can be skipped. A single upright variable latin file costs 17-47 KB. Fontshare faces (Satoshi, General Sans, Switzer) are **not** OFL. They are under ITF's Free Font License, which forbids redistribution, so they fail the "open-license" constraint.

### Cited Findings
- Fontshare "closed source" fonts are proprietary freeware by Indian Type Foundry under the ITF Free Font License (FFL). Fontshare also hosts some OFL fonts. A self-host offline kit is offered, but the fonts may not be redistributed and the terms may change. — [licenseorg.com, Fontshare license guide](https://licenseorg.com/guide/fonts/fontshare); [AlternativeTo, Fontshare](https://alternativeto.net/software/fontshare/about)
- Geist is under the OFL. — [Basement Studio](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)
- Schibsted Grotesk is under the OFL, with latin and latin-ext. — [Google Fonts DESCRIPTION mirror](https://secret.blahaj.dedyn.io/misc/Fonts/fonts-main/ofl/schibstedgrotesk/DESCRIPTION.en_us.html)
- All Fontsource packages measured here declare `"license": "OFL-1.1"` in package.json, version 5.3.x. — [npm @fontsource-variable/schibsted-grotesk](https://www.npmjs.com/package/@fontsource-variable/schibsted-grotesk) (and same pattern for each family)

**Measured in this session.** Fontsource variable packages from registry.npmjs.org. Files are `*-latin-wght-normal.woff2` (upright, weight axis only). x-height is measured from the outline of "x" divided by units per em. All rows contain € and the Italian accents and punctuation listed above.

| Family | wght range | latin woff2 (KB) | x-height / em | x / cap | Italic file | Notes |
|---|---|---|---|---|---|---|
| **Schibsted Grotesk** | 400-900 | 45.7 | 0.527 | 0.75 | yes | news-media origin; no light weights; tnum |
| **Funnel Sans** | 300-800 | 17.0 | 0.500 | 0.74 | yes | superfamily with Funnel Display |
| **Funnel Display** | 300-800 | 17.3 | 0.500 | 0.74 | no | display partner |
| **Host Grotesk** | 300-800 | 19.8 | 0.496 | 0.71 | yes | uniwidth across weights |
| **Hanken Grotesk** | 100-900 | 33.9 | 0.493 | 0.71 | yes | |
| Instrument Sans | 400-700 (+wdth file 57 KB) | 29.4 | 0.510 | 0.71 | yes | 12 stylistic sets |
| Onest | 100-900 | 33.0 | 0.527 | 0.75 | no | |
| Golos Text | 400-900 | 37.0 | 0.530 | 0.76 | no | |
| Libre Franklin | 100-900 | 28.6 | 0.530 | 0.71 | yes | Franklin Gothic revival; Franklin had the best speed rank in Wallace et al. |
| Public Sans | 100-900 | 26.2 | 0.517 | 0.72 | yes | |
| Atkinson Hyperlegible Next | 200-800 | 33.2 | 0.496 | 0.74 | yes | legibility-focused |
| Radio Canada Big | 400-700 | 17.8 | 0.530 | 0.77 | yes | |
| Familjen Grotesk | 400-700 | 18.5 | 0.500 | 0.77 | yes | |
| Mona Sans | 200-900 (+wdth) | 38.9 | 0.517 | 0.71 | yes | GitHub |
| Figtree | 300-900 | 19.7 | 0.500 | 0.71 | yes | template-common |
| Geist | 100-900 | 28.7 | 0.530 | 0.75 | yes | Vercel / AI-default signal |
| Inter | 100-900 | 47.1 (opsz file 72.9) | 0.546 | 0.75 | yes | AI-default signal |
| Manrope | 200-800 | 24.3 | 0.540 | 0.75 | no | template-common |
| Plus Jakarta Sans | 200-800 | 26.7 | 0.536 | 0.72 | yes | template-common |
| DM Sans | 100-1000 | 36.1 | 0.504 | 0.72 | yes | template-common |
| Space Grotesk | 300-700 | 21.8 | 0.486 | 0.69 | no | flagged as AI-common |
| Bricolage Grotesque | 200-800 (opsz file 76.9) | 40.4 | 0.528 | 0.80 | no | rejected by owner |
| Archivo | 100-900 (wdth file 90.1) | 34.1 | 0.526 | 0.77 | yes | rejected (wide light) |
| Outfit | 100-900 | 31.5 | 0.460 | 0.68 | no | small x-height |
| Fraunces (serif) | 100-900 (all axes 121 KB) | 35.8 | 0.481 | 0.69 | yes | warm-template serif |
| Newsreader (serif) | 200-800 (opsz 132 KB) | 56.7 | 0.441 | 0.65 | yes | small x-height: display only |
| Source Serif 4 (serif) | 200-900 | 49.7 | 0.492 | 0.73 | yes | |
| Literata (serif) | 200-900 | 51.3 | 0.507 | 0.72 | yes | screen-reading serif |
| Instrument Serif (static 400) | 400 only | 20 | 0.510 | 0.71 | yes | AI-tell (Q4) |

Sources for the table: Fontsource packages on npm, e.g. [@fontsource-variable/schibsted-grotesk](https://www.npmjs.com/package/@fontsource-variable/schibsted-grotesk), [@fontsource-variable/funnel-sans](https://www.npmjs.com/package/@fontsource-variable/funnel-sans), [@fontsource-variable/host-grotesk](https://www.npmjs.com/package/@fontsource-variable/host-grotesk), [@fontsource-variable/hanken-grotesk](https://www.npmjs.com/package/@fontsource-variable/hanken-grotesk). The values are my own measurements with fontTools 4.66.

### Inferences
- **Performance budget:** one upright variable file (17-46 KB) plus at most one italic file. Preload only the upright latin file, use `font-display: swap`, and use a metric-matched fallback (`size-adjust` / `ascent-override` on Arial or system-ui) to avoid layout shift. Skip latin-ext, which Italian does not need. Keep it only if Polish, Czech or Romanian client names might appear.
- Multi-axis files (opsz or wdth) cost 2-3 times as much (Bricolage opsz 77 KB, Archivo wdth 90 KB, Fraunces full 121 KB). That is another reason to drop the rejected wide or opsz looks.

### Gaps
- I did not check Fontsource's per-family Italian-specific kerning (e.g., "l’A", "dell’"), only glyph presence.
- I could not read the full ITF FFL text directly.

---

## Recommendation (synthesis for the report writer)

**Primary pick: Schibsted Grotesk, used alone, for headlines and body text.**
- *Why trustworthy:* it was designed by Bakken & Bæck for a Scandinavian news-media group's digital interfaces ([RightFont](https://rightfontapp.com/family/schibsted+grotesk)), so it carries a "journalism and information" register rather than a startup one. Its measured x-height of 0.527 em is among the largest of the non-template options, which helps at 17-18px on phones for 35-65 readers. Its weight range starts at 400, so the light weights that Burmistrov's research warns against are not even possible.
- *Why distinctive:* it is rarely used on agency or AI templates, and its bold weights have characterful, slightly sharp terminals. At 700-800 with -0.03em tracking it gives confident headlines that are neither Inter nor Bricolage.
- *Spec:* body 400 at 17-18px, line-height 1.55. UI and buttons 600. H1/H2 at 800 / 700 with -0.02 to -0.035em tracking. Use `tabular-nums` for € prices. Load only `schibsted-grotesk-latin-wght-normal.woff2` (45.7 KB) plus the italic if needed.

**Alternative (two-family superfamily, lighter): Funnel Display (headlines, 700-800) + Funnel Sans (body, 400/600).** About 34 KB for both upright files, OFL, with a playful but controlled display cut and a sober text cut from the same system. Its designer and origin need confirming (Gap, Q2).

**Other strong single-family options, in order:**
1. Host Grotesk (20 KB, uniwidth, Element Type)
2. Hanken Grotesk (34 KB)
3. Libre Franklin (29 KB; Franklin Gothic had the best speed rank in Wallace et al.)
4. Atkinson Hyperlegible Next, if legibility for older readers is the overriding priority

**Do not use:** Inter, Geist, Space Grotesk, Instrument Serif, Fraunces, Satoshi, General Sans or Switzer (the last three are not OFL), the Manrope / Plus Jakarta / DM Sans / Outfit / Sora template tier, any weight below 400 for text, or wide-width display styles.
