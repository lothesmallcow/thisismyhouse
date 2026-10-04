# Compass audit

Run on 2026-10-04 against commit `271a1b1` + the commit that adds this file. Legend: ✅ done and
verified · ❌ not done / broken · ⚠️ partly done · N/A (with reason).
"Evidence" points to a test name (`file › describe › test`), a command and its output, or a file.

Paths are relative to `compass/`. Abbreviations: **U** = `tests/unit/`, **E** = `tests/e2e/`,
**A** = `docs/audit/`.

Final numbers: **245 unit/integration tests passed, 0 skipped** (`npx vitest run` → "Test Files 13
passed (13) · Tests 245 passed (245)"); **15 end-to-end tests passed, 0 skipped**
(`npm run build && npm run test:e2e` → "15 passed (50.9s)"); **lint 0 errors, 0 warnings**;
**typecheck 0 errors**; **CI green** on GitHub (runs #4 and #5; #6 was running when this was written).

---

## 1. Ground truth

**Milestones (real status)**

| Milestone | Status | What's done / what isn't |
|---|---|---|
| M0 plan + verification | ✅ | Web-verified research in ADRs 0002-0007 (Gmail access, job APIs, search APIs, hosting, D.Lgs. 96/2026, geodata). Live API calls were **not** made (no keys; see §4). |
| M1 skeleton + first data | ✅ | Repo, CI, gitleaks + personal-data scan, demo seed, DB, LinkedIn parser + generic fallback, Adzuna adapter, list page. |
| M2 her app + web discovery | ✅ | Wizard, Offerte with all filters, detail, ranking with reasons, Indeed + InfoJobs parsers, W1 (Tavily), W2 JSON-LD. |
| M3 applying | ✅ | CV library, templates, Lane 3 kit, Lane 2 prompt, Lane 1 approval with every guardrail, demo mode. |
| M4 automation | ✅ | Autopilot toggle, spontaneous applications (+ W1 suggestions), reply detection, digest, scheduled jobs. |
| M5 ship and show | ⚠️ | Everything prepared and documented (`docs/setup.md`, `vercel.json`, workflows). **Not deployed** (permission point: needs you). |
| M6 optional W3 | ⚠️ | Safety gate built and tested (`src/lib/sources/web/w3-gate.ts`, U `w3-gate.test.ts`); the platform fetcher is deliberately **not built** in this public repo (ADR 0009). Needs your decision. |

**`git log --oneline -30`** (Compass commits; the older ones are the calendar app that lives in the same repo):
```
271a1b1 Compass: audit evidence, docs and walkthrough fixes
aa7470a Compass: batched re-ranking (7.5 s -> 0.8 s for 5,000 jobs), demo-week simulation, load test
bba2764 Compass: UI audit (axe on 98 screens), security e2e, accessibility fixes
98f8bf7 Compass: fixes from the independent review and audit preparation
b50d149 CI: keep the gitleaks binary out of the scanned tree; scanner skips binary files
278d0c5 Compass: docs, ADRs, CI, secret and personal-data scanning, scheduled jobs
913bd33 Compass: e2e tests, PWA icons, lint fixes, help line on every screen
bb74dfc Compass: her app, onboarding, admin area, landing and subscription page
224d46b Compass: data model, sources, pipeline, applying engine
012ff30 Compass: scaffold project and rule-based core engine
```
✅ Every claimed feature is in one of these commits (each commit message lists what it adds). The
commits are fewer and larger than "small commits" in the brief: ⚠️ style, not substance.

✅ **Re-verified after later changes**: everything in `PROGRESS.md` was re-run after the last code
change: full unit suite, full e2e suite on a fresh production build, UI audit (98 screens),
error-state audit, demo-week simulation, fresh `npm ci`, fresh clone following the README.

**The 3 things I'm least confident about**
1. **Real alert e-mail templates.** All three platform parsers were built on synthetic e-mails
   that imitate the real structure. Real LinkedIn/Indeed/InfoJobs alerts will differ in details.
   Mitigation: generic fallback + "template broken" alert to you, but the first real samples will
   probably need parser tweaks.
2. **Adzuna's terms for ongoing personal use.** Their terms mention a 14-day evaluation and a
   possible licence afterwards. Needs your confirmation before relying on it.
3. **Deliverability of real sends.** Plain text, one recipient, ≤10/day from a fresh Gmail is
   conservative, but I have not sent a single real e-mail, so spam-folder behaviour is unknown.

**What would break first in a month of real use:** the parsers when a platform tweaks its alert
template (you'd get the alert and see 0 items in Fonti), then **GitHub's 60-day rule** that
disables scheduled workflows on public repos without commits (Panoramica shows the last runs, so a
silent stop is visible), then **CCNL salary tables** drifting out of date.

## 2. Build, run, tests

- ✅ **Fresh install**: `rm -rf node_modules .next && npm ci` → "added 493 packages, and audited 494
  packages in 10s", no manual step. (Deprecation warnings: `@esbuild-kit/*` via drizzle-kit, eslint 9.)
- ✅ **One command**: `npm run demo` → "Database ready. / Demo data seeded … / ✓ Ready in 370ms",
  `GET /entra -> 200`. A stranger's fresh clone from GitHub following the README exactly was
  running in **21 s** (clone + install + start), login and "Raccogli offerte" worked first try.
- ✅ **Tests**: 245 unit/integration passed, 0 skipped; 15 e2e passed, 0 skipped (summaries above).
- ✅ **Lint and typecheck**: `npx eslint .` → no output (0 problems); `npx tsc --noEmit` → no output.
  No rule silenced: 0 `eslint-disable` in the code.
- ✅ **Skips/TODOs grep**: `grep -rnE "\.skip\(|\.only\(|\bxit\(|xdescribe|@ts-ignore|@ts-expect-error|eslint-disable|TODO|FIXME|HACK" src tests scripts` → **0 hits**.
- ✅ **CI** (`.github/workflows/compass-ci.yml`, repo root, runs on every push touching `compass/`):
  gitleaks, personal-data scan, lint, typecheck, unit tests, build, e2e. Last completed runs #4 and
  #5: **success**. (Runs #1-#3 failed: #1 my scanner scanned the gitleaks binary, #2/#3 an e2e click
  intercepted by an overflowing file input at CI's font metrics; both fixed.)
- ✅ **`.env.example` covers every variable the app reads**: grep of `process.env.*` in `src` and
  `scripts/*.ts` vs `.env.example` → all documented except `NODE_ENV` and `NEXT_RUNTIME` (set by
  Node/Next). Dev-only tooling reads `PLAYWRIGHT_CHROMIUM_PATH`/`CHROME` (scripts, not the app).
- ✅ **Missing variable**: in real mode the server **refuses to start** with a message naming the
  variable (`src/instrumentation.ts` → `src/lib/env-check.ts`; also checked by `scripts/run-job.ts`).
  U `env-check.test.ts › real mode with a missing or weak variable refuses to start, naming it`.
  Demo mode only warns. (Found during this audit: previously a missing `SESSION_SECRET` silently
  fell back to a dev secret. Fixed.)
- ⚠️ `npm audit`: **0 vulnerabilities in production dependencies** (`npm audit --omit=dev`); 9 in dev
  tooling (drizzle-kit's bundled esbuild dev-server issue; eslint-config-next → fast-glob → braces).
  npm's only "fix" is a downgrade. Not shipped to users; revisit when those packages update.

## 3. Mailbox ingestion

- ✅ **Access method**: IMAP + SMTP with a Gmail app password. ADR `docs/adr/0002-mailbox-access.md`
  (compares Gmail API in Testing mode: 7-day refresh tokens; Apps Script: 100 recipients/day,
  90 min/day triggers). Known weaknesses: depends on Google keeping app passwords; needs 2-Step
  Verification; a revoked password stops ingestion (alert in §13).
- ✅ **One parser per platform**: `src/lib/sources/alerts/{linkedin,indeed,infojobs}.ts`. Tests:
  U `alerts.test.ts › LinkedIn alerts › parses the HTML version…`, `› parses the text-only version`,
  `› Indeed alerts › parses cards including salary and snippet`, `› InfoJobs alerts › parses title,
  company, city, contract and RAL`.
- ⚠️ **Real samples**: all three are **synthetic only** and marked "needs real sample" in
  `fixtures/emails/README.md`. Needs you (anonymized real alerts).
- ✅ **Generic fallback**: U `alerts.test.ts › generic fallback › extracts job links and anchor text,
  skipping privacy/unsubscribe`.
- ✅ **Same e-mail twice → no duplicates**: processed Message-IDs table. U `pipeline.test.ts › ingest
  … › reads the demo mailbox…` ("Running again parses nothing twice": `alerts` 0, `newJobs` 0) and
  U `audit-sources.test.ts › isolation and idempotency › running ingestion twice creates no duplicates`.
- ✅ **Template changes → health flags it**: U `alerts.test.ts › a known template that yields nothing
  is reported as broken and falls back`; health row + admin notification in `src/lib/pipeline/health.ts`
  (`templateBroken`). The admin also gets an e-mail (`ADMIN_ALERT_EMAIL`).
- ✅ **Raw e-mails minimized**: real mailbox e-mails are parsed in memory and never stored; only the
  Message-ID is kept (`processed_messages`), plus a 400-character snippet for replies she must see.
  (`demo_inbox` stores raw e-mails only in demo mode.) ADR 0011.
- ✅ **Fixtures free of real data**: `node scripts/scan-personal-data.mjs` → "Personal-data scan: 230
  files clean." (checks tax codes, IBANs, phone numbers, e-mails on real domains, API keys; all
  fixtures use `.example` domains and invented names).
- ✅ **Raw e-mail HTML is never rendered**: `grep -rn "dangerouslySetInnerHTML\|innerHTML" src` → 0.
  Everything goes through React text nodes. XSS test with `<script>` and `onerror`:
  E `security.spec.ts › XSS: hostile text from an ad is shown as text, never run` (0 dialogs, the
  `<script>` string is displayed literally).

## 4. Other sources

- ⚠️ **Job APIs**: Adzuna (Italy, free key, 250 calls/day) and Jooble (Italy, key per country,
  ~500 requests **lifetime**) verified by documentation/web research (ADR 0003); Careerjet **not
  built** (publisher API needing a key, little value). What each returns is shown with documented
  response shapes: U `audit-sources.test.ts › job APIs map their documented fields`. **No live query
  was run** (no keys, and tests must not call real APIs). Needs your keys for a live check.
- ✅ **ATS watchlist**: admin → Aziende (ATS) form (`src/app/admin/(panel)/aziende/page.tsx`); every
  adapter has a saved-response test: U `audit-sources.test.ts › ATS adapters (saved responses), Italy
  only` × 6 (greenhouse, lever, ashby, smartrecruiters, workable, personio).
- ✅ **Manual add**: pasted **text** → title, salary line, application e-mail prefilled
  (E `compass.spec.ts › manual add fills fields from pasted text`); pasted **link only** → title,
  company, city read from the URL itself, page never fetched
  (U `audit-sources.test.ts › manual add from a link only` × 5: LinkedIn, InfoJobs, Indeed, other, not a link).
- ✅ **W1**: Tavily, 1,000 free credits/month, **no card** (ADR 0004). Cap in code: U `audit-sources.test.ts
  › W1 › the 26th query of the day is refused (cap 25) and the provider is not called` and `› the admin
  cannot raise the cap above 100`.
- ✅ **W1 never fetches platform pages**: U `audit-sources.test.ts › W1 › only talks to the search API`
  (every request URL is `https://api.tavily.com/search`; LinkedIn links are stored, never fetched).
- ✅ **W2 robots.txt first**: `src/lib/sources/web/polite-fetch.ts` (`rules()` before every `get`).
  U `audit-sources.test.ts › W2 › robots.txt is checked before fetching; a disallowed path is never requested`.
- ✅ **W2 5 s per domain**: U `› waits at least 5 seconds between requests to the same domain` (waits = [5000, 5000]).
- ✅ **JSON-LD**: U `› JSON-LD: missing fields`, `› an array of postings and a @graph wrapper`,
  `› expired postings dropped, broken JSON ignored`, `› salary units`.
- ⚠️ **W3**: off by default ✅, fetcher outside the public repo ✅ (not built at all), ADR 0009 ✅,
  20/day + 10 s + stop-on-403/429/login-wall/CAPTCHA enforced by the gate with tests ✅
  (U `w3-gate.test.ts`, 8 tests). The fetcher itself and the platform-terms review are yours.
- ✅ **Source health page**: screenshot `A/screens/1280-admin-fonti.jpg` and, with a broken mailbox,
  `A/errors/5-casella-password-fonti.jpg` (columns: last success, last run + items, total, read errors, blocks, status).
- ✅ **One broken source doesn't stop the others**: U `audit-sources.test.ts › isolation and idempotency ›
  one source throwing does not stop the others` (Adzuna throws; ATS and W2 still return items; health
  records the error) and U `pipeline.test.ts › a 403 stops the source for the rest of the day`.

## 5. Normalization

- ✅ **Salary examples** (U `audit-core.test.ts › salary: the brief's examples`):

  | Input | min / max (annual gross) | basis | estimate |
  |---|---|---|---|
  | `RAL 28-32k` | 28,000 / 32,000 | annual_gross | no |
  | `28.000 - 32.000 € annui` | 28,000 / 32,000 | annual_unspecified | yes ("si presume lordo") |
  | `1.600 € netti/mese` | 27,700 / 27,700 | monthly_net | yes |
  | `14 €/h` | 29,100 / 29,100 | hourly | yes |
  | `CCNL Commercio 4° livello` | 25,500 / 25,500 | ccnl | yes |
  | `stipendio commisurato all'esperienza` | – / – | unknown | no |
  | (none) | – / – | unknown | no |
- ✅ **Gross vs net**: one field per job (annual gross) plus `salary_basis`, `salary_is_estimate`,
  `salary_note` and the original `salary_raw`; anything from net/monthly/hourly/CCNL is an estimate
  and shown as "(stima)". `src/lib/core/salary.ts`.
- ✅ **Unknown is neutral**: ranking U `rank-scam.test.ts › unknown salary is neutral, not a fail`;
  filter U `audit-core.test.ts › unknown salary stays visible under a pay filter`.
- ✅ **Contract / hours / remote / languages, Italian and English**: U `audit-core.test.ts › extraction in
  Italian and English` (+ `extract.test.ts`, 32 cases).
- ✅ **Location offline**: `data/comuni.json` (7,903 comuni). Milano–Torino computed **≈125 km**
  (U `audit-core.test.ts › Milano to Torino is about 125 km, offline`: 120 < d < 130). Misspelled/unknown
  city: no crash, text kept, no distance (`› misspelled or unknown city`). Optional online fallback
  (Nominatim, off by default) for places outside the list: U `audit-sources.test.ts › geocoder fallback`.
- ✅ **Application e-mail**: 3 positives with their evidence sentence and 2 negatives (footer, privacy
  notice): U `audit-core.test.ts › application e-mail detection` (5 tests).

## 6. Dedupe

- ✅ LinkedIn alert + W1 + API → one record, three sources: U `audit-core.test.ts › dedupe › LinkedIn alert + W1 + API = one job with three source links`.
- ✅ Different city → separate: `› same title and company in a different city are two jobs`.
- ✅ Company variants: `› company variants: Rossi S.r.l. / ROSSI SRL / Rossi`.

## 7. Ranking

- ✅ Built: `src/lib/core/rank.ts`; **all weights and thresholds in one file**: `src/lib/core/rank-config.ts`.
- ✅ **Criteria and weights**: role exact +40, similar +20, only in text +8, mismatch −10; remote (if
  accepted) +18; within half radius +20, within radius +10, beyond −25; hybrid +5; salary ≥ floor +10,
  below −20 (unknown 0); hours match +10 / mismatch −15; permanent +8, accepted contract +5, not
  accepted −15; posted ≤3 days +8, >30 days −10; language known +3, missing fluent −15, missing −8;
  avoided keyword −40; role word learned from "Non mi interessa" −30; excluded company −100;
  avoided sector −30; scam flag −40.
- ✅ **Thresholds**: Molto adatta ≥45, Adatta ≥15, else Poco adatta. Why: an exact role nearby (40+20)
  is "Molto" on its own; a similar role within the radius (20+10) is "Adatta"; one big minus (far,
  excluded, scam) drops it.
- ✅ **Excluded company always Poco adatta**: U `audit-core.test.ts › ranking › an excluded company is Poco adatta whatever else it scores`.
- ✅ **Reasons come from the rules that fired**: U `› reasons come from the rules that fired`. 5 real
  examples (demo DB): "È il lavoro che cerchi (impiegata amministrativa)"; "Vicinissima a casa";
  "A 10 km da casa"; "Chiede inglese fluente"; "Attenzione: potrebbe essere una truffa".
- ✅ **Top 10 with the demo profile** (`A/metrics-vs-db.txt`): all ten are "Molto adatta": exact
  role + nearby + (pay known, permanent, recent) on top (scores 86, 86, 83, 79, 76), then exact role +
  nearby without pay info (68 ×4), then a similar role with pay (63). A human would order them the
  same way: right job, close, pay known first. No weight change needed.
- ✅ **"Non mi interessa"**: azienda → avoid that company; lontano → radius cut to 90% of that job's
  distance; paga → floor raised above that job's pay; ruolo → a word from that title penalized. Each is
  one visible row in admin → Classifica with "Annulla questa correzione". U `pipeline.test.ts ›
  dismissing 'azienda' adds a visible adjustment that can be undone`, U `rank-scam.test.ts ›
  adjustments … removing them undoes it`, E `compass.spec.ts › Non mi interessa adjusts ranking visibly and undoably`.
- ✅ **Empty profile**: no crash, no penalties, ordered by recency, everything "Poco adatta" until
  she says what she wants: U `audit-core.test.ts › empty profile (onboarding skipped)…`.

## 8. Applying

- ✅ **CV library**: 1–3 PDFs with a label (role family), upload refused above 2 MB or if not a real
  PDF (header + `%%EOF`), 4th refused. Picker for 3 job types: U `audit-core.test.ts › CV picker: three
  job types`; override: "Cambia il testo o il CV" (E covers upload: `compass.spec.ts › CV upload…`).
  Fake PDF: U `review-fixes.test.ts › only real-looking PDFs are accepted as CVs`.
- ✅ **Templates × 5 jobs**: no leftover `{…}`, no " ," or " ." artefacts: U `audit-core.test.ts › templates
  render cleanly for 5 different jobs`. Italian is written in the feminine for her ("essere contattata"):
  correct for her, would need changing for someone else.
- ✅ **Lane 1 Invia / Salta / Invia tutte (demo)**: E `compass.spec.ts › Lane 1: prepare, confirm in words,
  undo, send (demo), reply detected`; U `review-fixes.test.ts › 'Salta' puts it aside…`; U `pipeline.test.ts
  › Invia tutte respects the daily cap…`. Log after each: `A/demo-week.log` (Invia → "inviata a … (simulata,
  CV …)"; Annulla → "torna in Da inviare").
- ✅ **Lane 2 prompt** (contains job, CV text, no-invention rule): E `compass.spec.ts › Lane 3 kit and Lane 2
  Claude prompt` reads the clipboard; generated prompt text is in `src/lib/core/prompt.ts` (rules:
  "Non inventare nulla…", "Non gonfiare i risultati…", "Cose richieste che non ho nel CV").
- ⚠️ **Lane 2 back in**: she can **paste** the result; it goes to "Da inviare" (Lane 1) if the ad has an
  e-mail, otherwise to the kit (Lane 3). **Uploading a file back is not supported** (paste only).
- ✅ **Lane 3 kit**: opens the original link in a new tab, one "Copia" per answer (clipboard verified),
  "Fatto, mi sono candidata" logs it: E `compass.spec.ts › Lane 3 kit and Lane 2 Claude prompt`.
- ✅ **Spontaneous**: 6-month rule U `pipeline.test.ts › spontaneous: one per company per 6 months`;
  source URL is a required column (`spontaneous_companies.source_url`, NOT NULL) and shown in admin.

## 9. Sending guardrails

- ✅ **DEMO_MODE**: default true (`src/lib/env.ts`: anything but `"false"` is demo; U `env-check.test.ts ›
  demo mode is the default`); SMTP never called in demo: U `audit-core.test.ts › demo mode: the real SMTP
  transport is never used, even with the admin switch on` (spy on `SmtpTransport.send`: 0 calls).
- ✅ **Caps at the boundary**: U `audit-core.test.ts › first week: the 4th send on day 2 is refused`, `› after
  the first week the cap is 10, never above 20`; cap re-checked at send time: `› the daily cap is re-checked
  at send time`.
- ✅ **No repeats**: U `guardrails.test.ts › never the same job twice`, `› same company at most once per 60 days`.
- ✅ **Window incl. DST and Sunday**: U `audit-core.test.ts › Sunday, public holidays, New Year's Eve,
  29 February, DST nights`, U `guardrails.test.ts › works across the DST change`. Italian national holidays
  are skipped too (local patron saints are not: ⚠️ minor).
- ✅ **5–20 min spacing**: U `guardrails.test.ts › spaces sends by 5-20 minutes`; at send time
  U `review-fixes.test.ts › six e-mails due at the same moment leave one per run, spaced 5-20 minutes`.
- ✅ **Annulla really stops it**: U `audit-core.test.ts › Annulla really stops the send (the queue runner sends nothing afterwards)`.
- ✅ **Kill switch stops queued sends**: U `pipeline.test.ts › kill switch pulls queued e-mails back…`;
  her stop vs yours: U `review-fixes.test.ts › she cannot lift the admin's stop`.
- ✅ **Scam rules, one test each**: U `rank-scam.test.ts › scam rules` (asks for money, WhatsApp-only,
  "guadagna subito", unrealistic pay, free-mail mismatch). Never via autopilot: U `guardrails.test.ts ›
  scam flags: warning when she approves, blocker for autopilot`, U `pipeline.test.ts › autopilot only queues
  Molto adatta jobs without scam flags`, U `review-fixes.test.ts › a free-mail address added by hand later
  is caught, and autopilot will not send it`.
- ✅ **Blocklist** company/domain/keyword: U `guardrails.test.ts › blocklist by company, domain and keyword`.
- ✅ **Autopilot**: off by default (`DEFAULT_GUARDRAILS.autopilot = false`), only "Molto adatta", all rules:
  U `guardrails.test.ts › autopilot only sends 'Molto adatta' and only when switched on`.
- ✅ **E-mail shape**: one recipient (`OutboxTransport`/`SmtpTransport` reject `,`/`;`), reply-to = the
  dedicated mailbox, plain text only, PDF attached: U `audit-core.test.ts › e-mail is plain text, one
  recipient, CV attached`. A 5 MB CV is refused twice: at upload ("Il file è più grande di 2 MB…") and at
  send (U `› a 5 MB CV is refused`).
- ✅ **Send log**: her plain Italian view `A/screens/360-le-mie-candidature.jpg` ("Registro degli invii":
  "Oggi: inviata (per prova) a …, con il CV …"); your detailed view `A/screens/1280-admin-registro.jpg`.

## 10. Replies and digest

- ✅ **Message-ID first, domain fallback**: U `pipeline.test.ts › matches a reply by thread…`; job
  newsletters are not mistaken for replies, even from a company she wrote to: U `audit-core.test.ts › a job
  newsletter from a company she applied to is NOT taken as a reply`; U `alerts.test.ts › a recruiter reply
  is not an alert`.
- ✅ **Notice + one tap**: E `compass.spec.ts › Lane 1 …` ("Hai ricevuto una risposta da …", "Sì, va bene" →
  "Colloquio").
- ⚠️ **Digest**: counts equal direct DB queries (U `audit-core.test.ts › digest counts match direct database
  queries`; `A/demo-week.log`), one button that opens `/offerte` (`A/digest/digest-telefono.png`, 62 px
  button, 1 link). **Not checked inside the real Gmail app** (rendered in Chromium at phone width with
  table layout and inline styles, which Gmail supports). Needs one real send to her inbox.
- ✅ **Full demo week**: `npm run simulate:week` → `A/demo-week.log`: 5 alerts parsed, ranking, 3
  approvals, 1 "Annulla", 2 sends 15 min apart in the window, reply matched by Message-ID, status
  Colloquio, digest "1 nuova offerta, 1 candidatura pronta, 1 risposta ricevuta" = DB. "All checks passed."

## 11. Boomer-proof UI

Evidence for the whole section: `npm run audit:ui` on 49 screens × 2 widths (360 px, 1280 px) →
`A/ui-report.md` + 98 screenshots in `A/screens/`. Result line: **"audited 98 screens; axe violations:
0; overflow screens: 0"**.

- ✅ **≥18 px**: html font-size 19 px (`src/app/globals.css`); smallest text on her screens ≥18.05 px
  (report column "Smallest text"). Found and fixed in this audit: nav badge 15.2 px, labels at 17.1–17.5 px.
- ✅ **Contrast (axe, WCAG A/AA + AAA `color-contrast-enhanced`)**: 0 violations on all 98. Also in CI:
  E `security.spec.ts › accessibility: axe finds no WCAG A/AA (and AAA contrast) problems on key screens`.
  Fixed in this audit: pricing badge contrast; admin scroll regions not keyboard-focusable.
- ✅ **≥48 px labelled targets, no icon-only buttons**: report columns "Smallest target" / "Unlabeled" (0);
  E `compass.spec.ts` `assertBoomerProof` on several screens. Only admin-only inline URLs are smaller.
- ✅ **4-item nav**: E `compass.spec.ts › Offerte…` (`toHaveCount(4)`, labels Offerte / Da inviare / Le mie candidature / Aiuto).
- ✅ **English/tech words**: rendered text of all her screens checked for match, feed, dashboard,
  pipeline, upload, login, template, score, error, null, undefined, link → one real hit ("Link:" inside the
  Claude prompt) fixed. Remaining borrowed words common in Italian: "e-mail", "CV", "part-time", "kit".
- ✅ **No swipe/hover-only/long-press/infinite scroll**: `grep -rnE "onTouch|touchstart|swipe|onPointer|onMouseEnter|IntersectionObserver|onScroll|contextmenu|group-hover:(block|flex|visible)" src` → 0 hits; paging is "Mostra altre 10".
- ✅ **Confirm in a full sentence + Annulla**: "Sto per inviare la tua candidatura a … per il ruolo di …
  Confermi?" then 15-minute "Annulla l'invio" (E `compass.spec.ts › Lane 1…`). "Invia tutte" lists every
  company before confirming.
- ✅ **Status + help line on every screen**: report columns "Help line" / "Status line"; fixed in this audit:
  final onboarding screen and 404 had no help line.
- ✅ **Forced errors** (`npm run audit:errors`, `A/errors/`): no internet → `1-senza-internet.jpg` ("Manca la
  connessione … Controlla il Wi-Fi o i dati del telefono, poi riprova."; page cached by the service worker,
  verified `caches.match('/offline.html') = true`); empty results → `2-nessun-risultato.jpg` ("Nessuna offerta,
  per ora · Prova a togliere qualche filtro."); server/database down → `3-errore-server.jpg` (HTTP 500 page:
  "Qualcosa non ha funzionato. Non è colpa tua. Riprova tra un minuto…", no codes); mailbox password rejected
  → she sees nothing scary (her header keeps "Ultimo aggiornamento…"), you get `4-casella-password-admin.jpg`
  ("accesso rifiutato… va rigenerata"). ⚠️ Playwright's offline mode does not reach service-worker fetches,
  so "offline" was verified in two halves (cache + page), not as one end-to-end navigation.
- ✅ **Onboarding**: 8 steps, one question each, "Passo X di 8", "Salta questo passo" on every step, editable
  from Aiuto → Il mio profilo. Screenshots `A/screens/360-benvenuto-passo-1.jpg` … `-8.jpg`; full walk-through
  E `compass.spec.ts › CV upload, then delete all data and redo onboarding (8 steps)`.
- ⚠️ **PWA**: manifest valid (name, `start_url: /offerte`, `display: standalone`, icons 192/512/512-maskable),
  service worker registered and controlling, session cookie httpOnly, SameSite=Lax, **valid 180 days**
  (`A/errors/result.json`). Meets Chromium's installability criteria; **not tried on a physical phone**.
- ✅ **Keyboard and 200% zoom**: report column "Focus visible": every element reached with Tab shows a focus
  ring (25 Tabs per screen, 0 missing); zoom: 640 px and 320 px windows → 0 px horizontal overflow on all her
  screens (fixed in this audit: long e-mail addresses and the file input overflowed at 320 px).
- ✅ **60-year-old walkthrough** (first opening → first sent application, demo): confusing moments found and
  fixed: "a 0 km da casa" → "nella tua città"; "Vista oggi" (sounds like *seen*) → "Trovata oggi"; bare "A:" →
  "La mando a:"; no explanation of "Salta" → "«Salta» la mette da parte: non parte niente."; the morning
  e-mail button opened the marketing page when signed out → now opens `/offerte` (sign-in if needed);
  "Claude" unexplained → one sentence + "la prima volta fatti aiutare"; the admin link removed from her
  sign-in page footer; "CV allegato" line broke into columns on phones. Remaining risk: she has never seen it
  (§18 usability test).

## 12. Privacy and security

- ✅ **gitleaks on the whole history**: `gitleaks git . --config compass/.gitleaks.toml --redact` → "18 commits
  scanned … no leaks found". Also every CI run.
- ✅ **Personal data grep**: `node scripts/scan-personal-data.mjs` → "230 files clean."
- ✅ **gitignore**: `git check-ignore` → `.env` ignored, `data/local/compass.db` ignored, `.goal/STATUS` ignored,
  `private-sources/` ignored. ⚠️ `.goal/PROGRESS.md` and this file are committed on purpose (the cloud
  container is wiped); they contain no personal data. Delete before going fully public if you prefer.
- ✅ **Logs after a full demo run** (server log + all five jobs, 73 lines): grep for e-mail addresses, the demo
  name, phone numbers, CV text → **0 hits**. The job runner prints counts only and redacts strings with "@".
- ✅ **CI logs**: they print test names, counts and the redacted job output only (see above); fixtures are fake.
- ✅ **Delete all data**: profile, CVs, jobs, applications, send log, outbox, demo inbox, replies, notifications,
  caches, templates reset; your admin lists and the processed Message-IDs kept so nothing is re-imported:
  U `review-fixes.test.ts › delete-all keeps the admin's lists and processed e-mails, resets letters`,
  U `pipeline.test.ts › deletes all her data`, E `compass.spec.ts › … delete all data …`.
- ✅ **Auth matrix**: E `security.spec.ts › logged out: every private page and API is closed` (12 admin pages,
  6 of her pages, CV download, 3 CSV exports, cron with no/wrong secret) and `› logged in as her: admin pages
  and admin APIs stay closed`. Every server action calls `requireUser()`/`requireAdmin()` first.
- ✅ **No secrets in the client bundle**: grep of `.next/static` for every secret variable name and the actual
  local secret values → 0 files each.
- ✅ **XSS**: see §3 (E `security.spec.ts › XSS…`). CSV export neutralizes spreadsheet formulas.
- ✅ **CV uploads**: PDF only (header + `%%EOF`), ≤2 MB, max 3, sanitized filename; served only with a session,
  `Content-Disposition: attachment`. A fake PDF with a valid header *and* trailer would pass: we don't parse PDFs.
- ✅ **Parameterized queries only**: all DB access through Drizzle; raw `sql\`…\`` fragments interpolate only
  column objects or values that Drizzle binds as parameters. No string-built SQL.
- ✅ **Sign-in throttling** (added in this audit): 5 failures → 15-minute lock. E `security.spec.ts › sign-in is
  throttled after 5 wrong passwords`, U `review-fixes.test.ts › sign-in: 5 wrong passwords lock the account`.

## 13. Reliability and scheduling

- ✅ **Schedule** (`.github/workflows/scheduled-jobs.yml`): ingest 06:30, W1 06:45, digest 07:00 (Italian
  summer time; one hour earlier in winter), queue every 15 min Mon–Fri 06:00–17:45 UTC (covers 08:30–18:00
  Rome in both summer and winter time; the code enforces the exact window), replies every 2 hours.
  `vercel.json`: digest daily (Vercel Hobby allows daily crons only).
- ✅ **Idempotent ingestion**: see §3.
- ✅ **Retries and timeouts** (added in this audit): every outbound call has a 20 s timeout and 2 retries with
  2 s/4 s backoff on network errors and 5xx, never on 403/429: U `audit-sources.test.ts › HTTP helper` (3 tests).
- ✅ **Wrong/revoked mailbox password**: health row "accesso rifiutato" + immediate admin notification + admin
  e-mail; she keeps a working app. `A/errors/4-casella-password-admin.jpg`, `5-…-fonti.jpg`.
- ⚠️ **Free-tier traps**: Turso free no longer pauses idle databases (no cold starts); Vercel Hobby crons are
  once a day (handled: frequent jobs run on GitHub Actions); **GitHub disables scheduled workflows after 60 days
  without commits on a public repo** → not preventable from code; visible in admin → Panoramica ("Ultime
  esecuzioni") and in `docs/setup.md`. A monthly empty-looking commit or a manual run keeps it alive.
- ✅ **CSV backup** (added in this audit): admin → Panoramica → Scarica offerte / candidature / registro invii
  (`/api/export/{jobs,applications,sendlog}`, admin-only, tested in E `security.spec.ts`).

## 14. Cost (target €0/month)

| Service | Plan | Card? | Free limits | Expected use |
|---|---|---|---|---|
| Vercel | Hobby | no | personal non-commercial; daily crons | 1 user + you |
| Turso | Free | no | 100 DBs, 5 GB, 500 M reads, 10 M writes / month | < 50 MB, < 1 M reads |
| GitHub Actions | Free (public repo) | no | unlimited minutes on public repos | ~45 runs/day × ~1 min |
| Gmail (dedicated) | free account | no | SMTP ~500 recipients/day | ≤ 10 applications + 1 digest/day |
| Adzuna API | free developer | no | 250 calls/day, 2,500/month | ≤ 3 calls/day (≤ 90/month) |
| Tavily (W1) | Researcher | no | 1,000 credits/month | ≤ 25/day → ≤ 775/month |
| Jooble | free key | no | ~500 requests lifetime | off by default |
| Nominatim | public | no | 1 req/s, fair use | off by default; ≤ 10/run, cached |

- ✅ **Caps where the provider has none**: W1 25/day (hard max 100) in code with tests (§4). No paid
  provider without a cap is used (Brave was rejected for that reason, ADR 0004). Adzuna is bounded by
  design (≤ 3 roles per daily run).
- ⚠️ **Anything that could start costing money**: nothing is on a card. The risks are policy, not
  billing: Adzuna's licence terms (§4) and Vercel Hobby's non-commercial clause **if you ever charge for
  the subscription plans** (the pricing page's prices are invented and payments are not active).

## 15. Legal and good citizenship

- ✅ **Outbound hosts the code can fetch** (grep of URL literals + every `request`/`getJson` call site):
  `api.adzuna.com`, `it.jooble.org`, `api.tavily.com`, `boards-api.greenhouse.io`, `api.lever.co`,
  `api.ashbyhq.com`, `api.smartrecruiters.com`, `apply.workable.com`, `<slug>.jobs.personio.de`,
  `nominatim.openstreetmap.org` (off), approved W2 sites (none real yet), Gmail IMAP/SMTP.
  `linkedin.com`, `indeed.com`, `infojobs.it` appear **only as link strings** (canonical links she opens,
  demo data) — never fetched. W2 refuses platform hosts even through redirects (U `review-fixes.test.ts ›
  W2 never fetches job platforms, even through a redirect`).
- ✅ **No browser automation against third parties**: Playwright is used only in `tests/e2e` and the local
  `scripts/audit-*.mjs`/`screenshots.mjs`, all against our own localhost.
- ✅ **No login/account creation/CAPTCHA/proxy code**: grep → only the W3 gate's *detection* of CAPTCHAs/login
  walls (to stop), and our own app's sign-in.
- ✅ **Honest User-Agent with contact on every request**: `CompassJobFinder/0.1 (personal job search, low
  volume; contact: …)`, U `audit-sources.test.ts › sends an honest User-Agent with the contact address`;
  `CONTACT_EMAIL` is required in real mode.
- ⚠️ **W2 sources listed with robots/ToS summary and approval date**: the mechanism exists (admin → Siti:
  terms summary, robots summary, approval date, refused without both summaries). **No real site has been
  approved** — only the fake demo site. Needs you.

## 16. Portfolio readiness

- ✅ **README**: problem, screenshots, Mermaid diagram, run in demo mode (measured: 21 s from clone to running),
  "Legal and ethical design". Re-read after the last change: test counts, commands and links are current.
- ✅ **ADRs**: 0001–0013 in `docs/adr/` (stack, mailbox, job APIs, W1, hosting, ranking, geodata, guardrails,
  W3, auth, privacy, location/name, send queue). No major decision without one.
- ✅ **CHANGELOG**: 0.1.0 and 0.2.0.
- ✅ **Demo seed**: invented Italian companies and people, `.example` domains, scan clean.
- ✅ **Metrics vs DB**: `A/metrics-vs-db.txt` — jobs total 47 = SQL 47; per source identical; per lane
  identical; reply rate (simulated) 1/2 = SQL; posting→application median 76 h = middle of SQL values
  [26, 76, 221]. Real-send numbers are 0 in demo, by design.
- ✅ **Fresh clone as a stranger**: see §2 (worked first try).
- ✅ **License**: `LICENSE` (MIT, "The Compass authors") — ⚠️ confirm you're happy with MIT.
- **5 weakest parts (what a skeptical interviewer would ask)**
  1. *Synthetic parsers* — "How do you know they work on real LinkedIn e-mails?" (Honest answer: I don't yet;
     here's the fallback and the alert.)
  2. *Heuristic Italian NLP with regexes* — "What's your precision/recall on salary and contract extraction?"
     (There's no labelled real dataset; 100+ hand-written cases only.)
  3. *Ranking weights are hand-tuned* — "Why 40 for the role and −25 for distance? How would you learn them?"
     (From her "Non mi interessa" history, later.)
  4. *Single-tenant SQLite/Turso with app-level locking* — "What happens with two users or concurrent
     cron + Vercel?" (Atomic claim + cap at send time, ADR 0013; not designed for multi-tenant.)
  5. *Demo-mode duality* — "How do you know real mode behaves like demo mode?" (Same code paths with
     injected transport/mailbox/fetch; but no live end-to-end run exists yet.)

## 17. Break it on purpose

- ✅ **Malformed, empty, 200-job alert e-mails**: U `audit-core.test.ts › break it on purpose` (no crash, 0 jobs;
  200 parsed completely).
- ✅ **Emoji, accents, apostrophes, long strings**: U `audit-core.test.ts › accents, apostrophes, emoji and very
  long strings display and dedupe` (Caffè dell'Università / Forlì / ✨; titles capped at 200 chars).
- ✅ **No city / company / link**: U `› no city, no company, no link: stored, not merged with anything`.
- ✅ **0 jobs**: friendly empty state (`A/errors/2-nessun-risultato.jpg`; after "Cancella tutti i miei dati").
- ✅ **5,000 jobs** (`A/perf-5000.txt`): Offerte query 7 ms, with 3 filters 8 ms, 200 rows 11 ms; full page load
  in the browser 83–128 ms (200 cards: 260 ms). Re-ranking all 5,000 after a profile change took **7.5 s**
  (one UPDATE per job) → fixed with batched updates: **0.84 s**.
- ✅ **Concurrent sends vs the cap**: U `audit-core.test.ts › two queue runners at the same time never send the
  same e-mail twice` and `› the daily cap is re-checked at send time (approvals racing for the last slot)`.
- ✅ **31 Dec, 29 Feb, DST night**: U `audit-core.test.ts › Sunday, public holidays, New Year's Eve, 29 February,
  DST nights` (31 Dec 18:30 → next send Mon 4 Jan 2027, since 1 Jan is a holiday and 2–3 Jan a weekend).

## 18. Handoff

- ✅ **"Come si usa"**: in the app (Aiuto → Come si usa) and printable `docs/come-si-usa.md` with 5 phone
  screenshots (`docs/guida/`).
- ✅ **Admin guide**: `docs/guida-admin.md` (passwords, add a company, read source health, autopilot/W3/geocoder,
  demo mode off, backups).
- ✅ **"Waiting on you"**: updated in `.goal/PROGRESS.md` (ordered, with what each unblocks).

---

## Everything not ✅

| Item | Why | What's needed | Who |
|---|---|---|---|
| §1/§16 M5 deploy | Deploying is a permission point | Create Turso DB, Vercel project, GitHub secrets (docs/setup.md §4–6) | You |
| §1 M6 / §4 W3 fetcher | Not built on purpose (public repo, platform terms) | Read the platforms' terms, decide; if yes, build in a private repo behind the existing gate | You (decision), then me |
| §3 real alert samples | Parsers built on synthetic e-mails | 2–3 anonymized real alerts per platform into `fixtures/emails/` | You (samples), then me (tweaks) |
| §4 live API check | No keys; tests must not call real APIs | Adzuna + Tavily keys in `.env`; confirm Adzuna's terms for ongoing personal use | You |
| §4/§15 W2 real sites | None approved | Pick sites (inPA, local agencies, target companies), write terms + robots summaries, approve | You |
| §8 Lane 2 upload | Paste only, no file upload back | Decide if paste is enough (I think it is) | You |
| §9 local holidays | Only national holidays skipped | Add Torino's patron day (24 June) if relevant | Me (5 min) |
| §10 digest in Gmail | Rendered in Chromium, not in the Gmail app | One real digest to her inbox after go-live | You |
| §11 offline end-to-end | Playwright offline doesn't reach the service worker | Turn on airplane mode on a phone once | You |
| §11 PWA on a phone | Installability criteria met, never installed | "Aggiungi a schermata Home" on her phone | You |
| §11 usability test | Brief requires watching her for 15 minutes | Do it after Offerte, and again after applying | You |
| §13 GitHub 60-day rule | Platform rule, not fixable in code | Keep committing, or run the workflow by hand monthly | You |
| §14 commercial use | Prices are invented; Vercel Hobby is non-commercial | Only if you ever charge: paid hosting + payments + invoicing/VAT | You |
| §2 dev-dependency advisories | 9 in drizzle-kit/eslint tooling, 0 in production | Update when upstream fixes land | Me (later) |
| §12 committed notes | `.goal/PROGRESS.md` + this file are public | Delete before publishing if you prefer | You |
| §16 license | MIT chosen by me | Confirm or change | You |
| §1 commit size | Fewer, larger commits than the brief asked | None (history is fine to keep) | — |
