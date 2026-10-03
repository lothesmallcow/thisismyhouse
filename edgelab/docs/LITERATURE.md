# Evidence brief (October 2026)

Compiled from web search. Full texts were mostly blocked, so the numbers come from abstracts and
snippets. **[CHECK]** marks a figure to verify against the PDF before relying on it.

**Prior for everything here:** McLean and Pontiff (JF 2016) studied 97 published predictors. Returns
were 26% lower out-of-sample and 58% lower after publication. **Haircut every published effect by
at least 50%.**

## LLM look-ahead bias (why LLM signals are forward-only here)
- **Glasserman and Lin, JFDS 2024.** GPT headline sentiment does better when the firm is anonymised.
  Knowing the firm distracts the model, and look-ahead exists on top of that.
- **Sarkar and Vafa, 2024 (working paper).** Look-ahead appears in risk-factor and election tasks.
- **Gao, Jiang and Yan, Dec 2025 (arXiv 2512.23847).** A "lookahead propensity" test is positive
  before the training cutoff and about 0 after it. It gives a per-observation memorisation probe.
- **Didisheim, Fraschini and Somoza, Econ. Letters 2025.** The bias grows with model size and lower
  data frequency. It is small for small models on daily firm-level data.
- **He, Lv, Manela and Wu, 2025 (ChronoBERT/ChronoGPT).** Point-in-time models reach a news Sharpe of
  4.80 vs 4.90 for Llama-3.1-8B. They call news look-ahead "modest".
- **Li, Wang and Ma, EMNLP 2026 (FinCAD).** Look-ahead survives anonymisation. Their fix cuts
  memorised-date returns by up to 67%.
- **Kelly, Malamud, Schwab and Xu, NBER w35247 (2026).** Open point-in-time models are available
  with monthly checkpoints from 2013 to 2024.

**Policy:**
- Frontier-model historical scores are an upper bound only.
- Forward or post-cutoff data is the only clean test.
- Point-in-time models are the option if we ever need history.

## LLM text signals
- **Lopez-Lira and Tang (JFE 2026).** Overnight long-short news strategy earning 34 bps/day gross.
  The effect is concentrated in small caps and negative news. The Sharpe has decayed:

  | Period | Sharpe |
  |---|---|
  | Q4 2021 | 6.54 |
  | 2022 | 3.68 |
  | 2023 | 2.33 |
  | Jan-May 2024 | 1.22 |

  No net-of-cost evidence was found.
- **Chen and Pu, Jan 2026.** An agentic LLM on the Russell 1000 from Apr 2025 earned a top-20
  six-factor alpha of about 15.8 bps/day, long side only. That is under one year of live data:
  fragile.
- **Takeaway:** real but decaying fast, and small-cap heavy, so costs matter.

## Candidate anomalies

| Signal | Source | Horizon | Effect (pre-haircut) | Decay evidence | Free data? |
|---|---|---|---|---|---|
| Opportunistic insider buys | Cohen, Malloy, Pomorski JF 2012 | ~1 month | 82 bps/mo VW; routine ~0 | Faster price absorption after SOX; concentrated in illiquid names | Form 4 XML, yes |
| Insider cluster buys | Alldredge and Blank JFR 2019 | 1 month | +2.1% (0.9 pp over solo buys) | none found | yes |
| 13D activism | Brav, Jiang, Partnoy, Thomas JF 2008 | (-20,+20) days | ~+7%, much of it before filing | 2024 rule cut the deadline to 5 business days [CHECK] | yes |
| NT 10-K | Bartov and Konchitchki, Acc. Horizons 2017 | 5 days | -1.96%; "-13% over 3 quarters" [CHECK] | none post-2017 | yes |
| 8-K items (general) | Lerman and Livnat RAS 2010 | up to 90 days | some items drift [CHECK which] | attention matters (Ben-Rephael et al. TAR 2022) | yes |
| 8-K 4.02 non-reliance | vendor working paper (not peer reviewed) | 20 days | about -1.1% day 1, -2% over 20 days | unknown | yes |
| 8-K 4.01 auditor change | various | days | resignations negative, dismissals weak | unknown | yes |
| Friday / after-hours disclosure | DellaVigna and Pollet JF 2009; Michaely, Rubin, Vedrashko JAE 2016 | days to weeks | Friday: 15% less immediate, 70% more delayed response | high decay risk | yes |
| Lazy Prices | Cohen, Malloy, Nguyen JF 2020 | 6-18 months | "up to 188 bps/mo" for best sections [CHECK] | one weak S&P 100 replication ~0 | yes, slow |
| Customer-supplier | Cohen and Frazzini JF 2008 | monthly | 1.55%/mo (1980-2004) | about 0.6%/mo, insignificant VW post-2005 (Pinchuk) | names hard |
| PEAD | Martineau CFR 2022 | 60 days | ~0 for large caps since about 2006 | dead | partly |
| Overnight vs intraday | Lou, Polk, Skouras JFE 2019 | months | momentum earned overnight | none found | yes |
| Going concern | Kausar, Taffler, Tan JAR 2009 | 1 year | -14% | authors: costs limit profits | text search |
| Implied vs realised earnings move | Gao, Xing, Zhang JFQA 2018 | ~3 days | straddles +3.34% | unknown | options data not free: forward only |
| Evasive calls | Larcker and Zakolyukina JAR 2012 | annual | -4% to -11% alpha | none | transcripts paid: dropped |

**Best fits for free data at days to weeks:**
1. Insider cluster buys
2. 13D activism
3. NT filings
4. 8-K 4.01/4.02
5. Disclosure timing x attention
