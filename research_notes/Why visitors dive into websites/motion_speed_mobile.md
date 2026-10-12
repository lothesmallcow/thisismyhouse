# Motion, Interactivity, Page Speed and Mobile Behaviour vs Engagement and Conversion

Research context: critique of a small web design studio site (GSAP-heavy, 3D phone model, self-playing before/after makeover, living WebGL background, marquee ticker, scroll-driven colour floods). Audience: small Italian business owners, mostly on phones. Research date: October 2026.

Method note: nngroup.com, web.dev, thinkwithgoogle.com and datareportal.com could not be fetched directly from this environment (DNS failure). Findings from those domains come from search-engine excerpts of the original pages, not full-page reads. Exact figures quoted below appeared in those excerpts. Anything only found in secondary blogs is labelled as such.

## 1. Animation in UX: purposeful vs decorative motion, scrolljacking, parallax, autoplay, delight vs usability, waiting cost, reduced motion

### Takeaway
The research consensus (NN/g plus accessibility guidance) is that motion helps when it explains something: feedback, state changes, where things went, or a cue that something can be acted on. It hurts when it is decoration that pulls attention away from the task, makes people wait, or takes over scrolling. NN/g's usability testing found that scrolljacking threatens user control, discoverability, attention, efficiency and task success. Auto-forwarding or autoplaying content annoys users and must be pausable under WCAG. About a third of adults aged 40 and over have measurable vestibular dysfunction, and that age group overlaps heavily with small business owners, so honouring reduced-motion settings matters.

