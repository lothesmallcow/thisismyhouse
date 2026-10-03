from edgelab.db import upsert
from edgelab.marketdata import daily_returns


def _bar(sym, d, c):
    return {"symbol": sym, "bar_date": d, "open": c, "high": c, "low": c, "close": c, "volume": 1e6, "vwap": c,
            "trade_count": 1, "adjustment": "raw", "source": "t", "ingested_at": "x"}


def test_split_is_not_a_crash(con):
    upsert(con, "bars_daily", [_bar("X", "2026-01-05", 100), _bar("X", "2026-01-06", 101), _bar("X", "2026-01-07", 51)],
           ["symbol", "bar_date", "adjustment"])
    upsert(con, "corporate_actions", [{"symbol": "X", "ex_date": "2026-01-07", "action": "split", "ratio": 2.0,
                                       "amount": None, "detail": "", "ingested_at": "x"}], ["symbol", "ex_date", "action"])
    r = daily_returns(con, ["X"], "2026-01-05", "2026-01-07")["X"]
    assert abs(r.loc["2026-01-07"] - (51 / 50.5 - 1)) < 1e-9


def test_dividend_total_return(con):
    upsert(con, "bars_daily", [_bar("Y", "2026-01-05", 100), _bar("Y", "2026-01-06", 99)],
           ["symbol", "bar_date", "adjustment"])
    upsert(con, "corporate_actions", [{"symbol": "Y", "ex_date": "2026-01-06", "action": "dividend", "ratio": None,
                                       "amount": 1.0, "detail": "", "ingested_at": "x"}], ["symbol", "ex_date", "action"])
    r = daily_returns(con, ["Y"], "2026-01-05", "2026-01-06")["Y"]
    assert abs(r.loc["2026-01-06"]) < 1e-9   # price fell by exactly the dividend: total return 0
