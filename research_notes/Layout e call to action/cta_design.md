# CTA design for a one-person web studio (Milan) selling redesigns to small Italian local businesses

Context: main offer = free homepage preview in 72 hours, pay balance only on approval; contact via form, WhatsApp, phone. Research date: October 2026.

Method note (important for the report writer): direct page fetches to nngroup.com, cxl.com, econsultancy.com, datareportal.com and unbounce.com were blocked from this environment (DNS failure / proxy 403). Most findings below therefore come from search-result excerpts of the primary pages or from secondary write-ups that quote them. Each item says which. Evidence grades used: **[Strong]** = independent research with a large sample or an official standard; **[Moderate]** = a single published A/B test with a named author; **[Weak/vendor]** = vendor or agency self-reported case, no sample sizes, or an unsourced aggregate.

---

## 1. Placement and repetition (how many CTAs, where, above vs below the fold)

### Takeaway
Put the primary CTA in the hero, because most attention sits in the first screenful. Repeat the same CTA after each "proof" block and at the end, because for a considered purchase the CTA that converts is often the one that comes after the persuasion. The "below the fold beats above" test shows the CTA has to follow enough explanation. It does not show that the hero CTA should be removed.

### Cited Findings
- NN/g 2018 eyetracking: about 57% of page-viewing time was above the fold, down from 80% in 2010. 74% of viewing time was in the first two screenfuls (up to 2160px). The data was 130,000+ fixations from 120 participants on 1920×1080 screens. NN/g says the sharp drop in attention after the fold "remains the same". **[Strong]** (source: search excerpt of the primary NN/g page, also repeated by Mixpanel) — [NN/g: Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/); [Mixpanel summary](https://mixpanel.com/blog/optimizing-above-the-fold)
- Mixpanel's summary of the same data adds that about 17% of viewing time falls just below the fold. — [Mixpanel](https://mixpanel.com/blog/optimizing-above-the-fold)
- ContentVerve (Michael Aagaard) test: moving the CTA below the fold, after a much longer explanation of the value proposition, raised conversions by **304%**. The control had a prominent "Start free trial" button at the top. Aagaard said the CTA worked better once visitors had digested the features and benefits, and that the whole lift cannot be credited to button position alone, because the copy length changed too. **[Moderate, confounded]** (secondary write-ups; I could not fetch the original ContentVerve post) — [Econsultancy: six case studies on CTA placement](https://econsultancy.com/six-useful-case-studies-on-where-to-place-your-cta-to-maximise-conversions/); [SitePoint thread](https://www.sitepoint.com/community/t/push-it-making-your-cta-buttons-more-clickable/108118)
- Secondary analyses say CTA placement depends heavily on context, and that below-the-fold testing matters most for long sales pages and landing pages. — [Econsultancy](https://econsultancy.com/six-useful-case-studies-on-where-to-place-your-cta-to-maximise-conversions/)
- Venture Harbour's own homepage case ("3 homepage design tweaks… 500%") is part of the same practitioner literature arguing for CTAs placed after proof. **[Weak/vendor]**: self-reported. — [Venture Harbour CRO case studies](https://ventureharbour.com/cro-case-studies/)

### Inferences
- How long it takes a visitor to decide depends on how complex and risky the offer looks. "Free preview in 72h, pay only if you approve" is low-risk and easy to understand, so a hero CTA can convert visitors who arrive already persuaded (for example from a referral or a local search). Visitors who are still sceptical need proof first, so the CTA must repeat after the proof sections.
- Recommended skeleton for a homepage of about 6–8 sections:
  1. **Hero:** primary button ("Voglio l'anteprima gratuita") plus a secondary text link or WhatsApp.
  2. **After before/after examples or portfolio:** repeat the primary CTA.
  3. **After "Come funziona" (3 steps) and pricing:** repeat the primary CTA.
  4. **After testimonials or FAQ, as the final section:** a full-width closing CTA band with the form and the direct-contact options.
  5. **Mobile only:** a sticky bar (see §6).

  That gives roughly 3–4 in-page appearances of the same primary CTA, plus the sticky bar on mobile. The important rule is that every appearance offers the same action with the same wording, so the repetition does not create extra choices.
- Because 74% of attention is in the first two screenfuls, the hero plus the first proof block decide most outcomes. Avoid a hero tall enough to push the CTA out of view on a 360–390px-wide phone.

### Gaps
- I found no rigorous, published test that varies how many times the same CTA repeats on a service-business homepage (for example 1 vs 3 vs 5). Repetition guidance is practitioner consensus.
- I could not verify the ContentVerve 304% test's sample size or date from the original page.
- I found no CXL or Unbounce primary data on placement that I could fetch directly.

---

## 2. Button design (size, shape, contrast, colour myths, whitespace, icons, states)

### Takeaway
What matters is that the button stands out from everything around it (the von Restorff effect) and is big enough to tap reliably. The specific colour, for example "red beats green", does not matter in itself. Use one accent colour reserved for actions only, at least a 44–48px tap height, a filled (not ghost) primary button, and clear hover, focus, active and disabled states.

### Cited Findings
- **Tap target minimums** **[Strong, official standards]**:
  - WCAG 2.2 SC 2.5.8 (AA) sets a floor of 24×24 CSS px, with a spacing exception. — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  - WCAG 2.5.5 (AAA) asks for 44×44 CSS px. — [W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  - Apple asks for a minimum tappable area of 44×44pt for all controls (quoted in a W3C GitHub discussion). — [w3c/wcag issue 1831](https://github.com/w3c/wcag/issues/1831)
  - Google Material recommends at least 48×48dp. — [Front-End Checklist: touch targets](https://frontendchecklist.io/rules/accessibility/touch-targets)
- **Ghost vs filled buttons:** CXL tested ghost buttons on FreshEgg's homepage over 10,000+ visits. The result was statistically significant: **20% fewer clicks** on the ghost variant. The author called it a one-off test that is "in no way definitive". The same study included a click test that measured time to click and mis-clicks. **[Moderate]** (search excerpt of the primary CXL page) — [CXL: Ghost Buttons: UX Disaster or Effective Design?](https://cxl.com/blog/ghost-buttons/)
- UX Movement argues that ghost buttons lack a strong visual cue, which lowers click-through, and that they work better as secondary actions next to a solid primary button. **[Opinion]** — [UX Movement](https://uxmovement.com/?p=10559)
- **Contrast and hierarchy:** the EU component library specifies a high-contrast primary button against the background "ensuring an easily distinguishable visual hierarchy". It also says a negative or destructive primary action should be less contrasting. **[Design-system guidance]** — [European Commission component library: button usage](https://ec.europa.eu/component-library/v2.39.0/ec/components/button/usage)
- Smashing Magazine's classic guidance is high contrast against both the surroundings and the background. **[Opinion, 2009]** — [Smashing Magazine](https://smashingmagazine.com/2009/10/call-to-action-buttons-examples-and-best-practices)
- A secondhand claim attributed to Baymard says nearly half of e-commerce sites struggle to tell their primary buttons apart from other buttons. **[Unverified secondhand]** — [Design Systems Collective](https://www.designsystemscollective.com/designing-better-buttons-consistency-hierarchy-buttons-vs-links-2ae9c1a46ec8)
- Practitioner sources on Hick's law recommend the von Restorff (isolation) effect, so that the primary CTA looks visually distinct from everything else. — [Stacked Marketer: Hick's law](https://www.stackedmarketer.com/psychology-of-marketing/hicks-law/)

### Inferences
- **Colour myth:** the famous red-vs-green button wins are best read as contrast effects. A button wins when its colour is the only use of that hue on the page. This fits the "Insegna" identity (navy and white with orange used only for actions): orange stays exclusive to clickable primary actions and is never used for decoration or headings.
- **Proposed spec:**
  - Height 48–56px on mobile and at least 48px on desktop.
  - Horizontal padding 24–32px. Full-width on phones of 390px or narrower inside the content column.
  - Label at least 16–18px, semibold.
  - Radius consistent with the identity, either pill or 8–12px. Shape is not an evidence-based lever; consistency is.
  - At least 8px between adjacent tap targets (beyond WCAG's 24px spacing rule) and about 24–32px of whitespace around the primary CTA.
  - Text inside the button needs at least 4.5:1 contrast. Run the brand orange through a contrast check: white text on a mid-orange often fails, so use dark navy text on orange, or a darker orange.
- **Arrows and icons:** a trailing "→" signals forward motion. The WhatsApp glyph and phone icon help recognition on the direct-contact buttons. There is no reliable lift data either way, so treat icons as clarity aids.
- **States:** hover (darken about 8–10%), visible focus ring (keyboard and accessibility), pressed or active state, and a loading state on form submit ("Invio in corso…") to stop double submits. Then show a success message that states the next step.

### Gaps
- I could not fetch Baymard's or NN/g's primary button-design articles.
- I found no rigorous evidence on button shape (rounded vs square) or arrow icons affecting conversion.

---

## 3. CTA copy (first vs second person, benefit-specific vs generic, length, urgency)

### Takeaway
Use specific, benefit-led button text that names what the visitor gets ("Ricevi l'anteprima gratuita", "Voglio la mia anteprima in 72 ore"), never "Invia" or "Contattaci". First person ("Voglio…", "la mia") has the best-known positive test, but another test of the same change came out negative, so test it rather than treating it as a rule. Use real deadlines only (the 72-hour delivery promise is a genuine and strong one). No fake countdowns.

### Cited Findings
- **ContentVerve "your" → "my":** changing "Start your free 30-day trial" to "Start my free 30-day trial" produced a reported **90% increase in sign-ups**. **[Moderate, secondhand]** (Leadpages retelling; original ContentVerve page not fetched) — [Leadpages: landing page button text fix](https://leadpages.com/blog/landing-page-button-text-fix)
- **"Create your account" vs "Create my account":** the "your" version performed about **25% worse**. Attribution is inconsistent: one source credits Michael Aagaard, another gives no source. **[Weak, inconsistent attribution]** — [Indie Hackers](https://www.indiehackers.com/post/tip-use-first-person-perspective-in-your-ctas-to-increase-your-click-through-rate-417e2cfb11); [Ragan](https://www.ragan.com/one-word-copy-changes-that-will-increase-your-roi/)
- **The first-person rule does not always hold:** a 2026 Review42 analysis reports that Aagaard's "your" → "my" change gave a 90% click lift on one Unbounce landing page but a **24.95% drop** on a payment page. It concludes that CTA tactics are page-specific. Leadpages also reports a 24% conversion drop after a "my" → "your" switch. **[Moderate, secondhand]** — [Review42 CTA tips](https://resources.review42.com/call-to-action-tips/); [Leadpages](https://leadpages.com/blog/landing-page-button-text-fix)
- Aagaard ran 250+ A/B tests focused on copy (headlines, body, form and button copy) and later worked as Senior Conversion Optimizer at Unbounce. — [Unbounce: 10 super smart people talk copywriting](https://unbounce.com/?p=14262)

### Inferences
- **For Italian:** first person works naturally with "Voglio…" ("Voglio la mia anteprima gratuita"). The second-person imperative ("Ricevi l'anteprima gratuita") is also specific. The lever with the most support is the specific benefit in the label; the pronoun matters less.
- **Candidate primary labels, 2–5 words:**
  - "Voglio l'anteprima gratuita"
  - "Ricevi l'anteprima in 72 ore"
  - "Prenota la mia anteprima"
- **Final form submit:** "Invia e ricevi l'anteprima" rather than "Invia".
- **Avoid:** "Scopri di più", "Contattaci" or "Invia" as the primary label.
- **Urgency without dark patterns:** use real constraints only. The 72-hour turnaround itself, real monthly capacity if true ("Prendo 4 nuovi progetti al mese"), and a dated, genuine offer. No countdown timers, no invented "3 posti rimasti", and nothing that resets on reload. Reading Italian/EU consumer-protection rules on misleading practices (Codice del Consumo, UCPD) against fake scarcity is an inference here; I did not verify it in this research.

### Gaps
- I could not fetch the original ContentVerve posts, so sample sizes, dates and significance for the 90% and 25% figures are unverified.
- I found no Italian-language CTA copy A/B tests.

---

## 4. Microcopy under buttons that reduces anxiety

### Takeaway
A short line of reassurance right under the CTA is a widely recommended, low-risk practice. Address the specific fear: cost, commitment, spam, or a slow reply. The published evidence is mostly vendor expectations, and the microcopy must be literally true, because inaccurate reassurance backfires.

### Cited Findings
- An Optimizely-oriented test-ideas post projects a 5–15% lift for "no credit card required"-type reassurance and calls it "modest but almost always positive". It explains the mechanism as hesitation at the CTA often coming from fear of being trapped. **[Weak/vendor: projection, not a measured result]** — [Atticus Li: Optimizely test ideas](https://atticusli.com/blog/posts/optimizely-10-high-impact-ab-tests-to-launch/)
- The same source warns that reassurance such as "cancel anytime" can backfire when the real process is complicated, so keep microcopy accurate. — [Atticus Li](https://atticusli.com/blog/posts/optimizely-10-high-impact-ab-tests-to-launch/)
- A testing-ideas library notes that removing friction can raise sign-ups while lowering lead quality, so measure downstream conversion too. — [Stellar: no-CC-required test idea](https://www.gostellar.app/blog/ab-test-idea-no-cc-required)
- I found no independent, peer-reviewed study of "no credit card required" microcopy. — (search finding: [freeCodeCamp microcopy article](https://freecodecamp.org/news/how-to-boost-conversions-with-ux-focused-microcopy) is practitioner guidance only)

### Inferences
- Proposed microcopy for this offer. Each line answers a specific objection a small-business owner is likely to have:
  - Under the primary CTA: "Gratis e senza impegno · Paghi il saldo solo se ti piace · Risposta entro 24 ore". Keep it to one line on desktop and at most two on mobile.
  - Under the form: "Niente spam, niente chiamate commerciali. Ti scrivo io, Lorenzo." A personal, named sender suits a one-person studio. This is an inference; it is not tested.
  - Next to WhatsApp: "Rispondo di solito entro 1 ora (lun–ven 9–19)". Only use this if it is true.
  - On pricing: "Nessun anticipo per l'anteprima".
- Measure booked calls or approved previews, not just form submits, as the advice on downstream metrics suggests.

### Gaps
- I found no rigorous data quantifying the lift from "risposta in 24 ore" or similar response-time promises.

---

## 5. Secondary CTAs, primary vs secondary hierarchy, choice overload

### Takeaway
One dominant primary action per screen, with lower-weight secondary options (a text link or outline button for "Vedi esempi", WhatsApp and phone as compact alternatives), is better supported than either a single lonely button or several equally loud buttons. What hurts is visual competition between buttons of equal weight, not the existence of alternatives.

### Cited Findings
- I found no controlled A/B test of one vs several CTAs on a landing page. The claim that "one primary CTA consistently outperforms" is asserted without data in practitioner glossaries. **[Weak]** — [Atticus Li: Hick's law glossary](https://atticusli.com/behavioral-science-glossary/hicks-law/)
- Hick's law: decision time grows logarithmically with the number of options, so going from 2 to 4 options costs more than going from 20 to 22. — [Atticus Li: Hick's law](https://atticusli.com/behavioral-science-glossary/hicks-law/)
- Counterpoint: Hick's law was measured on equally weighted stimuli. A clear primary CTA plus a faint secondary link does not impose the full cost of choosing among N options, because visual hierarchy shrinks the effective choice set. **[Informal source]** — [AboveFoldLab (Telegram)](https://t.me/s/AboveFoldLab?before=31)
- YouGov recommends presenting options hierarchically to help consumers choose. — [YouGov](https://yougov.com/articles/33184-present-options-hierarchically-address-consumers-c)
- The jam study (Iyengar & Lepper) is often cited for choice overload, reported as 30% vs 3% purchase rates. It concerns in-store choice, not web CTAs, and the figures vary across retellings. — [Atticus Li: paradox of choice](https://atticusli.com/blog/posts/paradox-of-choice-digital-products/)
- Ghost buttons drew 20% fewer clicks than solid ones (CXL), which makes them a good fit for secondary actions. — [CXL](https://cxl.com/blog/ghost-buttons/)

### Inferences
- **Hierarchy for this site:**
  - **Primary:** a filled orange button, "Voglio l'anteprima gratuita", which opens the short form or jumps to it.
  - **Secondary:** a navy outline or text link to "Vedi i lavori" or "Come funziona".
  - **Direct-contact alternatives:** a WhatsApp button (green glyph, kept smaller or outlined so it does not compete with the orange) and a "Chiama" link.
- Limit each section to one filled button. Navigation should carry at most one button-styled CTA, and it should be the same primary action.

### Gaps
- No rigorous evidence was found specifically on offering WhatsApp, phone and form side by side vs a single channel.

---

## 6. Sticky mobile CTA bars, tap targets, thumb zone, click-to-call and WhatsApp in Italy

### Takeaway
A bottom-anchored sticky bar on mobile, with 1–2 actions (primary preview CTA plus WhatsApp), is supported by several (mostly e-commerce, agency-reported) tests and by grip research: most people tap with one hand and the thumb reaches the bottom of the screen most easily. WhatsApp is the dominant messaging app in Italy, so a click-to-WhatsApp option is a natural low-friction channel. Hard data on how much it lifts leads for local businesses is scarce and vendor-sourced.

### Cited Findings
- **Sticky CTA tests** **[Weak/vendor: agency self-reported, e-commerce]**:
  - Apparel brand: a sticky Add to Cart lifted conversion 16.27%. — [Blend Commerce](https://blendcommerce.com/blogs/ab-tests-shopify/adding-a-sticky-cta-to-the-product-detail-page)
  - Little Bible Stories, A/B/C test: a **bottom**-placed sticky CTA beat top placement, with +27% sticky clicks, +8% add-to-cart and +7% conversion. Mobile revenue per visitor fell and was flagged for follow-up. — [Blend Commerce](https://blendcommerce.com/blogs/ab-tests-shopify/better-placed-sticky-add-to-cart-product-page-conversion)
  - Aeromotive: a sticky "Pump Finder" tool gave +69.25% conversion (97.4% significance, 13 days). It is a tool, not a plain CTA. — [Blend Commerce](https://blendcommerce.com/blogs/ab-tests-shopify/improving-product-discovery-on-mobile)
  - PerTronix: +10% conversion but −20% add-to-cart, and the test was not significant. — [Blend Commerce](https://blendcommerce.com/blogs/ab-tests-shopify/10-increase-in-conversion-rate)
  - Three Ships (AB Tasty): a sticky bottom CTA reached significance in two weeks, but no baseline was given. — [AB Tasty](https://www.abtasty.com/?p=51741)
- **Grip research:** Steven Hoober made 1,333 observations, of which 780 people were touching the screen. Among those, 49% used a one-handed grip, 36% cradled the phone in one hand and tapped with the other, and 15% used two hands. A related "75% use the thumb" claim is unverified in Hoober's own summary. **[Strong for 2013; dated]** — [UXmatters: How do users really hold mobile devices?](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)
- **Tap target sizes:** 44pt (Apple), 48dp (Material), 24px WCAG AA minimum and 44px WCAG AAA (see §2). — [W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **WhatsApp in Italy:**
  - WhatsApp is the most used social or communication app among Italian internet users (Statista chart based on Censis data, March 2024; the exact percentage was not visible in the excerpt). — [Statista: top social apps by age, Italy](https://statista.com/statistics/1312657/top-social-apps-and-online-platforms-by-age)
  - Audicom data: WhatsApp is on 78.5% of Italians' devices, ahead of Messenger (~40%) and Telegram (36%) (2022 data). — [9colonne](https://www.9colonne.it/435011/whatsapp-messenger-and-telegram-the-most-used-chats-by-italians)
  - Penetration estimates conflict: Infobip says 75% for Italy, Esendex says 97%. **[Weak/vendor]** — [Infobip](https://infobip.com/blog/whatsapp-statistics); [Esendex](https://ops.esendex.de/?p=8887958)
  - Italy context (DataReportal Digital 2025): 53.3M internet users (89.9% penetration) and 42.2M social media user identities (71.2% of the population). — [DataReportal Digital 2025: Italy](https://datareportal.com/reports/digital-2025-italy)
- **Click-to-WhatsApp effects:** I found no rigorous website-button case study. The closest quantified case is Property Finder (UAE portal): over a two-week trial with 10 brokerages, a WhatsApp leads feature gave +44% mobile leads and +16% leads overall. **[Weak/vendor; different context]** — [Property Finder](https://www.propertyfinder.ae/hub/?p=703)
- Vendors such as DoubleTick claim WhatsApp buttons reduce drop-off compared with forms, but give no figures. **[Weak/vendor]** — [DoubleTick](https://learn.doubletick.io/whatsapp-link-and-qr-code-generator/3-use-cases-of-whatsapp-link-+-qr-code-with-outcomes)

### Inferences
- **Proposed sticky bar (mobile only, under about 768px):**
  - Bottom-anchored and about 64–72px tall including the safe-area inset (`env(safe-area-inset-bottom)`).
  - Two targets, each at least 48px tall: left a filled orange "Anteprima gratis" taking about 60–65% of the width, right "WhatsApp" with its glyph taking about 35–40%. A phone icon could be a third, icon-only target of at least 48×48. Keep it to two or three targets at most.
  - Show it only after the hero CTA scrolls out of view, and hide it while the final contact section or the form is on screen, so two identical CTAs are never visible at once and the bar does not cover form fields or the keyboard.
- **WhatsApp link:** use `https://wa.me/39XXXXXXXXXX?text=` with a pre-filled Italian message, e.g. "Ciao Lorenzo, vorrei l'anteprima gratuita per il sito di [attività]". This lowers the effort of the first message. It is an inference, not tested.
- **Click-to-call:** use `tel:+39…`. Many small Italian business owners prefer a call, so keep it visible on mobile. On desktop, show the number as text.
- **Tracking:** tag WhatsApp and tel clicks as conversions (GA4 events) so the channels can be compared. Lead quality and close rate matter more than click counts.

### Gaps
- No primary DataReportal figure for "% of Italian internet users 16–64 using WhatsApp monthly" could be retrieved; the page was blocked.
- No rigorous, independent data on click-to-WhatsApp vs form lead rates for small local or service businesses, in Italy or elsewhere.
- No sticky-bar tests specifically for lead generation or service sites; all found are e-commerce and agency-reported.

---

## 7. Form vs direct contact; multi-step forms; number of fields; progress indicators

### Takeaway
Keep the preview-request form minimal: about 3–4 fields, mostly short single-line inputs, with the phone number optional. A multi-step form ("foot in the door": start with an easy question, ask for contact details last) is worth trying for a qualifying form. The famous large lifts come from vendors selling multi-step form tools. Always offer WhatsApp or phone next to the form for people who would rather not fill it in.

### Cited Findings
- **Venture Harbour:** their enquiry form went from 0.96% to 8.1% conversion (**+743%**) after switching from a basic WordPress form to a multi-step form. A first test on the CEO's other site reported a 300%+ increase in the first week. Venture Harbour built and sold the tool (Leadformly), which is now discontinued. **[Weak/vendor: self-reported, single case]** — [Venture Harbour CRO case studies](https://ventureharbour.com/cro-case-studies/); [Venture Harbour](https://ventureharbour.com/?p=6548)
- **"Multi-step forms convert 86% better"**, often attributed to HubSpot: I could not confirm it in HubSpot primary sources. **[Unverified]** — [Leadgen Economy](https://www.leadgen-economy.com/blog/multi-step-forms-conversion-optimization/)
- **HubSpot / Dan Zarrella, 40,000+ customer landing pages:**
  - Conversion falls as fields are added, but less steeply than expected. Single-line text fields showed very little drop-off.
  - Multiple textareas and multiple dropdowns were associated with notably lower conversion.
  - Asking for age, phone or address (especially street level) was associated with lower conversion.
  - **[Moderate: large dataset but observational and old, around 2010–2012]** — [HubSpot: Which types of form fields lower landing page conversions](https://blog.hubspot.com/blog/tabid/6307/bid/6746/which-types-of-form-fields-lower-landing-page-conversions.aspx); [HubSpot: 3 form fields that kill conversion rates](https://blog.hubspot.com/blog/tabid/6307/bid/6748/3-form-fields-that-kill-landing-page-conversion-rates.aspx)
- **Secondary claims I could not confirm in primary sources** **[Unverified]** — [Whitehat SEO](https://whitehat-seo.co.uk/blog/how-to-create-a-landing-page):
  - three-field forms convert at about 25%;
  - forms of 5 or fewer fields convert 120% better than forms of 10 or more;
  - cutting from 11 to 4 fields gives +160%;
  - Zuko reports that a required phone field makes 37% abandon.
- Zuko's lead-gen guidance lists phone-number requirements and validation, and optional vs required qualification questions, as key drop-off points. Its benchmark data covers 100M+ form sessions, but no phone-specific figure was published in the sources I found. — [Zuko: lead generation](https://www.zuko.io/industries/lead-generation); [Reform summary of Zuko](https://www.reform.app/blog/how-to-reduce-form-abandonment-insights-from-zuko-analytics)
- SmartBug (2012) frames field count as a trade-off between lead volume and lead quality and recommends testing individual fields. — [SmartBug Media](https://smartbugmedia.com/blog/landing-page-best-practices-how-many-form-fields)

### Inferences
- **Proposed form A (single step, default):**
  - Fields: Nome; Attività e città (or the current website URL, "se ce l'hai"); Email or WhatsApp number (let the user choose the channel); an optional "Cosa vorresti migliorare?" as one short line, not a big textarea.
  - Submit button: "Invia e ricevi l'anteprima in 72 ore".
- **Proposed form B (two or three steps, worth an A/B test if traffic allows):**
  - Step 1: "Che tipo di attività hai?" with tappable chips (Ristorante, Parrucchiere, Studio professionale, Negozio, Altro). This is easy and engaging.
  - Step 2: "Hai già un sito?" (URL or "No").
  - Step 3: name and contact.
  - Show a simple "1 di 3" progress indicator. Progress indicators are standard practice; no rigorous lift data was found.
- Make the phone number optional, or let the user choose between WhatsApp and email, given the evidence about phone fields.
- **After submit:** a thank-you state that sets expectations ("Ti scrivo entro 24 ore su WhatsApp/email; l'anteprima arriva entro 72 ore") and offers WhatsApp to speed things up.
- **Low traffic:** a small studio site probably cannot reach statistical significance on form tests quickly. Use form analytics (field drop-off) and qualitative checks instead of formal A/B tests. This is an inference.

### Gaps
- No independent multi-step vs single-step study was found. The best-known figures come from vendors.
- I could not verify the Zuko 37% phone-field abandonment figure in Zuko's own material.
- No rigorous data on progress-indicator effects was retrieved.

---

## 8. Pricing-page CTAs (per-plan buttons, highlighted plan, decoy effect)

### Takeaway
Give each plan its own CTA that names the plan, visually highlight one recommended plan, and keep the same low-risk entry action ("Inizia con l'anteprima gratuita") across plans, since the free preview comes before any payment. The decoy effect is real in lab settings, but a deliberately unattractive "decoy" plan is manipulative. Use honest anchoring (a genuinely larger plan) instead.

### Cited Findings
- **Ariely's Economist subscription experiment (MIT students):**
  - Options were $59 web-only, $125 print-only (the decoy) and $125 print + web.
  - With the decoy: 16% chose web-only, 84% chose print + web, and 0% chose the decoy.
  - Without the decoy: 68% chose web-only and 32% chose print + web.
  - Predicted revenue was about 43% higher with the decoy ($8,012 → $11,444), though one source says about 30%.
  - These were hypothetical choices, not real purchases. **[Moderate: classic lab study, hypothetical]**
  - — [Think Insights: decoy effect](https://thinkinsights.net/strategy/decoy-effect); [UBC blog](https://blogs.ubc.ca/onurkurtic/2015/07/10/the-decoy-effect/); [Playbooks: decoy pricing](https://playbooks.com/tactics/decoy-pricing)
- Retellings report the size of this effect differently: "162%" (relative increase from 32% to 84%) vs "262%" (the ratio). — [Atlantis Press PDF](https://www.atlantis-press.com/article/125971739.pdf); [Think Insights](https://thinkinsights.net/strategy/decoy-effect)
- Presenting options hierarchically, with one clearly recommended, is advised to ease choice. — [YouGov](https://yougov.com/articles/33184-present-options-hierarchically-address-consumers-c)

### Inferences
- **For a 2–3 tier price list** (for example "Vetrina", "Completo", "Su misura"):
  - Each card gets one full-width button: "Inizia con Completo" or "Anteprima gratuita · Completo". Clicking it pre-fills the plan in the form via a URL parameter.
  - The recommended plan gets the filled orange button, a "Il più scelto" badge (only if true) and a slight elevation. The other plans get outline buttons in the same position, so the layout reads as one consistent pattern.
- **No dark patterns:** a higher "Su misura" tier is legitimate anchoring when it is a real offer. Do not invent a plan meant only to be rejected, and do not use fake "-50% oggi" strikethroughs.
- Repeat the risk-reversal microcopy under the plans: "Anteprima gratuita in 72 ore. Paghi il saldo solo se approvi."
- End the pricing section with a fallback for people who are undecided: "Non sai quale scegliere? Scrivimi su WhatsApp".

### Gaps
- No pricing-page CTA A/B tests specific to service businesses were found (most published pricing tests are SaaS).
- The decoy evidence comes from a hypothetical lab study; real-world replication data for small-service pricing was not found.

---

## Overall evidence quality summary (for the report writer)
- **Strongest evidence:** NN/g attention distribution (fold), the WCAG, Apple and Material tap-target standards, Hoober's grip study, and HubSpot's 40k-page field analysis (old, observational).
- **Moderate:** the ContentVerve tests (304% below the fold; 90% my/your), which are single tests, confounded, retrieved secondhand, and include a contradicting 24.95% drop; the CXL ghost-button test (−20%); and Ariely's decoy study (hypothetical choices).
- **Weak/vendor:** Venture Harbour +743% multi-step; "86% multi-step" (HubSpot attribution unverified); every sticky-bar case (e-commerce agencies); WhatsApp lead-lift claims; microcopy lift projections; WhatsApp penetration percentages for Italy (conflicting 75% vs 97% vs 78.5% device presence).
- **Not found:** rigorous tests of CTA repetition count, button shape or arrow icons, or "risposta in 24 ore" microcopy; Italian-language CTA tests; click-to-WhatsApp vs form tests for local service businesses.
