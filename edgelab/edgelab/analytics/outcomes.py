"""Signal outcomes at fixed horizons, for EVERY signal (traded or not).

Reference price = the official open on decision_date (the first tradable open after the
information became public). Horizons:
  gap       previous close -> entry open      (the move we could NOT capture; how priced-in was it)
  5m..4h    entry open -> minute bar close N minutes later (needs minute bars)
  0d_close  entry open -> same-day close
  Nd        entry open -> open N trading days later
All returns are signed by direction, so positive = the signal was right.
"""
from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from ..db import tx, upsert
from ..marketdata import adjusted_panel
from ..timeutil import next_trading_day, now_iso, parse_ts, prev_trading_day, session_bounds, trading_days

log = logging.getLogger(__name__)


def choose_peers(con, settings, signal) -> tuple[list[str], str]:
    """Matched peers from the universe snapshot BEFORE the decision: same 2-digit SIC when known,
    nearest in log liquidity and volatility, excluding names with their own signal from the
    same strategy within +-5 trading days."""
    n = settings["outcomes"]["n_peers"]
    snap_date = con.execute("SELECT MAX(snap_date) FROM universe_snapshots WHERE snap_date<?",
                            (signal["decision_date"],)).fetchone()[0]
    if snap_date is None:
        return [], "none"
    u = pd.read_sql_query(
        "SELECT u.symbol, u.adv20_usd, u.vol20, i.sic FROM universe_snapshots u LEFT JOIN instruments i "
        "ON i.symbol=u.symbol WHERE u.snap_date=? AND u.in_universe=1", con, params=(snap_date,))
    lo = prev_trading_day(signal["decision_date"], 5)
    hi = next_trading_day(signal["decision_date"], 5)
    busy = {r[0] for r in con.execute("SELECT symbol FROM signals WHERE strategy_id=? AND decision_date BETWEEN ? AND ?",
                                      (signal["strategy_id"], lo, hi))}
    u = u[~u["symbol"].isin(busy | {signal["symbol"], "SPY"})].dropna(subset=["adv20_usd", "vol20"])
    me = con.execute("SELECT sic FROM instruments WHERE symbol=?", (signal["symbol"],)).fetchone()
    my_sic = me["sic"] if me else None
    method = "liq_vol"
    if my_sic:
        same = u[(u["sic"] // 100) == (my_sic // 100)]
        if len(same) >= n:
            u, method = same, "sic2_liq_vol"
    if u.empty or not signal["adv20_usd"] or not signal["pre_vol20"]:
        return [], "none"
    dist = np.sqrt((np.log(u["adv20_usd"]) - np.log(signal["adv20_usd"])) ** 2
                   + ((u["vol20"] - signal["pre_vol20"]) / max(signal["pre_vol20"], 1e-6)) ** 2)
    u = u.assign(d=dist).nsmallest(n, "d")
    with tx(con):
        upsert(con, "signal_peers", [{"signal_id": signal["signal_id"], "peer_symbol": s, "match_distance": float(d),
                                      "method": method} for s, d in zip(u["symbol"], u["d"])],
               ["signal_id", "peer_symbol"])
    return list(u["symbol"]), method


def _window_ret(opens, closes, sym, start_kind, start_date, end_kind, end_date) -> float | None:
    try:
        a = (opens if start_kind == "open" else closes).loc[start_date, sym]
        b = (opens if end_kind == "open" else closes).loc[end_date, sym]
    except KeyError:
        return None
    if a is None or b is None or np.isnan(a) or np.isnan(b) or a == 0:
        return None
    return float(b / a - 1)


def compute_signal_outcomes(con, settings, signal, as_of: str) -> int:
    """Fill every horizon whose window has fully elapsed by as_of. Idempotent."""
    o = settings["outcomes"]
    d0 = signal["decision_date"]
    if d0 > as_of:
        return 0
    have = {r[0] for r in con.execute("SELECT horizon FROM signal_outcomes WHERE signal_id=?", (signal["signal_id"],))}
    max_h = max(o["daily_horizons_days"].values())
    days_after = trading_days(d0, pd.Timestamp(d0) + pd.Timedelta(days=int(max_h * 1.6) + 10))
    matured = {"gap", "0d_close"} | {h for h, n in o["daily_horizons_days"].items()
                                       if n < len(days_after) and days_after[n] <= as_of}
    has_minute = d0 < as_of and con.execute("SELECT 1 FROM bars_minute WHERE symbol=? AND substr(bar_ts,1,10)=? LIMIT 1",
                                            (signal["symbol"], d0)).fetchone()
    if not (matured - have) and not (has_minute and set(o["intraday_horizons_min"]) - have):
        return 0
    peers = [r[0] for r in con.execute("SELECT peer_symbol FROM signal_peers WHERE signal_id=?", (signal["signal_id"],))]
    if not peers:
        peers, _ = choose_peers(con, settings, signal)
    end_needed = min(days_after[min(max_h, len(days_after) - 1)], as_of)
    start = prev_trading_day(d0)
    syms = [signal["symbol"], "SPY"] + peers
    opens = adjusted_panel(con, syms, start, end_needed, "open")
    closes = adjusted_panel(con, syms, start, end_needed, "close")
    if opens.empty or signal["symbol"] not in opens:
        return 0
    windows = {"gap": ("close", start, "open", d0), "0d_close": ("open", d0, "close", d0)}
    for h, n in o["daily_horizons_days"].items():
        if n < len(days_after):
            windows[h] = ("open", d0, "open", days_after[n])
    sgn = signal["direction"]
    beta = signal["pre_beta"] if signal["pre_beta"] is not None else 1.0
    rows = []
    for h, (sk, sd, ek, ed) in windows.items():
        if h in have or ed > as_of:
            continue
        r = _window_ret(opens, closes, signal["symbol"], sk, sd, ek, ed)
        if r is None:
            continue
        m = _window_ret(opens, closes, "SPY", sk, sd, ek, ed)
        pr = [x for x in (_window_ret(opens, closes, p, sk, sd, ek, ed) for p in peers if p in opens) if x is not None]
        peer = float(np.mean(pr)) if pr else None
        rows.append({"signal_id": signal["signal_id"], "horizon": h, "ret": sgn * r,
                     "mkt_ret": m, "beta_adj_ret": sgn * (r - beta * m) if m is not None else None,
                     "peer_ret": peer, "peer_resid_ret": sgn * (r - peer) if peer is not None else None,
                     "n_peers": len(pr), "data_source": "daily_adj", "computed_at": now_iso()})
    rows += _intraday_outcomes(con, settings, signal, have, as_of, beta)
    with tx(con):
        return upsert(con, "signal_outcomes", rows, ["signal_id", "horizon"])


def _intraday_outcomes(con, settings, signal, have, as_of, beta) -> list[dict]:
    hz = {h: m for h, m in settings["outcomes"]["intraday_horizons_min"].items() if h not in have}
    if not hz or signal["decision_date"] >= as_of:
        return []
    open_, _ = session_bounds(signal["decision_date"])
    out = []
    bars = pd.read_sql_query(
        "SELECT symbol, bar_ts, open, close FROM bars_minute WHERE symbol IN (?, 'SPY') AND bar_ts>=? AND bar_ts<=?",
        con, params=(signal["symbol"], open_.strftime("%Y-%m-%dT%H:%M:%SZ"),
                     (open_ + pd.Timedelta(minutes=max(hz.values()) + 1)).strftime("%Y-%m-%dT%H:%M:%SZ")))
    if bars.empty:
        return []
    bars["t"] = bars["bar_ts"].map(parse_ts)

    def px_at(sym, minutes):
        b = bars[bars["symbol"] == sym]
        if b.empty:
            return None, None
        first = b.iloc[0]["open"]
        target = open_ + pd.Timedelta(minutes=minutes)
        upto = b[b["t"] < target]
        return first, (upto.iloc[-1]["close"] if len(upto) else None)

    for h, mins in hz.items():
        a, b = px_at(signal["symbol"], mins)
        ma, mb = px_at("SPY", mins)
        if not a or not b:
            continue
        r = b / a - 1
        m = (mb / ma - 1) if ma and mb else None
        out.append({"signal_id": signal["signal_id"], "horizon": h, "ret": signal["direction"] * r, "mkt_ret": m,
                    "beta_adj_ret": signal["direction"] * (r - beta * m) if m is not None else None,
                    "peer_ret": None, "peer_resid_ret": None, "n_peers": 0, "data_source": "minute",
                    "computed_at": now_iso()})
    return out


def update_all(con, settings, as_of: str) -> int:
    n_h = len(settings["outcomes"]["daily_horizons_days"]) + 2 + len(settings["outcomes"]["intraday_horizons_min"])
    sigs = con.execute(
        "SELECT s.* FROM signals s LEFT JOIN (SELECT signal_id, COUNT(*) c FROM signal_outcomes GROUP BY signal_id) o "
        "ON o.signal_id=s.signal_id WHERE s.decision_date<=? AND COALESCE(o.c,0) < ? "
        "AND s.decision_date >= date(?, '-120 days')", (as_of, n_h, as_of)).fetchall()
    total = 0
    for s in sigs:
        try:
            total += compute_signal_outcomes(con, settings, s, as_of)
        except Exception as exc:
            log.warning("outcome failed %s: %s", s["signal_id"], exc)
    return total
