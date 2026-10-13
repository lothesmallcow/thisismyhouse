# Cross-device robustness beyond iPhone (Android, Samsung Internet, small/large phones, foldables, tablets, in-app browsers), 2024-2026

Context: Astro static marketing site (Italian small-business owners, 40-60 y/o, mid-range Android / older iPhones, WhatsApp/Facebook/Instagram in-app browsers). Uses CSS 3D phone mockups, three.js WebGL, GSAP, fixed header + fixed bottom CTA bar with safe-area insets, clamp() fluid type, container queries, :has(), self-hosted variable font, multi-step forms, wa.me and tel: links, iframe demo scaled with transforms.

Research note: several primary domains (developer.chrome.com, developer.samsung.com, adrianroselli.com, matuzo.at, frontendmasters.com) could not be fetched directly from this environment (DNS failure); their content below comes from search-result extracts of those pages. Claims are cited to the page URL the extract came from.

## Q0. Who actually visits: Italy mobile market share (StatCounter, 2026)

### Takeaway
In Italy, Android is about two-thirds of mobile traffic and Chrome is about 70% of mobile browsing. Safari is about 23-25% and Samsung Internet about 3.4%. So "works on my iPhone" covers only about a quarter to a third of Italian mobile visitors. Chrome for Android alone is about 62%.

