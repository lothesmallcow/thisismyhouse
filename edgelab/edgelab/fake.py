"""Synthetic market for the Phase 0 gate: the whole pipeline runs end to end with no network.

The synthetic world contains a planted, known effect (an 8-K item 1.01 filing is followed by
positive drift) so the analytics can be checked for detecting something that IS there, and a
2-for-1 split so return adjustment is exercised.
"""
from __future__ import annotations

import numpy as np

from .db import insert_ignore, tx, upsert
from .timeutil import ET, iso, now_iso, trading_days
from datetime import datetime, time


def build_world(con, start="2025-06-02", end="2026-09-30", n_symbols=60, seed=42) -> dict:
    rng = np.random.default_rng(seed)
    days = trading_days(start, end)
    syms = [f"S{i:03d}" for i in range(n_symbols)]
    sics = rng.choice([2834, 3674, 6022, 7372, 1311, 5812], size=n_symbols)
    with tx(con):
        upsert(con, "instruments", [{"symbol": s, "name": f"Synthetic {s}", "exchange": "NASDAQ", "asset_class": "us_equity",
                                     "cik": 1000 + i, "sic": int(sics[i]), "sic_desc": None, "is_etf": 0, "shortable": 1,
                                     "easy_to_borrow": 1, "status": "active", "first_seen_date": start,
                                     "last_seen_date": end, "updated_at": now_iso()} for i, s in enumerate(syms)]
               + [{"symbol": "SPY", "name": "SPDR S&P 500", "exchange": "ARCA", "asset_class": "us_equity", "cik": None,
                   "sic": None, "sic_desc": None, "is_etf": 1, "shortable": 1, "easy_to_borrow": 1, "status": "active",
                   "first_seen_date": start, "last_seen_date": end, "updated_at": now_iso()}], ["symbol"])
    n = len(days)
    mkt = rng.normal(0.0004, 0.01, n)
    betas = rng.uniform(0.6, 1.5, n_symbols)
    idio = rng.uniform(0.01, 0.035, n_symbols)
    # planted effect: filings of item 1.01 -> +0.4%/day drift for 5 days after the first tradable open
    drift = np.zeros((n, n_symbols))
    filings = []
    for j in range(n_symbols):
        for k in rng.choice(range(5, n - 10), size=6, replace=False):
            item = "1.01" if rng.random() < 0.5 else "8.01"
            hour = int(rng.choice([7, 12, 16, 18]))
            acc_dt = datetime.combine(datetime.fromisoformat(days[k]).date(), time(hour, 5), tzinfo=ET)
            filings.append({"accession": f"{1000 + j:010d}-26-{k:06d}", "cik": 1000 + j, "symbol": syms[j],
                            "company": f"Synthetic {syms[j]}", "form_type": "8-K", "items": item,
                            "accepted_ts": iso(acc_dt), "filed_date": days[k], "available_at": iso(acc_dt),
                            "primary_doc_url": None, "index_url": None, "text_sha256": None, "text_path": None,
                            "discovered_via": "synthetic", "ingested_at": now_iso()})
            if item == "1.01":
                first = k if hour < 9 else k + 1
                drift[first + 1:first + 6, j] += 0.004
    rows = []
    spy = 450.0
    px = rng.uniform(10, 200, n_symbols)
    for i, d in enumerate(days):
        spy_open = spy * (1 + rng.normal(0, 0.002))
        spy = spy_open * (1 + mkt[i])
        rows.append(_bar("SPY", d, spy_open, spy, rng, 8e7))
        for j, s in enumerate(syms):
            o = px[j] * (1 + rng.normal(0, idio[j] / 3))
            c = o * (1 + betas[j] * mkt[i] + rng.normal(0, idio[j]) + drift[i, j])
            px[j] = max(c, 1.0)
            rows.append(_bar(s, d, o, px[j], rng, rng.uniform(2e5, 5e6)))
    # 2-for-1 split on S001 halfway: raw prices halve from the ex-date on
    split_day = days[n // 2]
    for r in rows:
        if r["symbol"] == "S001" and r["bar_date"] >= split_day:
            for f in ("open", "high", "low", "close", "vwap"):
                r[f] /= 2
            r["volume"] *= 2
    with tx(con):
        upsert(con, "bars_daily", rows, ["symbol", "bar_date", "adjustment"])
        insert_ignore(con, "filings", filings)
        upsert(con, "corporate_actions", [{"symbol": "S001", "ex_date": split_day, "action": "split", "ratio": 2.0,
                                           "amount": None, "detail": "synthetic", "ingested_at": now_iso()}],
               ["symbol", "ex_date", "action"])
    return {"days": days, "symbols": syms, "split_day": split_day, "n_filings": len(filings)}


def _bar(sym, d, o, c, rng, vol):
    hi = max(o, c) * (1 + abs(rng.normal(0, 0.004)))
    lo = min(o, c) * (1 - abs(rng.normal(0, 0.004)))
    return {"symbol": sym, "bar_date": d, "open": float(o), "high": float(hi), "low": float(lo), "close": float(c),
            "volume": float(vol), "vwap": float((o + c) / 2), "trade_count": 1000, "adjustment": "raw",
            "source": "synthetic", "ingested_at": now_iso()}
