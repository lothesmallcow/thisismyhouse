"""Point-in-time universe snapshots and daily regime tags."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .db import tx, upsert
from .marketdata import adjusted_panel, raw_panel, size_bucket
from .timeutil import now_iso, trading_days


def snapshot_universe(con, settings, snap_date: str) -> int:
    """Liquidity/price filter as of snap_date, using only bars up to snap_date."""
    u = settings["universe"]
    days = trading_days(pd.Timestamp(snap_date) - pd.Timedelta(days=45), snap_date)[-21:]
    if len(days) < 2:
        return 0
    start = days[0]
    allowed = tuple(u["exchanges"])
    syms = [r[0] for r in con.execute(
        f"SELECT symbol FROM instruments WHERE (exchange IS NULL OR exchange IN ({','.join('?' for _ in allowed)}))",
        allowed)]
    close = raw_panel(con, syms, start, snap_date, "close")
    if close.empty or snap_date not in close.index:
        return 0
    vol = raw_panel(con, syms, start, snap_date, "volume")
    adj = adjusted_panel(con, syms, start, snap_date)
    dollar = (close * vol).tail(20)
    adv = dollar.mean()
    vol20 = adj.pct_change(fill_method=None).tail(20).std()
    last_close = close.loc[snap_date]
    etf = {r[0] for r in con.execute("SELECT symbol FROM instruments WHERE is_etf=1")}
    rows = []
    for s in close.columns:
        c, a = last_close.get(s), adv.get(s)
        reason = None
        if c is None or np.isnan(c):
            reason = "no_bar_today"
        elif c < u["min_price"]:
            reason = "price"
        elif a is None or np.isnan(a) or a < u["min_adv20_usd"]:
            reason = "liquidity"
        elif s in etf:
            reason = "etf"
        rows.append({"snap_date": snap_date, "symbol": s,
                     "close": None if c is None or np.isnan(c) else float(c),
                     "adv20_usd": None if a is None or np.isnan(a) else float(a),
                     "vol20": None if np.isnan(vol20.get(s, np.nan)) else float(vol20[s]),
                     "size_bucket": size_bucket(a, u["size_buckets_adv_usd"]),
                     "in_universe": int(reason is None), "exclusion_reason": reason})
    with tx(con):
        return upsert(con, "universe_snapshots", rows, ["snap_date", "symbol"])


def latest_universe(con, as_of: str) -> pd.DataFrame:
    d = con.execute("SELECT MAX(snap_date) FROM universe_snapshots WHERE snap_date<=?", (as_of,)).fetchone()[0]
    if d is None:
        return pd.DataFrame()
    return pd.read_sql_query("SELECT * FROM universe_snapshots WHERE snap_date=? AND in_universe=1", con, params=(d,))


def compute_regime(con, r_date: str, vix: dict[str, float] | None = None) -> dict | None:
    days = trading_days(pd.Timestamp(r_date) - pd.Timedelta(days=420), r_date)
    spy = adjusted_panel(con, ["SPY"], days[0], r_date)
    if spy.empty or r_date not in spy.index:
        return None
    px = spy["SPY"].dropna()
    ret = px.pct_change(fill_method=None)
    rv20 = ret.rolling(20).std() * np.sqrt(252)
    vol = raw_panel(con, ["SPY"], days[0], r_date, "volume")["SPY"]
    n202 = con.execute(
        "SELECT COUNT(*) FROM filings WHERE form_type='8-K' AND items LIKE '%2.02%' AND substr(available_at,1,10)=?",
        (r_date,)).fetchone()[0]
    hist = rv20.dropna().tail(252)
    row = {
        "r_date": r_date,
        "vix_close": (vix or {}).get(r_date),
        "spy_close": float(px.iloc[-1]),
        "spy_above_200d": int(len(px) >= 200 and px.iloc[-1] > px.tail(200).mean()),
        "spy_ret_20d": float(px.iloc[-1] / px.iloc[-21] - 1) if len(px) > 21 else None,
        "spy_rv20": float(rv20.iloc[-1]) if not np.isnan(rv20.iloc[-1]) else None,
        "spy_rv20_pctile": float((hist <= hist.iloc[-1]).mean()) if len(hist) > 20 else None,
        "mkt_volume_ratio": float(vol.iloc[-1] / vol.tail(50).mean()) if len(vol) >= 50 else None,
        "earnings_8k_count": int(n202),
        "earnings_season": int(n202 >= 100),
        "day_of_week": int(pd.Timestamp(r_date).dayofweek),
        "computed_at": now_iso(),
    }
    with tx(con):
        upsert(con, "regime_daily", [row], ["r_date"])
    return row
