# Verified facts (as of 2026-10-03)

Checked by web search on 2026-10-03. Many primary sites (SEC, FINRA, Alpaca, Hetzner) blocked direct
fetches from the research sandbox, so several items rest on search snippets quoting the primary
page. Re-verify anything marked below 80% before it matters.

| # | Item | Finding | Conf. |
|---|---|---|---|
| 1 | PDT rule | SEC approved the FINRA Rule 4210 amendments on 14 Apr 2026 (SR-FINRA-2025-017; Regulatory Notice 26-10), effective 4 Jun 2026, with phase-in to 20 Oct 2027. The PDT label, day-trade counting and the $25k minimum are gone, replaced by an intraday margin deficit calculation. Alpaca switched on 4 Jun 2026 and removed `pattern_day_trader` and `daytrade_count` from its API. | 92% |
| 2a | Alpaca paper sign-up | Email only, $100k virtual, no KYC. | 80% |
| 2b | Paper accounts | Up to 3 per user, each with its own keys (forum sources). | 70% |
| 2c | Alpaca live from Italy | EEA passporting via the Spanish entity was announced 7 Jul 2026, aimed at partners. Direct retail eligibility for Italians unconfirmed. Minimum age 18. | 60% / 90% |
| 2d | Free market data | Real-time IEX only. Historical SIP allowed if older than 15 min. Back to 2016, minute bars included, 200 req/min. | 85% |
| 2e | News API | Free, from Benzinga, back to 2015 (gaps in 2016), same rate limit. | 80% |
| 2f | OPG/CLS orders | Valid TIFs. OPG is rejected 9:28am-7:00pm ET. The docs reportedly limit OPG/CLS to "Elite Smart Router" users. Paper short selling works with no locate checks. | 65% |
| 3 | SEC EDGAR | Declared User-Agent "Name email" is required. Limit is 10 req/s (excess gives a ~10 min block). Endpoints: Atom `getcurrent` (live), `data.sec.gov/submissions` (acceptanceDateTime, near real-time), daily index (end of day). Filings accepted after 5:30pm ET get the next business day's filing date; acceptance time is the truth. A third-party report says after-5:30pm filings are held off the live feed until the next day. | 88% |
| 4a | Claude automation terms | Consumer terms forbid automated access except via an API key or where explicitly permitted. Subscription login is for "ordinary use of Claude Code and native apps". Routines (cloud scheduled runs, minimum 1h interval) are an official Pro/Max feature and draw on subscription usage. Third-party harnesses on subscription credentials are banned (enforced since Apr 2026). The planned split of `claude -p` into separate credits was paused on 15 Jun 2026. **Implication:** use routines for reviews (first-party, low risk). Any high-volume programmatic LLM "sensor" on the VPS must use a paid API key, not the subscription. | 85% |
| 4b | Usage limits | A 5-hour session limit plus a weekly limit. Max 5x = 5x Pro, Max 20x = 20x Pro. No fixed hour counts are published. Claude Code weekly limits rose 25% permanently from 14 Sep 2026. **Measure your own burn.** | 75% |
| 4c | `/goal` | Exists (`/goal [condition|clear]`, v2.1.139+). An evaluator checks the condition across turns. | 95% |
| 5 | Italian tax | 26% on capital gains (redditi diversi). With a foreign broker you are in the declarative regime: quadro RT for gains, RM for dividends (15% US withholding with a W-8BEN, foreign tax credit), RW for monitoring and IVAFE at 0.2%/yr. Losses carry forward 4 years. Budget Law 2026 changed crypto (33%), not stocks. **Get a commercialista before real money.** | 85% |
| 5b | US ETFs for EU retail | Not purchasable (no PRIIPs KID). Use UCITS equivalents. Paper SPY is fine. | 85% |
| 6 | VPS prices | Hetzner raised prices twice in 2026. New CX23 (2 vCPU, 4 GB, 40 GB; specs to verify at order) is about €5.49/mo + VAT, CAX11 about €5.99. Backups +20%. US East (Ashburn) is only CPX at about $20/mo, not needed for daily-frequency trading. Netcup and Contabo are cheaper but less certain. | 75% |
| 7 | Monitoring | healthchecks.io free: 20 checks, email/ntfy/Telegram integrations. ntfy.sh public: 250 msgs/day per IP, topics are public so use an unguessable name. | 80% |
| 8 | FMP | Free: 250 calls/day, end-of-day only. Transcripts, 13F and intraday are paid (transcripts ~Ultimate tier). | 70% |
| 9 | Ages | Alpaca accounts need 18+ (assume the same for paper). Hetzner terms: under 18 may not order, but a parent can be the customer. DigitalOcean 18+. | 70-80% |
| 10 | Student credits | The GitHub Student Pack's DigitalOcean credit ended 31 Jul 2026. Azure for Students ($100, no card) requires 18+. | 85-90% |

## Facts the code measures instead of assuming (`edgelab smoke`)
- Which clock EDGAR `acceptanceDateTime` uses. Stored in `meta.sec_acceptance_tz`.
- Whether SIP historical bars work on your free key.
- Whether minute history and news return data.
- Whether ntfy and healthchecks are wired.
