# Spotting luck and overfitting: the 10 ideas you need

Read one a week. Each has a number you can check yourself.

**1. Noise is huge.** A small-cap stock's stock-specific move over 5 days has a standard deviation
of about 7%. A real edge is maybe 0.3% per trade. You are looking for a coin that lands heads 52% of
the time.

**2. Sample size (power).** To detect a mean of m in noise of sd s, you need about (2.8 × s / m)²
observations. With s = 7% and m = 0.3%, that is about 4,300 trades. Even with m = 1% you need about
380. With 100 trades you only "detect" effects of 2% or more, which are rarely real. Code:
`stats.required_n`.

**3. p-values and multiple testing.** p < 0.05 means pure noise would look this good 1 time in 20.
Try 20 ideas and one will "work" by luck. Our test suite shows exactly that rate
(`test_ttest_noise_is_insignificant_on_average`).

The fix is to count every attempt (`test_log`) and raise the bar:
- **Holm:** with 5 hypotheses, the best one needs p < 0.01.
- **Benjamini-Hochberg:** controls the share of false discoveries among the winners.

**4. Sharpe ratio.** Average return divided by its volatility, annualised. A Sharpe of 1 over one
year is not significant (t ≈ 1). You need about 4 years of Sharpe 1 for t = 2.

**Deflated Sharpe** asks: after trying N strategies, how good would the best of N pure-noise
strategies look? Yours must beat that, not zero.

**5. Overlap and correlation.** Ten signals on the same day are not ten independent observations.
The whole market moved for all of them together. That is why we average per day first
(calendar-time returns) and use a block bootstrap.

**6. Look-ahead (leakage).** The most common way backtests lie is using information before it was
public. Examples:
- a filing accepted at 16:30 traded at that day's close
- an index membership list from today applied to 2018
- an LLM that already read the news about how the story ended

Our rule: trade only at the first open after `available_at`.

**7. Survivorship.** Today's list of stocks excludes everything that went bankrupt. A backtest on
today's list is biased upward. We snapshot the universe every day so this cannot happen going
forward.

**8. Costs.** A 0.3% edge with a 0.35% round-trip cost is a loss. Always read the "pess" column.

**9. Controls.** Beating SPY in a rising market proves nothing. Beating a random trader that buys
stocks on the same kind of event days, with the same costs, is the real test.

**10. Narrative fallacy.** After any trade you can write a convincing story. Single-trade stories are
mostly noise. Only tags accumulated over hundreds of trades say anything, and even then they are
hypotheses for the next pre-registration, not conclusions.

**A live example from our own build.** The random trader beat its peers in 3 synthetic runs out of 3
(+0.3% to +0.7% per trade). It looked like a bug, so I ran 8 more seeds: −0.8% to +0.5%, average
about 0. Three in a row was luck. That is the whole project in miniature.