### Cited Findings
**Purposeful motion, duration and attention (data plus expert guidance)**
- NN/g's animation topic summaries say motion should be restrained and works best for feedback, state changes, navigation cues and reinforcing signifiers. They also note that moving elements pull attention away from users' main goals. — [NN/g animation topic](https://www.nngroup.com/topic/animation/)
- NN/g duration guidance: most UI animations should last about 100–500 ms. The rule of thumb is to use the shortest duration that does not feel jarring, and simple feedback such as a checkbox or toggle should take about 100 ms. — [NN/g: Executing UX Animations: Duration and Motion Characteristics](https://www.nngroup.com/articles/animation-duration/)
- NN/g says motion draws attention, so designers should weigh the animation's goal, how often it occurs, and its mechanics. Elements that slide in or otherwise change position, at any speed, attract attention faster than elements that fade in slowly. NN/g's example is a slide-in chat prompt (Olark): it alerted users effectively but distracted them from reading the page's main content. — [NN/g: Animation for Attention and Comprehension](https://www.nngroup.com/articles/animation-usability/)
- NN/g has a video on how animations distract and says the attention-grabbing strength of motion should match the context and user needs. — [NN/g video: Animations are Distracting!](https://www.nngroup.com/videos/distracting-animations/); [NN/g video: UX Animations](https://www.nngroup.com/videos/ux-animations/)
- Expert guidance holds that animated transitions between two states are easier to follow than instant cuts, which is the legitimate case for motion. — [UX Planet / Babich](https://uxplanet.org/how-to-use-animation-to-improve-ux-338819e93bdb)
- Microsoft's Windows UX guidelines (opinion and guideline, not a study) say animations should convey information that is useful but not critical, and users must be able to get the same information by other means. — [Microsoft UX guide: Animations](https://learn.microsoft.com/en-us/Windows/Win32/uxguide/vis-animations)
- An academic paper on UI transitions notes that animations can demand more cognitive work than static images, can distract, and make users wait for them to finish. — [HAL-LIRMM paper on animated transitions](https://hal-lirmm.ccsd.cnrs.fr/lirmm-00128259/document)
- Unverified secondary claim: a MoldStud article says "excessive movement lowers task completion by 60%" and that NN/g recommends no more than two effects per screen. The claim is attributed to NN/g, but I could not find it in NN/g's own pages, so do not cite it. — [MoldStud (secondary, unverified)](https://moldstud.com/articles/p-mastering-mobile-transitions-essential-animation-techniques-for-cross-platform-apps)

**Scrolljacking and scroll-triggered effects (usability-test evidence)**
- NN/g's "Scrolljacking 101" (Sara Paul, August 2023) defines scrolljacking as a pattern that changes the speed, and sometimes the direction, of scrolling. Based on NN/g's usability testing, sites using it "exhibit significant threats to user control and freedom, discoverability, attention, efficiency, and task success." — [NN/g: Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/)
- NN/g separates scrolljacking from scroll fading. Scroll fading only triggers an animation when the user reaches a point on the page and does not change how scrolling works, so it is the less harmful category. — [NN/g: Scroll Fading 101](https://www.nngroup.com/articles/scroll-fading-101/)
- A 2026 academic chapter ran a 20-participant experiment comparing scrolljacking and non-scrolljacking prototypes on accuracy, satisfaction and speed. I could not access its results. — [Springer: A Usability and Universal Design Investigation into Scrolljacking for Web Pages](https://link.springer.com/chapter/10.1007/978-3-032-16454-4_6)
- Practitioner opinion: scrolljacking breaks the expectation that the page moves when and how the user scrolls. Common complaints are input mismatch, performance problems and accessibility barriers. — [Web Designer Depot](https://webdesignerdepot.com/how-scrolljacking-breaks-ux-fundamentals/); [Red Sky Studios](https://redskystudios.co.uk/news/scroll-jacking-annoying-when-abused-delightful-when-done-right)

**Parallax**
- NN/g's "What Parallax Lacks" (summary): parallax adds visual interest but often causes slow loading and harder reading, so teams should weigh whether the benefit justifies the cost. — [NN/g animation topic page (article summary)](https://www.nngroup.com/topic/animation/)
- Princeton's digital accessibility guidance says parallax can cause dizziness or nausea even in people without vestibular disorders. It recommends avoiding parallax and scrolljacking and honouring the OS "reduce motion" setting. — [Princeton Digital Accessibility: Animations](https://digital.accessibility.princeton.edu/how/content/animations)
- Counterpoint (opinion, 2017): a W3C WCAG working-group mailing-list message argued that a blanket ban on parallax is too narrow and proposed a user setting to turn it off instead. — [W3C WAI-GL list](https://lists.w3.org/Archives/Public/w3c-wai-gl/2017JanMar/0264.html)

**Autoplay and auto-advancing content**
- NN/g published "Auto-Forwarding Carousels and Accordions Annoy Users and Reduce Visibility" (2013). The title states the finding. I could not retrieve the body. — [NN/g: Auto-forwarding](https://www.nngroup.com/articles/auto-forwarding/); [NN/g tweet announcing it](https://twitter.com/NNgroup/status/293438045825425408)
- Autoplaying moving content that lasts more than 5 seconds can fail WCAG 2.2.2 (Pause, Stop, Hide) unless the user has a way to pause or stop it. Practitioner sources also say autoplay makes users lose context. — [TestParty: accessible carousels](https://testparty.ai/blog/accessible-carousels-sliders-auto-playing-media); [Frontend Checklist](https://frontendchecklist.io/rules/accessibility/carousel-accessibility)
- Secondary claim that "about 1% of users interact with carousels," attributed to NN/g research. I did not verify it from the primary source. — [TestParty (secondary)](https://testparty.ai/blog/carousel-slider-accessibility)

**Reduced motion and vestibular prevalence (peer-reviewed data)**
- Agrawal et al., *Archives of Internal Medicine* 2009 (NHANES 2001–2004, n=5,086 US adults aged 40+): 35.4% had vestibular dysfunction, about 69 million Americans. Prevalence rose from 18.5% in people in their 40s to 85% at 80 and over. — [PubMed 19468085](https://pubmed.ncbi.nlm.nih.gov/19468085); [MDedge summary](https://mdedge.com/content/vestibular-dysfunction-common-after-age-40)
- The `prefers-reduced-motion` media query is the recommended mechanism: disable autoplay and large motion when it is set. — [Eevy video carousel guidance](https://eevy.ai/blog/video-carousel-best-practices); [Princeton](https://digital.accessibility.princeton.edu/how/content/animations)

**Hero video and animation A/B evidence (weak, anecdotal)**
- MetricTheory, a performance agency, tested a video hero on its own site. Bounce rose slightly, which the agency attributed to longer load time, but conversion rate and other behaviour metrics were stronger with the video. This is a single-site anecdote. — [MetricTheory](https://metrictheory.com/blog/how-a-performance-marketing-agency-tests-our-own-website/)
- Mida's aggregate data says hero image tests win 18% of the time on homepages, so most hero changes do not win. — [Mida](https://www.mida.so/change-types/hero-image/homepages)
- Practitioner claim: video heroes add 40–90 ms to INP on low-end Android when decoding runs on the main thread. — [Witscode (practitioner, unverified)](https://witscode.com/blogs/shopify-homepage-hero)

### Inferences
- Applied to this site:
  - **Scroll-driven colour floods** are scroll fading, the lower-risk category, provided native scroll speed and direction are untouched. Any snap or pinned "scenes" that hold the user, as in the earlier full-screen-scenes build, fall into NN/g's scrolljacking category.
  - The **marquee ticker** and **living WebGL background** are continuous decorative motion. NN/g's attention findings imply they compete with headline and CTA reading. Under WCAG 2.2.2 they need a pause or stop control, or to stop under `prefers-reduced-motion`.
  - The **self-playing before/after makeover** is purposeful motion because it explains a state change, which is the strongest legitimate case for animation. It still risks the "forced wait" cost if key content or the CTA sits behind it, and it must be pausable or replayable rather than auto-looping.
  - **3D phone model**: if it only rotates for show, it is decorative. If it frames a scrollable live demo of a client site, it supports comprehension.
- Small business owners in Italy skew 40+. With 18.5% to 35%+ vestibular prevalence in that age range, reduced-motion support is a real-audience issue, not an edge case.
- Keep transition durations at or below about 500 ms. Long GSAP timelines that gate content run counter to the NN/g guidance.

### Gaps
- No controlled study found that quantifies conversion loss from decorative animation specifically, as opposed to speed loss. NN/g's evidence is qualitative usability testing.
- Could not read the full NN/g texts for "What Parallax Lacks" or the auto-forwarding article, so only their summaries and titles are cited.
- Results of the 2026 Springer scrolljacking experiment were not accessible.
- No data found on the share of users who have `prefers-reduced-motion` enabled.

## 2. Interactive demos and "show, don't tell": do previews, before/after comparisons and live demos lift engagement or conversion?

### Takeaway
Vendor data consistently shows that visitors who engage with interactive demos convert far more, with figures from +16% to about 8x, but almost all of it is correlational and self-selected (engaged visitors were already more motivated) and comes from SaaS demo-tool vendors. I found no independent controlled study of before/after sliders or makeover animations. The most usable signals are about placement: demos placed higher on the page get much more engagement, and ungated demos are engaged with by about a quarter of visitors.

### Cited Findings
- Navattic's State of the Interactive Product Demo 2024 report: interactive demos can increase website conversion by 16% (vendor data). — [HockeyStack: Do interactive demos work?](https://www.hockeystack.com/lab-blog-posts/do-interactive-demos-work)
- HockeyStack's own dataset: visitors who engaged with demos converted at about 1.8% versus a 1.1% baseline, an implied 63% lift in MQL generation (vendor, observational). — [HockeyStack](https://www.hockeystack.com/lab-blog-posts/do-interactive-demos-work)
- Storylane with Factors.ai: visitors who engaged with an interactive demo converted at 24.35%, against a 3.05% dataset average, "nearly 8x." Storylane's 2026 statistics page says this is the only figure it stands behind and that other circulating lift numbers "trace to vendor blogs without inspectable methodology." — [Storylane: Interactive Demo Statistics 2026](https://www.storylane.io/blog/interactive-demo-statistics-2026); [Storylane: impact on conversion](https://www.storylane.io/plot/the-impact-of-interactive-demos-on-conversion-rates-sales-velocity)
- Walnut.io: a 32% average conversion increase from its platform data, with no methodology given (vendor). — [Walnut.io](https://www.walnut.io/blog/product-demos/interactive-demos-conversion-rates-b2b-2026-data/)
- A Chameleon customer quote claims "at least a 200% lift in conversion to signup every time" (anecdote). — [Chameleon](https://www.chameleon.io/blog/interactive-demos)
- Navattic 2023 data: ungated embedded demos had a 24% engagement rate, and demos higher on the page had 3.5x the engagement of those below the fold. — [Navattic: How to increase conversions for interactive demos](https://www.navattic.com/blog/increase-conversions-for-interactive-demos)
- Agency opinion: high-converting SaaS redesigns use real interface elements, animated flows or short micro-demos instead of generic decorative animation. — [Stan Vision](https://www.stan.vision/journal/saas-website-design)

### Inferences
- The studio's **live demo viewer** (scrollable demo sites inside a phone frame) and the **before/after makeover** are the "show, don't tell" assets with the best theoretical support. They show a small business owner what they would get.
- Placement matters more than polish. Per Navattic's 3.5x finding, a demo visitors can actually try should sit high on the page, not deep in a scroll story.
- The engaged-visitor conversion multipliers should not be presented as causal. Motivated visitors both engage and convert. The honest claim is "interactive proof is associated with higher intent; test it."
- A self-playing animation is not the same as an interactive demo. The vendor data concerns user-driven exploration. A passive auto-play is closer to a hero video, whose evidence is mixed (see section 1).

### Gaps
- No controlled or A/B evidence found on before/after sliders or makeover animations specifically, or on agency or portfolio sites.
- All interactive-demo data is SaaS/B2B software from vendors that sell demo tools, so there is a conflict of interest and the transfer to a local web studio is uncertain.

## 3. Page speed and Core Web Vitals vs conversion and bounce; heavy JS/WebGL on mobile

### Takeaway
Speed has the strongest quantitative evidence of anything in this brief.
- **Deloitte/Google (37 brands):** a 0.1 s mobile speed gain was associated with +8.4% retail conversions and +10.1% travel conversions.
- **Google mobile landing-page data:** bounce probability rises 32% as load time goes from 1 s to 3 s.
- **Vodafone Italy A/B test:** a 31% better LCP produced 8% more sales.

At the same time, the median mobile page already ships about 560 KB of JS. Median mobile Total Blocking Time rose to about 1.9 s in 2025, and only about 48% of mobile origins pass all Core Web Vitals. A GSAP + WebGL + 3D-model homepage starts well behind on the phones this audience uses.

### Cited Findings
**Deloitte "Milliseconds Make Millions" (2020, commissioned by Google)**
- Deloitte Digital analysed mobile site data from 37 retail, travel, luxury and lead-generation brands in Europe and the US over four weeks. Data came from Fifty-Five, and the study was commissioned by Google. — [WARC summary](https://www.warc.com/en/article/milliseconds-make-millions%3A-a-study-on-how-improvements-in-mobile-site-speed-positively-affect-a-brand%E2%80%99s-bottom-line-4ce17b61c16949cbb961036aafa85dbb); [Deloitte report PDF](https://www2.deloitte.com/content/dam/Deloitte/ie/Documents/Consulting/Milliseconds_Make_Millions_report.pdf)
- Results of a 0.1 s improvement:
  - Retail conversions +8.4% and average order value +9.2%.
  - Travel conversions +10.1%.
  - Luxury page views per session +8.6%.
  - **Lead-generation** informational pages: bounce rate improved 8.3%.

  — [Deloitte Ireland: Milliseconds make millions](https://deloitte.com/ie/en/services/consulting/research/milliseconds-make-millions); [web.dev case study](https://web.dev/case-studies/milliseconds-make-millions)
- The 0.1 s improvement was measured across First Meaningful Paint, Estimated Input Latency, average page load time and TTFB, and had to hold on every page of the journey. — [Deloitte PDF](https://www2.deloitte.com/content/dam/Deloitte/ie/Documents/Consulting/Milliseconds_Make_Millions_report.pdf)
- Caveat: this is an observational study with a small sample, sponsored by Google.

**Google bounce-probability data**
- "The probability of bounce increases 32% as page load time goes from 1 second to 3 seconds." The source is a Google study of about 900k mobile landing pages, 2017. — [Think with Google: page load time statistics](https://thinkwithgoogle.com/data/page-load-time-statistics); [WebsiteSetup (secondary, dating)](https://websitesetup.org/website-load-time-statistics/)
- The widely repeated companion figures (90% from 1 s to 5 s, and in other versions 106% at 6 s and 123% at 10 s) are attributed to the same Google research via Yoast and others. Only the 32% figure was confirmed on the Think with Google excerpt. — [Thrive Agency (secondary)](https://thriveagency.com/news/test-websites-speed-matters/)
- The often-quoted "53% of mobile visitors leave a page that takes more than 3 s" could not be traced to a primary Google page in this search. It appears in third-party roundups, so cite with caution or not at all. — [Huckabuy (secondary)](https://huckabuy.com/20-important-page-speed-bounce-rate-and-conversion-rate-statistics/)

**web.dev Core Web Vitals case studies (company-reported)**
- **Vodafone (Italy):** an A/B test of two visually and functionally identical pages, where the optimized one had a 31% better LCP, produced 8% more sales. The techniques included server-side rendering and deferring non-critical resources. This is directly relevant because it is Italian mobile users. — [web.dev: The business impact of Core Web Vitals](https://web.dev/case-studies/vitals-business-impact)
- **redBus:** Core Web Vitals work, including reducing CLS from 1.65 to 0, contributed to an 80–100% uplift in mobile conversion rate (company-reported). A separate redBus INP case study reportedly shows a 72% INP improvement with a 7% sales increase; that one comes from secondary sources and I did not verify it on the primary page. — [web.dev: business impact](https://web.dev/case-studies/vitals-business-impact); [Conductor roundup](https://www.conductor.com/academy/page-speed-resources/)

**State of the mobile web: JS weight and CWV pass rates (HTTP Archive, measured data)**
- Web Almanac 2024: the median JS payload rose 14% to 558 KB on mobile and 613 KB on desktop. The Page Weight chapter gives a slightly different 570 KB mobile median. — [Web Almanac 2024: JavaScript](https://almanac.httparchive.org/en/2024/javascript); [Web Almanac 2024: Page Weight](https://almanac.httparchive.org/en/2024/page-weight)
- Web Almanac 2025: median mobile Total Blocking Time rose to 1,916 ms, up 58% from 1,209 ms in 2024. Desktop was about 67 ms. The "good" threshold is under 200 ms. — [Web Almanac 2025: Performance](https://almanac.httparchive.org/en/2025/performance); [2024 Performance](https://almanac.httparchive.org/en/2024/performance)
- Mobile CWV pass rate: 36% (2023), then 44% (2024), then 48% (2025). Desktop is 56%. — [Web Almanac 2025: Performance](https://almanac.httparchive.org/de/2025/performance)
- Per secondary summaries of the Almanac: about 77% of mobile pages have good INP and about 81% good CLS, but only about 62% have good LCP, which is the hardest metric. — [Voxbooster summary (secondary)](https://voxbooster.com/blog/website-performance-statistics-2026/)
- Practitioner note from an Awwwards case study: heavy animated sites "can bog down browsers." Buzzworthy Studio used short intro animations partly to buy time for images to load. — [Awwwards: Case Study Buzzworthy Studio](https://www.awwwards.com/case-study-buzzworthy-studio.html)
- Trend commentary: immersive Three.js winners need aggressive asset optimization to hold frame rates on mid-range hardware. — [Digital Strategy Force (opinion)](https://digitalstrategyforce.com/journal/why-are-immersive-experiences-dominating-the-2026-awwwards/)

### Inferences
- Speed and responsiveness are the main ways heavy animation hurts conversion:
  - GSAP timelines, ScrollTrigger handlers, a WebGL shader background and a 3D model all add JS parse/execute and main-thread work.
  - That work raises TBT and INP and can delay LCP if the hero waits on the canvas or model.
  - The median mobile TBT is already about 1.9 s, roughly 10x the good threshold, so there is no headroom.
- The **lead-generation** row of the Deloitte study is the closest analogue to a web studio. Faster pages were associated with better bounce on informational pages, which supports leading with fast, static, readable content.
- Vodafone Italy shows that Italian mobile users reward LCP improvements with measurable sales in a true A/B test. That is good evidence to pair with the Italy usage data in section 4.
- Practical guidance this implies:
  - Render the hero as static HTML and an image first, so LCP does not depend on WebGL or 3D.
  - Lazy-init WebGL and 3D after first interaction or idle time, and pause the WebGL loop when it is off-screen or the tab is hidden.
  - Ship a static fallback on low-end devices and when `prefers-reduced-motion` is set.

### Gaps
- No primary data found specifically measuring WebGL background or 3D-model impact on CWV or battery for marketing sites. The impact is inferred from general main-thread and JS evidence.
- Could not directly verify the Google 1–5 s / 1–10 s figures or the "53%" figure on Google's own pages.
- Most speed-conversion data is e-commerce or travel. Evidence for small service businesses or agencies is limited to Deloitte's lead-gen row.

## 4. Mobile-first: mobile share (Italy/EU, SMB owners), thumb zones, sticky CTAs, tap targets, mobile reading

### Takeaway
In Italy the phone is the dominant way people are online:
- **Audiweb:** about 88–89% of all time online in 2025 came from mobile, and about 95% of 18–74-year-olds browsed on mobile.
- **StatCounter:** page-view shares are close to 50/50 desktop/mobile. This is because StatCounter counts page views on sites using its tracker, which over-weights desk-based work browsing.

NN/g found mobile reading comprehension much lower for complex text, so copy must be shorter and simpler. Most phone use is one-handed (49%). Tap targets should be at least about 1 cm, 44–48 CSS px.

### Cited Findings
**Italy usage**
- Audiweb (Audicom), April 2025: 44.5 million Italians online, 76.4% of the population aged 2+. Mobile generated 89.4% of total time online. — [ADC Group](https://www.adcgroup.it/adv-express/big-data/audiweb/audiweb-ad-aprile-sono-stati-44-5-milioni-gli-individui-online-pari-al-76-4-della-popolazione.html); [Touchpoint News, April 2025](https://www.touchpoint.news/2025/06/13/audiweb-ad-aprile-2025-online-445-milioni-di-italiani-boom-per-news-e-meteo/)
- Audiweb, August 2025: 94.8% of 18–74-year-olds (40.4 million) browsed from mobile. — [Touchpoint News, August 2025](https://www.touchpoint.news/2025/10/17/audiweb-in-agosto-435-milioni-di-italiani-online-cresce-il-tempo-dedicato-a-video-social-e-viaggi/); [YouMark](https://youmark.it/total-digital-audience-agosto-2025-435-milioni-di-italiani-online-il-mobile-domina-la-fruizione-digitale/)
- Audiweb, October 2025: 88.4% of time online came from mobile, and mobile reached 95.6% of 18–74-year-olds. — [Touchpoint News, October 2025](https://www.touchpoint.news/2025/12/17/audiweb-a-ottobre-2025-lonline-coinvolge-441-milioni-di-italiani/)
- Audiweb, November 2025: 88.5% of time online came from mobile, rising to 91.3% for women. — [Touchpoint News, November 2025](https://www.touchpoint.news/2026/01/19/audiweb-a-novembre-2025-online-439-milioni-di-italiani-mobile-sempre-piu-centrale/)
- StatCounter Italy page views: November 2025 was desktop 50.58% / mobile 49.42%. August 2026 was desktop 52.93% / mobile 45.73% / tablet 1.33%. This conflicts with Audiweb because the methods differ: page views on tracked sites versus a panel measuring time spent including apps. — [StatCounter: Desktop vs Mobile vs Tablet, Italy](https://gs.statcounter.com/platform-market-share/desktop-mobile-tablet/italy); [StatCounter: Desktop vs Mobile, Italy](https://gs.statcounter.com/platform-market-share/desktop-mobile/italy)
- Italy had about 82.2 million cellular connections in early 2025, 89.9% internet penetration, and 98.3% of mobile connections were broadband. — [DataReportal Digital 2025: Italy](https://datareportal.com/reports/digital-2025-italy)
- Italy recorded the highest mobile data traffic in Europe in 2024, about 17 exabytes and +15%. — [TIM Telecom Market Snapshot, September 2025](https://www.gruppotim.it/en/centro-studi-TIM/articles/Telecom-market-snapshot.html)

**Business buyers on phones (closest proxy for SMB owners)**
- A Google-commissioned BCG study (2017, about 3,000 B2B buyers) found:
  - About 50% of B2B search queries were made on smartphones, with a forecast of 70% by 2020. The 70% figure is often misquoted as measured.
  - 80% of B2B buyers use mobile at work.
  - More than 60% said mobile played a significant role in a recent purchase.
  - Company size was not isolated.

  — [BCG: Mobile Marketing and the New B2B Buyer](https://www.bcg.com/publications/2017/marketing-sales-digital-go-to-market-transformation-mobile-marketing-new-b2b-buyer); [Smart Insights summary](https://www.smartinsights.com/b2b-digital-marketing/b2b-mobile-buyer-behaviour-research/)

**Mobile reading (NN/g)**
- NN/g 2011: Cloze-test comprehension on an iPhone-sized screen was 48% of the desktop level. — [NN/g: Mobile Content Is Twice as Difficult](https://www.nngroup.com/articles/mobile-content-is-twice-as-difficult-2011/)
- NN/g 2016 update: short, simple text is understood as well on mobile as on desktop, but readers slow down on difficult text on mobile. NN/g advises being even briefer and simpler for mobile users. — [NN/g: Reading Content on Mobile Devices](https://www.nngroup.com/articles/mobile-content/); [NN/g: Legibility, Readability, and Comprehension](https://www.nngroup.com/articles/legibility-readability-comprehension/)

**Holding, thumb zones and tap targets**
- Hoober's 2013 field observation of 1,333 people: 49% held the phone one-handed, 36% cradled it and tapped with the other hand, and 15% used two hands. Grips change frequently. — [UXmatters: How Do Users Really Hold Mobile Devices?](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php); [A List Apart: How We Hold Our Gadgets](https://alistapart.com/article/how-we-hold-our-gadgets/)
- Thumb-zone design guidance places primary actions in the lower-middle, easy-reach area. — [Smashing Magazine: The Thumb Zone](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/); [Smashing: One-hand usage](https://www.smashingmagazine.com/2020/02/design-mobile-apps-one-hand-usage/)
- Tap target guidance:
  - NN/g: at least 1 cm × 1 cm, and primary CTAs deserve larger targets. — [NN/g: Touch Target Size](https://www.nngroup.com/articles/touch-target-size/)
  - Digital.gov: at least 48 CSS px with about 8 px spacing. — [Digital.gov: tap targets](https://digital.gov/guides/mobile-principles/tap-targets)
  - WCAG 2.1 AAA: 44×44 px. — [Smashing: Accessible Target Sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)

### Inferences
- For Italian small business owners, design and test phone-first. The Audiweb time share (about 88–89% mobile) is the better indicator of where an owner will first see the studio's site, often via WhatsApp, Instagram or Google Maps on the phone. StatCounter's near 50/50 likely reflects desk-time page views.
- A sticky bottom CTA (for example "Scrivici su WhatsApp" or "Chiama") fits the 49% one-handed grip and thumb-zone guidance. It must be at least 44–48 px tall and must not cover content or fight with GSAP-pinned sections.
- Copy inside animated scenes such as ticker text and flooded panels must be short and simple. NN/g shows that complex text on mobile slows comprehension, and moving text adds load on top.

### Gaps
- No Baymard data found on sticky CTAs in this search, and no Italy-specific study of how SMB owners research web suppliers on phones.
- No 2024–2026 replication of Hoober's grip data was found. The 2013 data predates today's larger phones.
- DataReportal's Italy "web traffic by device" figure could not be retrieved (page fetch failed).

## 5. Award-winning agency site trends (Awwwards/FWA 2024–2026): do "wow" sites convert ordinary clients or mainly impress designers?

### Takeaway
Award-site trends for 2025–2026 are dominated by Three.js/WebGL, GSAP and scroll-driven 3D storytelling, often for luxury brands. Awwwards judges design, usability and content but not conversion. I found no data showing that such sites convert ordinary SMB clients better. The evidence that they impress peers and help recruiting is anecdotal, and the speed and motion evidence above points the other way for phone-based, non-designer audiences.

### Cited Findings
- Awwwards submissions are judged on design, usability and content, with no conversion criterion. — [Digidop: Awwwards guide for agencies](https://www.digidop.com/blog/complete-guide-awwards-digital-agencies); [Wikipedia: Awwwards](https://en.wikipedia.org/wiki/Awwwards)
- Agencies use Awwwards for credibility and recruiting. Creative agencies often browse it to find new talent (agency guide, opinion). — [Digidop](https://www.digidop.com/blog/complete-guide-awwards-digital-agencies); [Elias Studio guide](https://www.elias.studio/en/blog/post/awwwards-plongee-dans-lunivers-des-meilleurs-sites-web-du-monde)
- Trend claim (secondary, unverified): 29 of 47 Awwwards Site of the Day winners in Q1 2026 used Three.js as their core renderer. Winners use scroll as the storytelling engine and increasingly respect `prefers-reduced-motion`. Commentators also note a shift toward one strong concept rather than stacked effects. — [Digital Strategy Force](https://digitalstrategyforce.com/journal/why-are-immersive-experiences-dominating-the-2026-awwwards/); [Utsubo: Best Three.js websites 2026](https://www.utsubo.com/blog/best-threejs-websites-2026)
- Example: Cartier's "365" campaign site (Three.js + GSAP + Svelte) won an Awwwards Site of the Day. This is luxury-brand use, not SMB lead generation. — [Love the Work / Cannes Lions](https://www.lovethework.com/work-awards/campaigns/365-a-year-of-cartier-761833)
- Designer debate exists ("why do most designers hate Awwwards sites"), but the thread is anecdotal. — [Quora](https://www.quora.com/Why-do-most-designers-hate-websites-featured-on-Awwwards-I-dont-understand-why-I-like-those-websites-a-lot-but-some-designers-dont)
- Agency opinion: effectiveness depends on objectives, users and resources, and the value lies in analysing award sites rather than copying them. — [Digidop](https://www.digidop.com/blog/complete-guide-awwards-digital-agencies)

### Inferences
- An Awwwards-style homepage tells peers and design-literate clients "we can do this." For a pizzeria or hairdresser owner on a mid-range Android, the same features add load, wait and distraction costs, which sections 1 and 3 show are measurable.
- The current award trend toward "one strong concept" and reduced-motion support suggests a middle path for the studio:
  - Keep one signature piece, such as the before/after makeover, which demonstrates the service.
  - Cut or defer the purely ambient layers (WebGL background, ticker), especially on mobile.
- The studio's site has two jobs that can conflict: portfolio proof of craft, and a lead-gen page for non-designers. A light, fast mobile path with an optional "full experience" on desktop serves both.

### Gaps
- No quantitative study or A/B test found comparing conversion of award-style immersive agency sites against simple ones.
- Could not verify official Awwwards or FWA 2025 Site of the Year winners or the Three.js share statistic from primary pages.
- No data on whether SMB owners (as opposed to brand marketers) are influenced by award badges.