### Cited Findings
- Mobile OS, Italy, September 2026: Android 63.47%, iOS 36.51%. August 2026: Android 65.03%, iOS 34.96%. June 2026: Android 66.11%, iOS 33.87%. — [StatCounter Mobile OS Italy](https://gs.statcounter.com/os-market-share/mobile/italy)
- Mobile + tablet + console OS, Italy, June 2026: Android about 65.6%, iOS about 34.3%. — [StatCounter Mobile/Tablet/Console OS Italy](https://gs.statcounter.com/os-market-share/mobile-tablet-console/italy)
- Mobile browsers, Italy, June 2026: Chrome 69.86%, Safari 23.29%, Samsung Internet 3.43%, Firefox 0.84%, Opera 0.81%, Brave 0.53%. — [StatCounter Mobile Browser Italy](https://gs.statcounter.com/browser-market-share/mobile/italy)
- Mobile + tablet browsers, Italy, July 2026: Chrome 67.94%, Safari 24.97%. Mobile + tablet + console, July 2026: Chrome 67.83%, Safari 24.98%, Samsung Internet 3.42%. — [StatCounter Mobile & Tablet Browser Italy](https://gs.statcounter.com/browser-market-share/mobile-tablet/italy); [StatCounter Mobile/Tablet/Console Browser Italy](https://gs.statcounter.com/browser-market-share/mobile-tablet-console/italy)
- Browser versions, Italy mobile, July 2026: Chrome for Android 62.07%, Safari iPhone 25%. — [StatCounter Browser Version Italy](https://gs.statcounter.com/browser-version-market-share/mobile/italy)
- StatCounter counts page views through its tracking code, so these figures are estimates. — [StatCounter Mobile Browser Italy](https://gs.statcounter.com/browser-market-share/mobile/italy)

### Inferences
- The test matrix should weight Android Chrome first, iOS Safari second and Samsung Internet third. Samsung Internet's share is small (about 3.4%), but its forced dark mode is a high-impact quirk (see Q2).
- StatCounter usually reports in-app browsers (Facebook, Instagram, WhatsApp) as "Chrome" (Android WebView) or "Safari" (WKWebView). Their real share is hidden inside these numbers and is likely significant for this audience, which arrives from social and WhatsApp links. This is an inference; I found no Italian in-app-browser share data.

### Gaps
- No reliable Italy-specific data on device models (for example, the share of Samsung A-series or Xiaomi Redmi), on iOS version distribution, or on in-app browser share.
- No Italy tablet-only share figure was extracted.

## Q1. Android Chrome viewport: dynamic toolbar, viewport units, keyboard, edge-to-edge and safe areas

### Takeaway
Use `svh`/`dvh` instead of `vh` for full-height sections. Chrome 108+ resizes only the visual viewport when the keyboard opens, unless `interactive-widget` says otherwise. From Chrome 135, Android Chrome is edge-to-edge: a fixed bottom CTA needs `viewport-fit=cover` plus `env(safe-area-inset-bottom)`, exactly as on iPhone. Without those, the bottom browser "chin" slides away and the bar sits under the gesture bar.

### Cited Findings
- Mobile browser toolbars expand and retract, so `100vh` (which equals the large viewport, `lvh`) can overflow the visible area. `svh`, `lvh` and `dvh` shipped in Chrome 108, joining Safari and Firefox. — [web.dev: large, small, dynamic viewport units](https://web.dev/blog/viewport-units)
- The CSS spec defines `vh` as equivalent to `lvh` (large viewport height). Developers recommend `100svh` for stable full-height layouts. — [OpenReplay: fix 100vh mobile viewport](https://blog.openreplay.com/fix-100vh-mobile-viewport/)
- Opening the virtual keyboard does not change `svh`/`lvh`. Since Chrome 108, Android Chrome's default is `interactive-widget=resizes-visual` (matching iOS Safari): only the visual viewport shrinks. `resizes-content` restores the old behaviour, where the layout viewport shrinks too. The third value is `overlays-content`. — [Chrome blog: viewport resize behavior](https://developer.chrome.com/blog/viewport-resize-behavior); [HTMHell 2024: interactive-widget](https://htmhell.dev/adventcalendar/2024/4/)
- `interactive-widget` is supported in Chrome 108+ and Firefox 132+, but not in Safari (as of that article). — [HTMHell 2024](https://htmhell.dev/adventcalendar/2024/4/)
- Chrome 135+ on Android: the bottom browser chin slides away as the user scrolls, by default. With `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` the page extends to the bottom edge on load. Bottom-anchored fixed elements should use `bottom: env(safe-area-inset-bottom, 0px)`. That value updates as the chin moves, so the element stays above the gesture navigation bar. — [Chrome: edge-to-edge migration guide](https://developer.chrome.com/docs/css-ui/edge-to-edge)
- One blog claims that `dvh` triggers layout recalculation while the toolbar animates, which can cause visible reflow. This is unverified against Chrome docs. — reported in search extract of [OpenReplay dynamic viewport units](https://blog.openreplay.com/understanding-dynamic-viewport-units-css/)
- GSAP forum: ScrollTrigger pinned elements sized with 100vh misplace and overflow on iOS Safari. — [GreenSock forum](https://greensock.com/forums/topic/26917-scrolltrigger-ios-safari-using-100vh-pinned-element-cause-overflow-and-misplacement/)

### Inferences
- For this site:
  - Hero and scene sections should use `min-height: 100svh`, not `100dvh`. `100svh` avoids jank while the toolbar animates.
  - The fixed bottom CTA must already use `padding-bottom: env(safe-area-inset-bottom)`, and the viewport meta must include `viewport-fit=cover`. Verify this on Android Chrome 135+ with gesture navigation.
  - For multi-step forms, test that the fixed bottom CTA does not cover focused inputs when the keyboard opens. With the default `resizes-visual`, `position: fixed; bottom: 0` stays anchored to the layout viewport, so it can sit behind the keyboard or be hidden. Consider hiding the CTA bar while an input has focus, for example with `body:has(input:focus, textarea:focus) .cta-bar { display: none }`.
- GSAP ScrollTrigger: call `ScrollTrigger.config({ ignoreMobileResize: true })` to avoid recalculating on every toolbar show and hide. This is standard GSAP practice and was not verified in this session.

### Gaps
- No official data on how in-app webviews (Instagram, Facebook) expose `safe-area-inset-bottom` or handle `viewport-fit=cover` on Android.

## Q2. Forced/auto dark mode: Chrome "Auto Dark Theme" and Samsung Internet

### Takeaway
Chrome Android Auto Dark Theme can be opted out with `color-scheme` (meta tag or `:root`). Samsung Internet is the real risk. Since about v24 its forced dark mode is the default "website rendering" setting, and Samsung's own staff contradict each other on whether `color-scheme` is respected. Developers report it is not. The robust strategy is to declare `color-scheme` and to design a palette that survives inversion. Ideally, also ship a real `prefers-color-scheme: dark` theme.

### Cited Findings
- Chrome's Auto Dark Theme applies an automatically generated dark theme to light-themed sites on Android when the user has dark mode on in the OS. Developers can opt out the whole page by setting `color-scheme` on `:root` or with the meta tag. Since Chrome 98, they can opt out per element. — [Chrome blog: Auto Dark Theme](https://developer.chrome.com/blog/auto-dark-theme); [New in Chrome 98](https://developer.chrome.com/blog/new-in-chrome-98/)
- Detection trick: create an element with `background-color: canvas; color-scheme: light`. If its computed background is not `rgb(255,255,255)`, Auto Dark Theme is active. — [Chrome blog: Auto Dark Theme](https://developer.chrome.com/blog/auto-dark-theme)
- The Chrome Auto Dark Theme docs date from the 2021-2022 origin trial era. I found no newer official doc on current defaults. — (search extract of the same page)
- Samsung's 2020 blog says its browser transformations apply only when the site does not supply alternate styles. Its "third option" works as expected only when the developer declares supported schemes with the `color-scheme` meta tag or CSS property. — [Samsung Internet blog: Dark Mode in Samsung Internet (2020)](https://developer.samsung.com/internet/blog/en/2020/12/15/dark-mode-in-samsung-internet)
- A Samsung representative said that in v24.0.7 force dark mode is the default "Website rendering" setting. In v25.0 the flag was renamed "Enable Adaptive Force Dark" and still respects the `color-scheme` meta tag. — [Samsung developer forum thread 22937](https://forum.developer.samsung.com/t/websites-dark-mode-gets-overridden-by-samsung-internets-default-dark-mode/22937)
- Conflicting reports:
  - Developers in the same thread (through 2025) say the `color-scheme` meta tag "does not fix anything".
  - Another Samsung Developer Relations reply said "there is currently no way for developers to provide any custom logic from their end that can bypass Samsung Internet's dark mode". Its suggested workaround is user-side only: Settings → Labs → "Use website dark theme". The flag `internet://flags/#enable-adaptive-force-dark` is also mentioned.
  - Source: [Samsung forum thread, page 2](https://forum.developer.samsung.com/t/websites-dark-mode-gets-overridden-by-samsung-internets-dark-mode/22937?page=2); [page 3](https://forum.developer.samsung.com/t/websites-dark-mode-gets-overridden-by-samsung-internets-dark-mode/22937?page=3)
- A Webflow forum report says that as of Samsung Internet 13.0.1.64, this filter could not be detected with JavaScript or CSS. — [Webflow forum](https://discourse.webflow.com/t/dark-mode-in-samsung-browser-changes-website-color-scheme/155069)

### Inferences
- Fixes for this site:
  1. Add `<meta name="color-scheme" content="light">` and `:root { color-scheme: light; }` if the site is light-only. If a real dark theme is added, use `light dark` plus `@media (prefers-color-scheme: dark)` styles.
  2. Use the Chrome 98 per-element opt-out (`color-scheme: only light` on the element) for brand-critical visuals such as the phone mockups, the logo and the orange CTA.
  3. Accept that Samsung may still recolour. Avoid meaning carried only by colour, avoid text baked into images, and add a subtle stroke or shadow to logos and PNGs with transparent backgrounds so they survive inversion.
  4. Test on a Samsung Internet build with the phone in dark mode, through a cloud real-device service or Samsung Remote Test Lab if available.
- The navy/white/orange "Insegna" identity is light-on-dark in places. Forced dark algorithms usually leave dark backgrounds alone and invert light ones, so mixed sections could end up flattened or low-contrast. This must be checked visually.

### Gaps
- No current (2025-2026) official Samsung documentation that settles whether `color-scheme` is respected by default. The evidence conflicts.
- No 2024-2026 confirmation of whether Chrome Android stable enables Auto Dark Theme by default (it was historically behind a flag or setting).

## Q3. System font scaling, Dynamic Type, display-size zoom and DPR

### Takeaway
As of 2026, Android Chrome does not apply the OS font-size setting to ordinary web pages. A new opt-in `<meta name="text-scale">` tag (CSS Fonts 5) was in Chrome Canary behind a flag in early 2026. iOS Safari also does not apply Dynamic Type to normal web text unless you use `font: -apple-system-body`. Android "display size" (screen zoom) does change the CSS viewport width, so a 360-wide phone with display size raised can report about 320 px or less. Firefox Android does full-page zoom. Users who need larger text also use Chrome's Page Zoom (an accessibility setting updated in May 2025), which reflows at effectively narrower widths.

### Cited Findings
- Testing shows that raising Android text scale in "Display size and text" does not make website text bigger in Chrome. Firefox for Android applies a full page zoom instead, which is different from text scaling. — [Josh Tumath: Try text scaling support in Chrome Canary (Jan 2026)](https://joshtumath.uk/posts/2026-01-27-try-text-scaling-support-in-chrome-canary)
- The text-scale proposal (Josh Tumath, with Chrome's David Grogan and Philip Rogers) is in the CSS Fonts 5 spec. It is supported behind a flag in Chrome Canary and applies only to text in relative units. Authors opt in by not setting a base font-size in px and by avoiding fixed units. — [Matuzo: A new meta tag for respecting text scaling on mobile (2026)](https://matuzo.at/blog/2026/text-scaling-meta-tag); [Adrian Roselli: Honoring Mobile OS Text Size (Feb 2026)](https://adrianroselli.com/2026/02/honoring-mobile-os-text-size.html)
- A related CSS proposal, `env(preferred-text-scale)`, has a CSSWG explainer. — [CSSWG explainer](https://drafts.csswg.org/css-env-1/explainers/env-preferred-text-scale.md)
- On 15 May 2025 Google announced an accessibility update to Page Zoom in Chrome for Android, to enlarge text "without affecting the webpage layout". — reported in [Winaero](https://winaero.com/google-is-finally-improving-text-scaling-in-chrome-for-android)
- I could not confirm that `text-scale` had shipped in stable Chrome by October 2026. — (search extract; see Gaps)

### Inferences
- The site's body text of 17-18px with clamp() is already generous for 40-60 year olds. Keep `html { font-size: 100% }` (not px) and use rem in the clamp() calls. That way, when `text-scale` ships, the site can opt in by adding `<meta name="text-scale" content="scale">`. Also ensure layouts survive at 200% text: no fixed-height cards, no `white-space: nowrap` on CTAs, and buttons that can wrap to two lines.
- The H1 `clamp(2.375rem, 1.6rem + 3.6vw, 4.5rem)` at 320px wide gives 25.6 + 11.5 = about 37px, so the 2.375rem (38px) floor applies. Long Italian words ("professionisti", "prenotazioni") at 38px on a 288px content box (320 minus 16px gutters on each side) can overflow. Add `overflow-wrap: anywhere` or `hyphens: auto` with `lang="it"` on headings, and consider a lower min (for example 2rem) for widths at or below 360px.
- Android "Display size" raised by one or two steps on a 412 dp device can yield about 360 or about 320 CSS px. This is why 320px testing matters even though few new phones ship at 320. This is a well-known Android behaviour; I found no 2024-2026 source quantifying it.
- High DPR (3x and above) mainly affects image weight: serve `srcset`/`sizes`. Low DPR (1.5-2x on budget phones) exposes hairline 0.5px borders that disappear and blurry transforms on 3D CSS mockups.

### Gaps
- Primary pages (Roselli, Matuzo) could not be fetched. Exact meta syntax (`<meta name="text-scale" content="scale">`) is from prior knowledge of the proposal and should be verified.
- No data on how many Italian 40-60 year-old users raise system font or display size.

## Q4. Small widths (320-360), tall 20:9 phones, foldables, tablets/iPad, landscape

### Takeaway
Design must hold from 280-320px (Galaxy Fold cover, Android display-size zoom) up to tablets around 1024-1366. Foldables have two very different viewports that change at runtime: the Fold 7 inner screen is about 984×1092 CSS px, almost square. iPadOS Safari requests the desktop site by default, so it sends a Mac user agent, renders at desktop widths (1024-1366) and answers to `(hover: hover)`/`(pointer: fine)` when a trackpad or mouse is attached. Container queries and intrinsic layout are the right tools; UA sniffing is not.

### Cited Findings
- Galaxy Fold 1 cover screen: developers disagree whether it is 280px or 320px wide. One measured 320px with a viewport tool. — [Samsung developer forum: Fold 1 cover width](https://forum.developer.samsung.com/t/galaxy-fold-1-cover-screens-width-280px-vs-320px/34196)
- Galaxy Z Fold 7, unfolded: viewport 984×1092 CSS px at DPR 2.0. — [YesViz: Galaxy Z Fold 7](https://yesviz.com/devices/samsung-z-fold7/)
- Galaxy Z Fold 8 cover is described as a 6.4-inch 21:9 display. The source advises measuring on hardware rather than assuming a cover viewport. — [WhatIsMyScreenSize: iPhone vs Z Fold8](https://www.whatismyscreensize.com/blog/iphone-duo-vs-galaxy-z-fold8-screen-size)
- Foldables have two viewports. Use relative units and container queries rather than pixel-exact device widths. — [Dr. Web: Galaxy Z Fold 8 wird breiter](https://www.drweb.de/galaxy-z-fold-8-wird-breiter-was-faltbare-smartphones-fuers/)
- iPadOS Safari: Settings → Safari → "Request Desktop Website" → All websites is ON by default, so the UA is a desktop Mac UA. The iPad UA was removed for iPadOS 13+ to give a desktop-class experience. — [Apple Developer Forums thread 119186](https://developer.apple.com/forums/thread/119186)
- `navigator.maxTouchPoints` returns 5 on iPad and 0 on Mac Safari, a common heuristic to tell an iPad from a Mac. — [Apple Developer Forums](https://developer.apple.com/forums/thread/119186); [Omniconvert: tablet detection](https://help.omniconvert.com/kba/tablet-detection-why-our-numbers-differ-from-google-analytics/)
- Analytics and personalisation tools broke iPad segmentation because of this (Adobe Target iPad audience exclusion). — [Adobe Experience League](https://experienceleaguecommunities.adobe.com/t5/adobe-target-questions/ipad-audience-exclusion-no-longer-working/m-p/727028/highlight/true)

### Inferences
- iPad gets the desktop layout (1024+ wide). Any "desktop = mouse" assumptions will break on iPad without a keyboard:
  - Hover-revealed content, a custom cursor and hover-only tooltips must not hide essential information.
  - Gate hover effects with `@media (hover: hover) and (pointer: fine)`. Note that an iPad with a Magic Keyboard or trackpad also matches this, so hover must stay optional.
  - Fixed header and bottom CTA logic tied to `max-width: 768px` will not show on iPad. Decide deliberately whether iPad should get the mobile CTA bar; `(pointer: coarse)` is a better trigger than width.
- Foldables: the inner screen is roughly square (984×1092). Layouts with `100svh` heroes and side-by-side 3D phone mockups may look short and wide. Test the unfold transition (resize event mid-session): three.js must handle `resize` and `devicePixelRatio` changes, and GSAP ScrollTrigger must `refresh()`.
- 20:9 phones (for example 360×800 or 412×915) give very tall viewports. A `100svh` hero then has a lot of vertical space, so check that the hero is not visually empty and the CTA sits above the fold.
- Landscape on phones gives about 360-430px of height. A fixed header plus a fixed bottom CTA can eat about 40% of the screen. Hide or shrink both with `@media (orientation: landscape) and (max-height: 500px)`.
- The iframe live demo is scaled with transforms. At 320px the scale factor gets very small, so text inside becomes unreadable and tap targets tiny. Provide a "apri a schermo intero" (open full screen) link, and check that the iframe does not create horizontal scroll.

### Gaps
- No verified CSS width for current Galaxy Z Fold 6/7/8 cover screens or the Pixel Fold. Measure on a device cloud.
- No 2024-2026 Apple documentation found for the iPadOS desktop-UA default (sources are developer forums).

## Q5. In-app browsers (Instagram, Facebook, WhatsApp, Gmail)

### Takeaway
Links opened from Instagram or Facebook (and increasingly WhatsApp business links) render in sandboxed webviews: WKWebView on iOS and Android WebView or a custom tab on Android. These share no cookies or logins with the main browser, inject scripts, have extra toolbars that change the viewport mid-scroll, and handle `window.open`, downloads and universal links differently. Fixed bottom elements and `vh`-sized sections are the most commonly reported visual breakages. Detect them by user-agent tokens (`FBAN`/`FBAV`, `Instagram`) as a progressive hint, never as a gate. Make sure core actions (wa.me, tel:, forms) work inside the webview.

### Cited Findings
- In-app browsers are stripped down: no bookmarks, settings, extensions or downloads, and limited UI controls. — [Frontend Masters: The Pitfalls of In-App Browsers](https://frontendmasters.com/blog/the-pitfalls-of-in-app-browsers/)
- Instagram's in-app browser is WKWebView on iOS and a custom Chrome-based implementation on Android. Pop-up handling and universal-link hand-off differ from Safari, and `window.open()` can fail. JavaScript, storage and cookie behaviour is restricted, and navigation can be intercepted. This comes from a vendor compatibility table. — [Paybis docs: platform compatibility](https://docs.payb.is/docs/platform-compatibility-limitations)
- These webviews do not share cookies, autofill, saved logins or session state with the user's real browser (vendor claim). — [link.boo: Instagram in-app browser](https://link.boo/guides/instagram-in-app-browser); [u2l.ai: Instagram in-app browser](https://u2l.ai/blog/instagram-in-app-browser.md)
- Researcher Felix Krause showed that Instagram and Facebook inject JavaScript into pages in their in-app browsers, which monitored taps and selections; Meta called it an "event aggregator". — summarized in [Frontend Masters](https://frontendmasters.com/blog/the-pitfalls-of-in-app-browsers/)
- A Webflow developer found that Instagram's in-app browser shows and hides its bottom nav bar on scroll, which resizes `vh` elements and makes the scroll jump. Twitter's webview did not do this. — [Webflow forum: webview updating vh elements](https://forum.webflow.com/t/webview-updating-vh-elements-and-causing-scroll-jumping/108061)
- WebKit bug (iOS 18): after client-side navigation, `position: fixed; bottom: 0` elements can be hidden by the navigation bar because `window.innerHeight` does not reflect the bar state. It corrects on scroll. — [WebKit Bugzilla 281063](https://bugs.webkit.org/show_bug.cgi?id=281063)
- Suggested fixes for in-app `svh` issues include `100svh` and a CSS variable set from `window.innerHeight`/`visualViewport`. — [Medium: solving svh viewport issues in in-app browsers](https://medium.com/@python-javascript-php-html-css/solving-svh-viewport-issues-in-mobile-in-app-browsers-8808cb4faa3f)
- WhatsApp:
  - In May 2025 WABetaInfo reported beta testers opening certain business website links (HTTPS required) inside WhatsApp's own browser, with a three-dot menu to switch to the default browser. — [Futurezone (DE)](https://futurezone.at/apps/whatsapp-bringt-neue-browser-funktion/400438507); [Jang](https://jang.com.pk/en/37510-whatsapp-releases-in-app-browser-for-business-website-links-news)
  - A vendor reports that by late 2025, links in business template-message CTA buttons open in WhatsApp's in-app browser, while links pasted in normal chats do not. This is unofficial. — [u2l.ai: WhatsApp link opens in browser](https://u2l.ai/blog/whatsapp-link-opens-in-browser)
- Vendors note that Apple and Meta change webview behaviour with app updates, so workarounds can break. Common mitigation: detect the in-app UA and offer "open in external browser". — [u2l.ai: open in external browser](https://u2l.ai/features/open-in-external-browser)
- No official Meta or Apple documentation on in-app browser limitations was found. — (search observation)

### Inferences
- Concrete fixes for this site:
  1. Size scene and hero sections with `svh`, not `vh`/`dvh`, so the Instagram toolbar toggle does not cause scroll jumps.
  2. Fixed bottom CTA: use `env(safe-area-inset-bottom)` plus a small extra offset, and test in the Instagram and Facebook apps on both OSes.
  3. Use plain `<a href="https://wa.me/39...">` and `<a href="tel:+39...">`. Do not use `window.open` or JS redirects. In webviews, plain anchors are the most likely to be handed off to the WhatsApp app or the dialer.
  4. Multi-step form: keep state in the DOM or in memory, not in cookies or third-party storage. Submit to a same-origin endpoint. Avoid OAuth or popup flows.
  5. Detect in-app browsers with `/FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp/i` (heuristic tokens; WhatsApp's UA token is unverified). Use the result only to reduce heavy effects and to show an optional "Apri nel browser" hint, never to block content.
  6. Webviews can be stale or limited, so treat WebGL as optional: render a static poster image first and upgrade to three.js only after feature detection.
- Gmail on iOS opens links in an in-app SFSafariViewController-like view or in Chrome, depending on settings. Behaviour is closer to real Safari/Chrome than the Meta webviews. This is from prior knowledge, not verified this session.

### Gaps
- No primary source confirming how wa.me and tel: links behave inside Instagram, Facebook or WhatsApp webviews on Android vs iOS in 2025-2026. This must be tested manually.
- No source on WebGL availability or performance inside Meta webviews, or on audio autoplay there.
- WhatsApp in-app browser details are beta or vendor reports, not official.

## Q6. Performance on mid/low-end Android (Moto G class): WebGL, 3D CSS, JS budget, degrade signals

### Takeaway
Budget Android is the median Italian visitor's device, so the three.js model and GSAP effects must be progressive enhancements. Use a static image first. Load WebGL only if the device passes feature checks and a GPU or capability tier: `navigator.deviceMemory` and `hardwareConcurrency` (Chromium only for memory), `prefers-reduced-motion`, `Save-Data`/`navigator.connection` (Chromium), or detect-gpu tiers. Add a runtime FPS watchdog that falls back.

### Cited Findings
- web.dev "Adaptive loading": use device signals to reduce memory use on low-end devices, throttle animation frame rate, and block third-party scripts on slower devices. — [web.dev: Adaptive loading](https://web.dev/articles/adaptive-loading-cds-2019)
- `navigator.deviceMemory` is supported in Chrome 63 and Edge 79, but not in Firefox or Safari. `navigator.hardwareConcurrency` is supported in Chrome 37+, Firefox 48+ and Safari 15.4+. — [web.dev: Adaptive loading](https://web.dev/articles/adaptive-loading-cds-2019)
- Pattern: `if (navigator.deviceMemory > 1) await import('./costly-module.js')`. If `deviceMemory` is undefined, consider loading anyway. The server can receive the `Device-Memory` client hint via `<meta http-equiv="Accept-CH" content="Device-Memory">`. — [umaar.com: considerate JavaScript](https://umaar.com/dev-tips/242-considerate-javascript/)
- detect-gpu (pmndrs) tiers:
  - Tier 0 means no WebGL, a blocklisted GPU, or under 15 fps. Tiers 1, 2 and 3 mean at least 15, 30 and 60 fps. Always provide a non-WebGL fallback for tier 0.
  - `mobileTiers` defaults to `[0, 15, 30, 60]`.
  - Result type `FALLBACK` means a conservative default. `BENCHMARK_FETCH_FAILED` happens when the CDN, CSP or offline state blocks the fetch; benchmark data can be self-hosted.
  - Source: [detect-gpu on npm](https://npmjs.com/package/detect-gpu)
- A community pattern combines static detection with a runtime FPS monitor that demotes tiers and falls back to a static image or CSS (third-party, unverified). — [skills.sh: three mobile fallback strategy](https://www.skills.sh/avnehsbhatia/ultraui/three-mobile-fallback-strategy)

### Inferences
- Recommended degrade ladder for this site:
  1. **Default (all):** a static AVIF/WebP poster of the 3D phone or model with `width`/`height` set, `fetchpriority="high"` only for the LCP image, and no WebGL in the critical path.
  2. **Upgrade to three.js** only if all of these hold:
     - `!matchMedia('(prefers-reduced-motion: reduce)').matches`
     - `!navigator.connection?.saveData`
     - `(navigator.deviceMemory ?? 4) >= 4`
     - `navigator.hardwareConcurrency >= 4`
     - WebGL context creation succeeds
     - detect-gpu tier >= 2 (self-hosted benchmarks)
     - the element is near the viewport (IntersectionObserver)
     - preferably after first interaction or idle time
  3. **At runtime:**
     - Cap `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))` on mobile, which is the biggest GPU win on 3x screens.
     - Pause rendering when off-screen or when `document.hidden`.
     - If average frame time exceeds about 33 ms for about 2 s, dispose the renderer and swap in the poster.
  4. **CSS 3D mockups:**
     - Limit the number of simultaneously transformed layers.
     - Avoid large `backdrop-filter`/`filter: blur()` over transformed layers on Android. These are expensive on Mali/Adreno budget GPUs; this is general knowledge, not cited.
     - Use `will-change` only during animation.
  5. **GSAP:**
     - Respect reduced motion with `gsap.matchMedia()`.
     - Avoid scroll-scrubbed animation of layout properties.
     - Use `ScrollTrigger.config({ ignoreMobileResize: true })`.
  6. **Fonts:** subset the variable font to Latin plus Italian accents, `font-display: swap`, and preload one file.
- Safari and Firefox lack `deviceMemory`, so treat undefined as "unknown, probably fine" for iPhones but rely on detect-gpu or the FPS watchdog there.

### Gaps
- No 2024-2026 source quantifying JS budgets for Moto G-class devices (the commonly cited "Moto G Power" Lighthouse throttling profile was not verified this session).
- No benchmark data on three.js or CSS 3D on specific budget Android GPUs.

## Q7. Testing methodology and realistic matrix without owning devices

### Takeaway
Playwright and Chrome DevTools emulation catch layout and breakpoint bugs only. They run desktop engines with a spoofed viewport, UA and DPR. They miss real toolbar and `svh` behaviour, safe areas, keyboard overlap, momentum scroll, ITP/cookies, forced dark mode, OS text scaling, GPU performance and in-app webviews. Combine automated emulation for breadth with short real-device sessions: free or cheap cloud tiers, plus friends' and family's phones with remote debugging.

### Cited Findings
- Playwright device profiles set viewport, UA, DPR and touch flags but run desktop engines. An "iPhone 15" project is desktop WebKit with iPhone settings. — [Hyperping: Playwright mobile emulation](https://hyperping.com/learn/playwright/playwright-mobile-emulation); [TestDino: Playwright mobile testing 2026](https://www.testdino.com/blog/playwright-mobile-testing)
- Emulation misses:
  - engine and OS-specific quirks, the virtual keyboard, notch and safe-area handling, and performance
  - Mobile Safari's 100vh behaviour
  - real momentum scrolling and touch latency
  - Safari ITP cookie and storage handling
  - camera, push, geolocation and biometrics
  - Advice: never let an emulation-only pass gate a release; verify critical flows on real Safari and devices.
  - Source: [tessl: mobile emulation reference](https://tessl.io/registry/testland/playwright-testing/files/references/mobile-emulation.md); [TestDino](https://www.testdino.com/blog/playwright-mobile-testing) (vendor or community guides; secondhand)
- BrowserStack offers Playwright on real iOS devices with Safari (vendor announcement). — [BrowserStack blog](https://www.browserstack.com/blog/browserstack-launches-industry-first-playwright-testing-on-real-ios-devices-with-safari/)
- Free tiers:
  - LambdaTest (rebranded TestMu AI) has an indefinite free plan, reported as 60 real-time browser minutes per month, 100 lifetime automation minutes, 10 screenshot tests per month, and real-device sessions capped at about 1 minute and 5 uses.
  - BrowserStack's free availability is unclear: there is an open-source program (free for qualifying OSS projects) but no general free tier per some comparisons.
  - Source: [Costbench: LambdaTest free plan 2026](https://costbench.com/software/browser-testing/lambdatest/free-plan/); [Devicelab: LambdaTest vs BrowserStack (Dec 2025)](https://www.devicelab.dev/blog/lambdatest-vs-browserstack); [DEV: free cross-browser testing tools 2025](https://dev.to/sarahthomasdev/free-cross-browser-testing-tools-to-pick-in-2025-34a4)

### Inferences
- Methodology (no owned devices, except presumably the developer's iPhone and laptop):
  1. **Automated breadth (CI or local Playwright):** run Chromium with Android profiles and WebKit with iPhone and iPad profiles at widths 280, 320, 360, 375, 390, 412, 430, 600 (Fold-ish), 768, 820, 1024, 1180/1366 landscape, plus 360×640 and 740×360 landscape. Assert:
     - no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`)
     - CTA bar visible and not overlapping the last content
     - no text clipped (scrollHeight vs clientHeight on cards)
     - tap targets at least 44-48px
     - Also run with `colorScheme: 'dark'`, `reducedMotion: 'reduce'`, and `page.emulateMedia` for print/forced-colors.
     - Also run a 200% root font-size test (`html{font-size:200%}`) to simulate future `text-scale` or zoom.
  2. **Lighthouse mobile** (simulated Moto G-class throttling) in Chrome DevTools or PageSpeed Insights for LCP/INP/CLS budgets. PageSpeed Insights also shows CrUX field data once traffic exists.
  3. **Real-device spot checks via free cloud minutes:** LambdaTest free plan, BrowserStack trial, Samsung Remote Test Lab. Priority devices:
     - a Samsung Galaxy A-series on Samsung Internet in dark mode
     - a Xiaomi/Redmi or Motorola on Chrome
     - an iPhone SE/11-class on iOS 16-17
     - an iPad on Safari
     - a Galaxy Z Fold (cover plus inner)
  4. **Borrowed phones** (family or clients, who are the target demographic): Android via USB using Chrome `chrome://inspect` remote debugging; iPhone via Mac Safari Web Inspector (enable "Web Inspector" in iOS Settings → Safari → Advanced). These are standard documented workflows, not re-verified this session.
  5. **In-app browser manual protocol:** send the URL in a WhatsApp chat, in an Instagram DM or bio, and in a Facebook post or Messenger. Open it on Android and iOS. Check the fixed header and CTA, scroll jumps, wa.me and tel: hand-off, form submit, the three.js load and the iframe demo.
  6. **Field monitoring:** use the web-vitals library or Vercel/Cloudflare analytics segmented by device class to catch real-world INP/LCP on low-end Android.
- Realistic minimum matrix, weighted to Italy:

  | Engine / Browser | Device class | Widths | Special checks |
  |---|---|---|---|
  | Chrome Android (about 62%) | Budget (Moto G / Redmi / Galaxy A1x) | 360, 412 | edge-to-edge chin, keyboard, WebGL perf, display-size zoom (320) |
  | Safari iOS (about 25%) | iPhone SE / 11 / 13 / 15 | 375, 390, 430 | svh, safe areas, Dynamic Type not applied |
  | Samsung Internet (about 3.4%) | Galaxy A5x | 360-412 | forced dark mode, own toolbar |
  | Instagram / Facebook / WhatsApp webview | Android + iOS | same | vh jumps, fixed bars, wa.me/tel:, no cookies |
  | Safari iPadOS | iPad 10th gen / Air | 820, 1180 (desktop UA) | hover-only UI, CTA bar logic |
  | Chrome Android foldable | Galaxy Z Fold | cover (about 320-390?), inner 984 | resize on unfold, three.js resize |
  | Firefox Android (<1%) | any | 360 | full-page zoom with OS font scale |

### Gaps
- Official Playwright documentation on emulation limits was not fetched. The limits are from secondary guides.
- Current BrowserStack free and open-source terms, and Samsung Remote Test Lab 2026 availability, were not verified on official pages.
- No source confirming whether Lighthouse's mobile throttling profile still emulates a Moto G Power in 2026.
