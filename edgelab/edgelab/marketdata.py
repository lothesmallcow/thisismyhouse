"""Read-side helpers over bars_daily: total-return adjusted closes, returns, liquidity.

Raw bars are stored as traded. Returns are computed on prices adjusted for splits and cash
dividends using corporate_actions, so a 2-for-1 split never shows up as a -50% return.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def raw_panel(con, symbols: list[str] | None, start: str, end: str, field: str = "close") -> pd.DataFrame:
    q = f"SELECT symbol, bar_date, {field} AS v FROM bars_daily WHERE adjustment='raw' AND bar_date BETWEEN ? AND ?"
    params: list = [start, end]
    if symbols is not None:
        if not symbols:
            return pd.DataFrame()
        q += f" AND symbol IN ({','.join('?' for _ in symbols)})"
        params += list(symbols)
    df = pd.read_sql_query(q, con, params=params)
    if df.empty:
        return pd.DataFrame()
    return df.pivot(index="bar_date", columns="symbol", values="v").sort_index()


def adjustment_factors(con, closes: pd.DataFrame) -> pd.DataFrame:
    """Backward cumulative factor per (date, symbol): adjusted = raw * factor."""
    if closes.empty:
        return closes
    syms = list(closes.columns)
    ca = pd.read_sql_query(
        f"SELECT symbol, ex_date, action, ratio, amount FROM corporate_actions WHERE symbol IN ({','.join('?' for _ in syms)})",
        con, params=syms)
    f = pd.DataFrame(1.0, index=closes.index, columns=closes.columns)
    for _, a in ca.iterrows():
        s, ex = a["symbol"], a["ex_date"]
        before = closes.index < ex
        if not before.any() or ex > closes.index[-1]:
            continue
        if a["action"] == "split" and a["ratio"]:
            f.loc[before, s] *= 1.0 / a["ratio"]
        elif a["action"] == "dividend" and a["amount"]:
            prev_close = closes.loc[before, s].dropna()
            if len(prev_close) and prev_close.iloc[-1] > 0:
                f.loc[before, s] *= max(0.0, 1.0 - a["amount"] / prev_close.iloc[-1])
    return f


def adjusted_panel(con, symbols, start, end, field="close") -> pd.DataFrame:
    raw = raw_panel(con, symbols, start, end, field)
    if raw.empty:
        return raw
    closes = raw if field == "close" else raw_panel(con, symbols, start, end, "close")
    return raw * adjustment_factors(con, closes).reindex_like(raw)


def daily_returns(con, symbols, start, end) -> pd.DataFrame:
    px = adjusted_panel(con, symbols, start, end)
    return px.pct_change(fill_method=None)


def trailing_beta(asset: pd.Series, market: pd.Series, min_obs: int) -> tuple[float | None, int]:
    df = pd.concat([asset, market], axis=1).dropna()
    n = len(df)
    if n < min_obs:
        return None, n
    cov = np.cov(df.iloc[:, 0], df.iloc[:, 1])
    if cov[1, 1] == 0:
        return None, n
    return float(cov[0, 1] / cov[1, 1]), n


def size_bucket(adv_usd: float | None, buckets: dict) -> str:
    if adv_usd is None or np.isnan(adv_usd):
        return "micro"
    for name, threshold in sorted(buckets.items(), key=lambda kv: -kv[1]):
        if adv_usd >= threshold:
            return name
    return "micro"
