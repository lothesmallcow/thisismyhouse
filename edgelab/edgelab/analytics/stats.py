"""Statistics for honest evaluation. Pure functions, unit-tested.

Key rules encoded here:
- Signals on the same day are correlated, so per-signal t-stats overstate significance.
  calendar_time_returns() aggregates to one return per day before testing.
- Every look at the data must be logged (log_test). Corrections use the full count.
- Deflated Sharpe (Bailey & Lopez de Prado 2014) penalizes the number of trials.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd
from scipy import stats as st

from ..timeutil import now_iso

EULER = 0.5772156649015329


def t_test_mean(x) -> dict:
    x = np.asarray([v for v in x if v is not None and not np.isnan(v)], dtype=float)
    n = len(x)
    if n < 3:
        return {"n": n, "mean": float(np.mean(x)) if n else None, "t": None, "p": None}
    m, sd = x.mean(), x.std(ddof=1)
    t = m / (sd / math.sqrt(n)) if sd > 0 else float("inf")
    p = 2 * st.t.sf(abs(t), df=n - 1)
    return {"n": n, "mean": float(m), "sd": float(sd), "t": float(t), "p": float(p)}


def calendar_time_returns(df: pd.DataFrame, date_col: str, ret_col: str) -> pd.Series:
    """Equal-weight average of all signals per decision date -> one observation per day."""
    return df.dropna(subset=[ret_col]).groupby(date_col)[ret_col].mean().sort_index()


def block_bootstrap_ci(x, stat=np.mean, block: int = 5, n_boot: int = 5000, alpha: float = 0.05,
                       seed: int = 7) -> tuple[float, float]:
    """Moving-block bootstrap: keeps short-range autocorrelation (overlapping holding periods)."""
    x = np.asarray(x, dtype=float)
    n = len(x)
    if n < block * 2:
        return (float("nan"), float("nan"))
    rng = np.random.default_rng(seed)
    n_blocks = math.ceil(n / block)
    starts = rng.integers(0, n - block + 1, size=(n_boot, n_blocks))
    idx = (starts[:, :, None] + np.arange(block)).reshape(n_boot, -1)[:, :n]
    vals = np.apply_along_axis(stat, 1, x[idx])
    return float(np.quantile(vals, alpha / 2)), float(np.quantile(vals, 1 - alpha / 2))


def holm(pvals: list[float], alpha: float = 0.05) -> list[bool]:
    m = len(pvals)
    order = np.argsort(pvals)
    reject = [False] * m
    for k, i in enumerate(order):
        if pvals[i] <= alpha / (m - k):
            reject[i] = True
        else:
            break
    return reject


def benjamini_hochberg(pvals: list[float], q: float = 0.10) -> list[bool]:
    m = len(pvals)
    order = np.argsort(pvals)
    thresh = [q * (k + 1) / m for k in range(m)]
    passed = [pvals[i] <= thresh[k] for k, i in enumerate(order)]
    kmax = max([k for k, ok in enumerate(passed) if ok], default=-1)
    reject = [False] * m
    for k, i in enumerate(order):
        reject[i] = k <= kmax
    return reject


def sharpe(x, periods_per_year: int = 252) -> float | None:
    x = np.asarray(x, dtype=float)
    if len(x) < 3 or x.std(ddof=1) == 0:
        return None
    return float(x.mean() / x.std(ddof=1) * math.sqrt(periods_per_year))


def probabilistic_sharpe(x, sr_benchmark: float = 0.0) -> float | None:
    """P(true per-period SR > benchmark), adjusting for skew and kurtosis (Bailey & LdP 2012)."""
    x = np.asarray(x, dtype=float)
    n = len(x)
    if n < 10 or x.std(ddof=1) == 0:
        return None
    sr = x.mean() / x.std(ddof=1)
    g3 = st.skew(x)
    g4 = st.kurtosis(x, fisher=False)
    denom = math.sqrt(max(1e-12, 1 - g3 * sr + (g4 - 1) / 4 * sr ** 2))
    return float(st.norm.cdf((sr - sr_benchmark) * math.sqrt(n - 1) / denom))


def expected_max_sharpe(n_trials: int, var_trials_sr: float) -> float:
    """Expected maximum per-period SR among n_trials unskilled strategies."""
    if n_trials <= 1:
        return 0.0
    z1 = st.norm.ppf(1 - 1.0 / n_trials)
    z2 = st.norm.ppf(1 - 1.0 / (n_trials * math.e))
    return math.sqrt(var_trials_sr) * ((1 - EULER) * z1 + EULER * z2)


def deflated_sharpe(x, n_trials: int, var_trials_sr: float | None = None) -> float | None:
    """PSR against the SR you would expect from the best of n_trials pure-noise strategies.
    var_trials_sr: variance of per-period SRs across trials; defaults to 1/n (noise-only)."""
    x = np.asarray(x, dtype=float)
    if len(x) < 10:
        return None
    v = var_trials_sr if var_trials_sr is not None else 1.0 / len(x)
    return probabilistic_sharpe(x, expected_max_sharpe(n_trials, v))


def min_detectable_effect(sd: float, n: int, alpha: float = 0.05, power: float = 0.8) -> float:
    """Smallest true mean return a two-sided test detects with the given power."""
    return (st.norm.ppf(1 - alpha / 2) + st.norm.ppf(power)) * sd / math.sqrt(n)


def required_n(effect: float, sd: float, alpha: float = 0.05, power: float = 0.8) -> int:
    return math.ceil(((st.norm.ppf(1 - alpha / 2) + st.norm.ppf(power)) * sd / effect) ** 2)


def ic(scores, fwd_returns) -> float | None:
    """Information coefficient: Spearman rank correlation of score vs forward return."""
    df = pd.DataFrame({"s": scores, "r": fwd_returns}).dropna()
    if len(df) < 10:
        return None
    return float(st.spearmanr(df["s"], df["r"]).statistic)


def brier(prob_up, went_up) -> float | None:
    df = pd.DataFrame({"p": prob_up, "y": went_up}).dropna()
    if df.empty:
        return None
    return float(((df["p"] - df["y"].astype(float)) ** 2).mean())


def factor_regression(daily_ret: pd.Series, factors: pd.DataFrame) -> dict:
    """OLS of daily excess returns on FF5 + momentum. Alpha that survives = not just a known factor."""
    df = pd.concat([daily_ret.rename("r"), factors], axis=1, join="inner").dropna()
    if len(df) < 30:
        return {"n": len(df)}
    y = df["r"] - df.get("rf", 0)
    X = np.column_stack([np.ones(len(df))] + [df[c] for c in ("mkt_rf", "smb", "hml", "rmw", "cma", "mom") if c in df])
    beta, *_ = np.linalg.lstsq(X, y.values, rcond=None)
    resid = y.values - X @ beta
    dof = len(df) - X.shape[1]
    s2 = resid @ resid / dof
    cov = s2 * np.linalg.inv(X.T @ X)
    t_alpha = beta[0] / math.sqrt(cov[0, 0])
    return {"n": len(df), "alpha_daily": float(beta[0]), "alpha_ann": float(beta[0] * 252),
            "t_alpha": float(t_alpha), "p_alpha": float(2 * st.t.sf(abs(t_alpha), dof)),
            "betas": [float(b) for b in beta[1:]]}


def log_test(con, hyp_id: str, split: str, variant: str, metric: str, result: dict, code_commit: str | None = None,
             notes: str = "") -> int:
    """Every look counts. Call this for every evaluation you run, including failed variants."""
    if split == "holdout":
        from ..governance import assert_holdout_unlocked
        assert_holdout_unlocked(hyp_id)
    cur = con.execute(
        "INSERT INTO test_log(hyp_id, split, variant, run_at, code_commit, n_events, n_days, metric, estimate, t_stat, "
        "p_value, sharpe, notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (hyp_id, split, variant, now_iso(), code_commit, result.get("n_events"), result.get("n"), metric,
         result.get("mean"), result.get("t"), result.get("p"), result.get("sharpe"), notes))
    return cur.lastrowid


def n_looks(con, hyp_id: str | None = None) -> int:
    if hyp_id:
        return con.execute("SELECT COUNT(*) FROM test_log WHERE hyp_id=?", (hyp_id,)).fetchone()[0]
    return con.execute("SELECT COUNT(*) FROM test_log").fetchone()[0]
