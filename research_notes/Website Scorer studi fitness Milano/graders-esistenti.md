# Existing website graders and audit tools (as products and lead magnets), 2025-2026

Method note: this session's network blocked WebFetch to the tools' own sites (website.grader.com, blog.hubspot.com, developer.chrome.com). Every finding below comes from web-search snippets and summaries of the cited pages, not from full page reads. Confidence is medium overall, and lower wherever noted.

## 1. What each tool checks, its data sources, and how the overall score is computed

### Takeaway
Almost every general grader is built on Google Lighthouse, often with a proprietary score added on top. Local auditors score listing completeness and consistency instead, plus reviews. No two tools agree on categories or weights, so scores are not comparable across tools.

### Cited Findings
- **HubSpot Website Grader**: 0-100 score in four categories: Performance 30, SEO 30, Mobile 30, Security 10. Example dashboard: 84 = 14/30 + 30/30 + 30/30 + 10/10. The weights come from a HubSpot example view and a third-party guide; I found no current official weights page (medium-low confidence). — [HubSpot blog](https://blog.hubspot.com/marketing/does-your-website-make-the-grade); [Raka](https://www.rakacreative.com/blog/web-design-development/what-you-can-learn-from-our-website-grader); [G2](https://www.g2.com/products/website-grader/reviews)
- HubSpot's 2021 article describes the factors as performance, SEO, design (responsive, font size, tap targets) and security. — [HubSpot blog 2021](https://blog.hubspot.com/marketing/website-grader)
- **Google PageSpeed Insights / Lighthouse (v10+)**: the performance score is a weighted average. TBT 30%, LCP 25%, CLS 25%, FCP 10%, Speed Index 10%. Each raw metric is mapped to 0-100 through a scoring distribution. Weights have changed across versions (v6, v8, v10). — [Lighthouse 6.0](https://developer.chrome.com/blog/lighthouse-6-0); [Lighthouse 10](https://developer.chrome.com/blog/lighthouse-10-0); [Framer guide](https://www.framer.com/help/articles/guide-to-lighthouse-scores/)
- PSI shows two kinds of data side by side: lab data from a simulated device, and field data (Core Web Vitals from real Chrome users). The two can disagree. — [Framer](https://www.framer.com/help/articles/guide-to-lighthouse-scores/); [DebugBear](https://www.debugbear.com/blog/why-is-my-lighthouse-score-different-from-pagespeed-insights)
- **GTmetrix**: an A-F grade that blends the Lighthouse Performance score with GTmetrix's own "Structure" score. Sources disagree on the split: GTmetrix's blog says 70:30, while DebugBear and an older GTmetrix post say 60:40. Bands: A 90-100, B 80-89, C 70-79, D 60-69, E 50-59, F <50. — [GTmetrix blog](https://gtmetrix.com/blog/?p=14262); [DebugBear](https://www.debugbear.com/software/gtmetrix-grade)
- **Ahrefs (Webmaster Tools / Ahrefs Free)**: Health Score = % of internal URLs without errors. 5,000 crawl credits per month per project. Only works on sites whose ownership you verify. — [Ahrefs AWT](https://ahrefs.com/webmaster-tools); [Ahrefs blog](https://ahrefs.com/blog/awt-website-crawler/)
- **Semrush Site Audit (free account)**: 100 pages per audit and 100 per month, resetting on the 1st of the month. The separate free "SEO Checker" allows 3 checks per day. — [Semrush KB](https://it.semrush.com/kb/338-how-many-pages-can-i-crawl-in-an-audit); [Semrush SEO Checker](https://www.semrush.com/siteaudit/)
- **Ubersuggest**: free use is roughly 3 searches/day without an account and about 5 with a free account, according to third-party sources only. The free tier includes a basic site audit. Paid plans allow 150/300/900 reports per day (official). — [Ubersuggest help](https://ubersuggest.zendesk.com/hc/en-us/articles/31017874222363); [Hackceleration review](https://hackceleration.com/ubersuggest-review/)
- **Wix**: the SEO Setup Checklist is a guided to-do list rather than a score. It asks for the business name, whether you serve customers at a physical address, and 3 keywords. It does not analyze blogs or Stores. Site Inspection is separate and reads indexing data from Google Search Console. — [Wix support](https://support.wix.com/en/article/improving-your-online-presence-with-the-wix-seo-setup-checklist); [Wix Site Inspection](https://support.wix.com/en/using-wix-site-inspection)
- **Squarespace**: I found no evidence of a built-in scored site audit. It has an SEO panel for titles and descriptions. Sources conflict on this point (low confidence). — [Website Builder Expert](https://www.websitebuilderexpert.com/website-builders/wix/wix-seo-review/)
- **LocaliQ Website Grader**: an overall "digital score" made from 19+ metrics, each with its own weight. It covers the website build, SEO, Google Business Profile, ads/analytics and social, and shows benchmarks against competitors. — [LocaliQ](https://localiq.com/website-grader/); [LocaliQ UK](https://www.localiq.co.uk/website-grader)
- **Localo**: a GBP Audit Score of 0-100% from 17 automated checks, with recommendations grouped by priority. Localo states explicitly that the score is its own and "does not measure your position in Google". — [Localo docs](https://docs.localo.com/en/articles/12115771-what-is-an-audit-in-localo-and-how-to-read-it)
- **BrightLocal**: a suite of free one-off checkers (e.g., Local Search Results Checker). The full Local Search Audit, with 300+ checks, is a paid or trial product. — [BrightLocal](https://www.brightlocal.com/local-seo-audit-tool/)
- **Birdeye**: a free Local SEO Audit that scans listings on 50+ sites and returns a "scorecard". A separate Listings Score rates accuracy, visibility and completeness. — [Birdeye audit](https://birdeye.com/local-seo-audit/); [Birdeye Listings Score](https://birdeye.com/listing-score)
- **Moz Local**: one article says a free listing check exists at moz.com. Moz Local itself has no free trial. I found no details on what the check scores (low confidence). — [G2 compare](https://www.g2.com/compare/birdeye-vs-moz-local)
- **Italian options**: SEOZoom is the main Italian SEO suite, and I found no free scored audit from it. Italian-language versions of foreign tools are common: Semrush "Controllo SEO", Sitechecker (score based on the number and variety of errors), SEOptimer's local audit (GBP, site, reviews, listings), and Neil Patel's Italian analyzer. — [Trend-online](https://www.trend-online.com/2024/08/02/seozoom-tool-italiano-analisi-seo/); [Sitechecker IT](https://sitechecker.pro/it/on-page-seo-checker/); [SEOptimer IT](https://www.seoptimer.com/it/local-seo-audit/); [Semrush IT](https://it.semrush.com/siteaudit)

### Inferences
- A score labelled "SEO 30/30" can sit next to a site with no booking link, prices or timetable. Generic graders measure the technical condition of a site, not whether it brings in clients.
- Localo is open that its score is its own construct, and that is a good model. A Milan scorer should state what its score does and does not mean.

### Gaps
- Current official HubSpot weights, and whether HubSpot still uses Lighthouse under the hood. The site could not be fetched.
- Which GTmetrix blend weights apply today.
- Uberall, Partoo, Italiaonline/PagineGialle: I found no free scored checks in search.

## 2. How results are presented and how understandable that is to a non-technical owner

### Takeaway
The dominant patterns are a 0-100 gauge, a letter grade, red/orange/green bands and category subscores. Fluctuating scores and metric jargon (TBT, LCP, CLS) are the most documented sources of confusion.

### Cited Findings
- Lighthouse and PSI use a gauge with red (0-49), orange (50-89) and green (90-100) bands. Metrics are shown under their technical names. — [Framer](https://www.framer.com/help/articles/guide-to-lighthouse-scores/)
- GTmetrix leads with a school-style A-F letter grade. — [DebugBear](https://www.debugbear.com/software/gtmetrix-grade)
- **Fluctuation**: John Mueller (Google) says scores "can change over time even without changes on your site". Causes include server response time, CDN cache, CPU of the test machine and test location. Google advises treating performance as a distribution rather than one number. — [Search Engine Journal](https://www.searchenginejournal.com/google-pagespeed-insights-score-can-change-regardless-of-changes-to-a-site/291795/); [BrowserStack](https://browserstack.com/docs/speedlab/guide/lighthouse-score-variance); [Google forum](https://groups.google.com/g/pagespeed-insights-discuss/c/uKl859uilJo)
- One user on the PSI forum reported scores alternating between 74/88 and 97/96 on the same site. — [Google forum](https://groups.google.com/g/pagespeed-insights-discuss/c/uKl859uilJo)
- Hosting vendors tell users to test several times and average the results. — [InMotion](https://www.inmotionhosting.com/support/edu/wordpress/performance/how-much-does-pagespeed-fluctuate/); [Jetpack](https://jetpack.com/support/jetpack-boost/why-my-jetpack-boost-speed-score-changes-and-what-to-do-about-it/)
- Different graders give different scores for the same site because each uses its own criteria. — [Shopify](https://www.shopify.com/blog/website-grader)
- Localo groups fixes by priority rather than listing every failed check. — [Localo docs](https://docs.localo.com/en/articles/12115771-what-is-an-audit-in-localo-and-how-to-read-it)

### Inferences
- Owners respond better to a few plain-language "top fixes" ordered by priority than to long lists of failed audits.
- Avoid showing the raw Lighthouse number as the headline. It varies between runs and can drop an owner from "green" to "red" overnight, which destroys trust. Use bands, or median several runs.
- Coloring most of the screen red will feel alarmist when generic technical checks fail on typical small-business sites.

### Gaps
- No solid Reddit, G2 or Capterra corpus specifically about owners' UX complaints with graders surfaced. Jargon and alarmism are inferred from the design patterns above plus the fluctuation threads, not from a user study.

## 3. Email gating patterns, lead-magnet numbers and what feels spammy

### Takeaway
HubSpot asks for the email together with the URL before showing results. Local and SEO vendors usually ask for an account or "a few details". Practitioner consensus is to show the score first and gate the detailed report or plan. Hard conversion numbers are scarce and mostly unverified.

### Cited Findings
- HubSpot: you enter a URL and an email address to get a 1-100 score. — [HubSpot relaunch post](https://blog.hubspot.com/marketing/website-grader-relaunch); [Toolradar](https://toolradar.com/blog/best-analyzer-lead-magnet-examples)
- HubSpot offers partners an embeddable Website Grader widget that attaches scores to lead records in the CRM. — [HubSpot partner widget](https://www.hubspot.com/solutions-partner-resource-center/website-grader-widget)
- Scale: Website Grader had graded more than 4 million sites by the time it was replaced by Marketing Grader. That figure is from around 2011-2012 and is old. — [HubSpot blog](https://blog.hubspot.com/blog/tabid/6307/bid/29274/HubSpot-Launches-Free-Marketing-Grader-Tool-to-Replace-Website-Grader.aspx)
- "Tens of millions of leads" over 15 years is an agency claim with no stated method (unverified). — [Toolradar](https://toolradar.com/blog/best-analyzer-lead-magnet-examples)
- LocaliQ UK: get the report by "entering a few details". — [LocaliQ blog](https://localiq.co.uk/blog/5-reasons-to-use-localiqs-website-grader)
- Ahrefs requires proof of site ownership, and Semrush requires a free account for full results. That works as a strong gate for owners with no technical help. — [Ahrefs](https://ahrefs.com/webmaster-tools); [Semrush IT](https://it.semrush.com/siteaudit)
- CXL's experiment advocates ungating part of the tool and asking for the email only after the user has got value. — [CXL](https://cxl.com/blog/accelerate-lead-generation/)
- One playbook estimates lead capture at 5-15% for ungated tools with optional email and 30-60% for gated results, and 2-8% for tool-to-signup conversion. It cites no data source (low confidence). — [Playbooks](https://playbooks.com/skills/skenetechnologies/plg-skills/free-tool-strategy)
- Neil Patel (113 companies): leads rose from 138 to 606 per month after adding free tools. This is vendor data and does not compare gate positions. — [Neil Patel](https://neilpatel.com/marketing-stats/free-tools-lead-generation/)
- Gating low-value output "trains people to give you fake email addresses". — [Zapier](https://www.zapier.com/blog/gated-content-best-practices)

### Inferences
- What feels spammy: an email requested before any value is shown, a phone number field, generic advice that could apply to any site, and a sales pitch soon after.
- For Milan, the email request needs explicit, separate GDPR consent for marketing. One defensible flow: show the score and top 3 fixes free, then offer the full PDF plan by email with an unticked consent checkbox.

### Gaps
- I found no A/B data comparing gating before the score with gating after it.
- I found no documented evidence of HubSpot sales calls following grader use.
- Italian consent guidance (Garante) was not researched here.

## 4. Graders built for gyms, fitness studios or salons

### Takeaway
I found almost nothing scored and specific to fitness. The vertical tools that exist are salon-platform graders and checklists from vendors such as Mindbody and Zenoti. That leaves a clear gap for a fitness-specific scorer for Milan.

### Cited Findings
- GlossGenius Business Health Grader: a free score for salon booking sites across 17 factors with an action plan, delivered in under a minute. The factor list was not visible. — [GlossGenius](https://glossgenius.com/blog/business-health-grader)
- Mindbody publishes a "Client Experience Audit for Your Fitness Business", an unscored PDF checklist covering website, front desk, classes and social. — [Mindbody PDF](https://www.mindbodyonline.com/sites/default/files/public/education/learning-assets/Client%20Experience%20Audit%20for%20Your%20Fitness%20Business_0.pdf)
- A vendor page cites a study of 36 US gym websites (2026): 83.3% scored C or lower, with a median homepage score of 65/100 (unverified, marketing source). — [Webtonic](https://www.webtonic.io/sub-services/gym-web-design)
- Salon and spa guidance says to put "Book Now" above the fold on every service page, make the site mobile-first, and show reviews. Phorest found 46% of clients rate reviews and testimonials as the most important content. — [Zenoti](https://zenoti.com/blogs/7-must-haves-on-your-spa-salon-or-barbershop-website); [DaySmart checklist](https://www.daysmart.com/spa/wp-content/uploads/sites/7/2025/10/Spa-Website-Checklist.pdf)

### Inferences
- The vertical checks generic graders miss are: visible timetable, prices or trial offer, a booking or WhatsApp CTA above the fold, reviews, address and map link, instructor bios, and class types (pilates/yoga). These are the differentiators for a Milan studio scorer.

### Gaps
- GlossGenius's 17 factors, and whether any booking platform used in Italy (e.g., Mindbody, TeamUp) offers a grader, are not confirmed.
