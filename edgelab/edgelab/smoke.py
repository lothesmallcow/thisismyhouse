"""Live smoke test, run once on the VPS after setup (and after any provider change).

Checks every external dependency for real and measures facts we refuse to assume, e.g. which
clock EDGAR's acceptanceDateTime is written in. Prints PASS/FAIL per check.
"""
from __future__ import annotations

import os
import traceback
from datetime import timedelta

from . import alerts
from .timeutil import et_date, iso, now_iso, parse_ts, prev_trading_day, utcnow


def _check(name, fn, results):
    try:
        detail = fn()
        results.append((name, True, detail))
        print(f"PASS  {name}: {detail}")
    except Exception as exc:
        results.append((name, False, str(exc)))
        print(f"FAIL  {name}: {exc}")
        if os.environ.get("EDGELAB_DEBUG"):
            traceback.print_exc()


def run_smoke(con, s) -> bool:
    from .collectors import alpaca_data, edgar, macro
    results: list = []
    sess = None

    def sec_ua():
        nonlocal sess
        sess = edgar.session(s)
        return os.environ.get(s["sec"]["user_agent_env"])

    def sec_feed():
        xml = sess.get(edgar.CURRENT_URL.format(form="8-K", start=0)).text
        stubs = edgar.parse_atom(xml)
        if not stubs:
            raise RuntimeError("Atom feed parsed to zero 8-K entries")
        return f"{len(stubs)} entries, newest {stubs[0]['accession']} accepted {stubs[0]['accepted_ts']}"

    def sec_acceptance_tz():
        stubs = [x for x in edgar.parse_atom(sess.get(edgar.CURRENT_URL.format(form="8-K", start=0)).text)
                 if x["accepted_ts"]][:5]
        votes = {"ET": 0, "UTC": 0}
        for st in stubs:
            js = sess.get(edgar.SUBMISSIONS_URL.format(cik=st["cik"])).json()
            for tz in ("ET", "UTC"):
                m = edgar.parse_submissions_recent(js, tz).get(st["accession"])
                if m and m["accepted_ts"] and abs((parse_ts(m["accepted_ts"]) - parse_ts(st["accepted_ts"])).total_seconds()) < 120:
                    votes[tz] += 1
        winner = max(votes, key=votes.get)
        if votes[winner] == 0:
            raise RuntimeError(f"could not match submissions JSON to feed times: {votes}")
        con.execute("INSERT INTO meta(key,value) VALUES('sec_acceptance_tz',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (winner,))
        return f"acceptanceDateTime clock = {winner} (votes {votes}); stored in meta"

    def sec_daily_index():
        day = prev_trading_day(et_date())
        y, m, _ = day.split("-")
        q = (int(m) - 1) // 3 + 1
        rows = edgar.parse_daily_index(sess.get(edgar.DAILY_INDEX_URL.format(y=y, q=q, ymd=day.replace("-", ""))).text)
        if not rows:
            raise RuntimeError("daily index parsed to zero rows")
        return f"{day}: {len(rows)} filings in index"

    def alpaca_bars():
        from alpaca.data.enums import DataFeed
        from alpaca.data.requests import StockBarsRequest
        from alpaca.data.timeframe import TimeFrame
        dc = alpaca_data.data_client(s)
        end = utcnow() - timedelta(minutes=20)
        bs = dc.get_stock_bars(StockBarsRequest(symbol_or_symbols=["SPY", "AAPL"], timeframe=TimeFrame.Day,
                                                start=end - timedelta(days=10), end=end,
                                                feed=DataFeed(s["alpaca"]["data_feed"])))
        n = sum(len(v) for v in bs.data.values())
        if n == 0:
            raise RuntimeError("no bars returned")
        return f"{n} daily bars via feed={s['alpaca']['data_feed']} (SIP on free plan works if this passes)"

    def alpaca_minute_history():
        from alpaca.data.enums import DataFeed
        from alpaca.data.requests import StockBarsRequest
        from alpaca.data.timeframe import TimeFrame
        dc = alpaca_data.data_client(s)
        end = utcnow() - timedelta(days=3)
        bs = dc.get_stock_bars(StockBarsRequest(symbol_or_symbols="SPY", timeframe=TimeFrame.Minute,
                                                start=end - timedelta(days=2), end=end,
                                                feed=DataFeed(s["alpaca"]["data_feed"])))
        return f"{len(bs.data.get('SPY', []))} SPY minute bars"

    def alpaca_news():
        from alpaca.data.historical.news import NewsClient
        from alpaca.data.requests import NewsRequest
        nc = NewsClient(*alpaca_data._keys(s))
        res = nc.get_news(NewsRequest(symbols="AAPL", start=utcnow() - timedelta(days=7), limit=5))
        items = res.data.get("news", [])
        return f"{len(items)} AAPL news items last 7d, e.g. '{items[0].headline[:60]}'" if items else "0 items (check)"

    def alpaca_paper_account():
        tc = alpaca_data.trading_client(s)
        acct = tc.get_account()
        clock = tc.get_clock()
        return f"paper account status={acct.status} equity={acct.equity}; market open={clock.is_open}"

    def factors():
        n = macro.update_factors(con)
        last = con.execute("SELECT MAX(f_date) FROM factors_daily").fetchone()[0]
        return f"{n} factor rows, latest {last} (Ken French lags by ~1-2 months; normal)"

    def vix():
        v = macro.update_vix(con)
        return f"{len(v)} VIX closes, latest {max(v)}"

    def ntfy():
        if not alerts.notify(s, "edgelab smoke test", "ntfy works. You can ignore this."):
            raise RuntimeError("ntfy not configured or failed")
        return "sent; check your phone"

    def healthchecks():
        if not alerts.hc_ping(s, "", "smoke"):
            raise RuntimeError("EDGELAB_HC_URL not configured or unreachable")
        return "pinged"

    for name, fn in [("SEC user agent", sec_ua), ("SEC latest-filings feed", sec_feed),
                     ("SEC acceptance clock", sec_acceptance_tz), ("SEC daily index", sec_daily_index),
                     ("Alpaca daily bars", alpaca_bars), ("Alpaca minute history", alpaca_minute_history),
                     ("Alpaca news", alpaca_news), ("Alpaca paper account", alpaca_paper_account),
                     ("Ken French factors", factors), ("FRED VIX", vix), ("ntfy push", ntfy),
                     ("healthchecks.io", healthchecks)]:
        if sess is None and name.startswith("SEC") and name != "SEC user agent":
            results.append((name, False, "skipped: no SEC session"))
            print(f"SKIP  {name}")
            continue
        _check(name, fn, results)
    ok = all(r[1] for r in results)
    print("\nSMOKE:", "ALL PASS" if ok else f"{sum(not r[1] for r in results)} FAILED")
    con.execute("INSERT INTO job_runs(job, started_at, finished_at, status, detail) VALUES('smoke',?,?,?,?)",
                (now_iso(), now_iso(), "ok" if ok else "error", "; ".join(f"{n}={'ok' if p else d}" for n, p, d in results)[:4000]))
    return ok
