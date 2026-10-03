"""edgelab command line. Every scheduled job is one subcommand wrapped in run_job()."""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from . import alerts, health
from .config import load_settings
from .db import connect, init_db
from .ops import run_job
from .timeutil import ET, et_date, is_trading_day, now_iso, prev_trading_day, trading_days

log = logging.getLogger("edgelab")


def _open(settings):
    con = connect(settings.db_path)
    init_db(con)
    return con


def cmd_init(a, s):
    con = _open(s)
    from .executor.engine import ensure_accounts
    ensure_accounts(con, s)
    print(f"db ready at {s.db_path}")


def cmd_collect(a, s):
    con = _open(s)
    from .collectors import alpaca_data, edgar, macro
    src = a.source
    job = f"collect_{src}"
    with run_job(con, s, job) as r:
        if src == "filings":
            r.rows = edgar.poll_current(con, s)
            r.rows += edgar.enrich_filings(con, s)
        elif src == "texts":
            r.rows = edgar.fetch_texts(con, s)
        elif src == "edgar_reconcile":
            day = a.date or prev_trading_day(et_date())
            res = edgar.reconcile_day(con, s, day)
            r.rows, r.detail = res["missed"], json.dumps(res)
        elif src == "tickers":
            r.rows = edgar.refresh_tickers(con, s)
        elif src == "sic":
            r.rows = refresh_sic(con, s, limit=a.limit or 800)
        elif src == "assets":
            r.rows = alpaca_data.refresh_assets(con, s)
        elif src == "news":
            r.rows = alpaca_data.fetch_news(con, s)
        elif src == "factors":
            r.rows = macro.update_factors(con)
        else:
            raise SystemExit(f"unknown source {src}")
    print(f"{job}: {r.rows} rows")


def refresh_sic(con, s, limit: int) -> int:
    from .collectors import edgar
    sess = edgar.session(s)
    ciks = [x[0] for x in con.execute("SELECT DISTINCT cik FROM instruments WHERE cik IS NOT NULL AND sic IS NULL LIMIT ?",
                                      (limit,))]
    n = 0
    for cik in ciks:
        try:
            js = sess.get(edgar.SUBMISSIONS_URL.format(cik=cik)).json()
        except Exception:
            continue
        sic = js.get("sic")
        con.execute("UPDATE instruments SET sic=?, sic_desc=? WHERE cik=?",
                    (int(sic) if sic else -1, js.get("sicDescription"), cik))
        n += 1
    return n


def _symbols_for_bars(con) -> list[str]:
    return [r[0] for r in con.execute(
        "SELECT symbol FROM instruments WHERE status='active' AND exchange IN ('NYSE','NASDAQ','AMEX','ARCA','BATS') "
        "ORDER BY symbol")]


def nightly(con, s, day: str) -> dict:
    """After-close pipeline for trading date `day`. Each step is its own job so one failure is
    visible without hiding the rest."""
    from .analytics import outcomes
    from .collectors import alpaca_data, macro
    from .executor import engine
    from .reports import daily
    from .universe import compute_regime, snapshot_universe
    out = {}
    steps = [
        ("bars", lambda: alpaca_data.fetch_daily_bars(con, s, _symbols_for_bars(con), prev_trading_day(day, 3), day)),
        ("corp_actions", lambda: alpaca_data.fetch_corporate_actions(con, s, prev_trading_day(day, 5), day)),
        ("reconcile", lambda: engine.reconcile(con, s, day)),
        ("mark", lambda: engine.mark(con, s, day)),
        ("universe", lambda: snapshot_universe(con, s, day)),
        ("regime", lambda: compute_regime(con, day, macro.update_vix(con))),
        ("minute_bars", lambda: _minute_bars_for_signals(con, s, day)),
        ("outcomes", lambda: outcomes.update_all(con, s, day)),
        ("report", lambda: str(daily.write(con, s, day))),
    ]
    failed = []
    for name, fn in steps:
        try:
            with run_job(con, s, f"nightly_{name}") as r:
                res = fn()
                r.detail = str(res)[:500]
                r.rows = res if isinstance(res, int) else 0
            out[name] = res
        except Exception as exc:
            failed.append(name)
            out[name] = f"ERROR {exc}"
    with run_job(con, s, "nightly", alert_on_error=False) as r:
        r.detail = json.dumps({"failed": failed})
        if failed:
            r.skipped = True
    return out


def _minute_bars_for_signals(con, s, day: str) -> int:
    from .collectors import alpaca_data
    from .timeutil import session_bounds
    syms = [r[0] for r in con.execute("SELECT DISTINCT symbol FROM signals WHERE decision_date=?", (day,))]
    if not syms:
        return 0
    o, c = session_bounds(day)
    n = 0
    for sym in syms + ["SPY"]:
        n += alpaca_data.fetch_minute_bars(con, s, sym, o.strftime("%Y-%m-%dT%H:%M:%SZ"), c.strftime("%Y-%m-%dT%H:%M:%SZ"))
    return n


def cmd_nightly(a, s):
    con = _open(s)
    day = a.date or et_date()
    if not is_trading_day(day):
        print(f"{day} is not a trading day; nothing to do")
        return
    print(json.dumps(nightly(con, s, day), indent=2, default=str))


def cmd_decide(a, s):
    con = _open(s)
    from .executor import engine
    day = a.date or et_date()
    if not is_trading_day(day):
        print(f"{day} not a trading day")
        return
    with run_job(con, s, "decide") as r:
        res = engine.decide(con, s, day)
        r.detail = json.dumps(res)[:4000]
    print(json.dumps(res, indent=2))


def cmd_health(a, s):
    con = _open(s)
    problems = health.run(con, s)
    print("OK" if not problems else "\n".join(problems))
    sys.exit(1 if problems else 0)


def cmd_kill(a, s):
    con = _open(s)
    from .executor.engine import set_kill
    set_kill(con, s, a.reason, a.account)
    print("kill switch set")


def cmd_unkill(a, s):
    con = _open(s)
    from .executor.engine import kill_file
    if a.account:
        con.execute("DELETE FROM meta WHERE key=?", (f"kill:{a.account}",))
    elif kill_file(s).exists():
        kill_file(s).unlink()
    con.execute("INSERT INTO risk_events(ts, account_id, kind, detail) VALUES(?,?,?,?)",
                (now_iso(), a.account, "kill_switch", f"cleared: {a.reason}"))
    print("kill switch cleared")


def cmd_register(a, s):
    con = _open(s)
    from .governance import register
    print(json.dumps(register(con, a.path), indent=2))


def cmd_report(a, s):
    con = _open(s)
    from .reports import daily
    print(daily.write(con, s, a.date or et_date()))


def cmd_backfill(a, s):
    con = _open(s)
    from .collectors import alpaca_data, edgar
    if a.what == "bars":
        syms = _symbols_for_bars(con) if not a.symbols else a.symbols.split(",")
        with run_job(con, s, "backfill_bars") as r:
            r.rows = alpaca_data.fetch_daily_bars(con, s, syms, a.start, a.end or et_date())
        with run_job(con, s, "backfill_corp_actions") as r:
            r.rows = alpaca_data.fetch_corporate_actions(con, s, a.start, a.end or et_date())
    elif a.what == "edgar_index":
        y0, y1 = int(a.start[:4]), int((a.end or et_date())[:4])
        for y in range(y0, y1 + 1):
            for q in range(1, 5):
                with run_job(con, s, "backfill_edgar_index", alert_on_error=False) as r:
                    r.rows = edgar.backfill_quarter_index(con, s, y, q)
                    print(y, q, r.rows)
    elif a.what == "universe":
        from .universe import snapshot_universe
        for d in trading_days(a.start, a.end or et_date()):
            snapshot_universe(con, s, d)
    print("done")


def cmd_smoke(a, s):
    from .smoke import run_smoke
    ok = run_smoke(_open(s), s)
    sys.exit(0 if ok else 1)


def cmd_fake_e2e(a, s):
    from .e2e import run_fake_e2e
    res = run_fake_e2e(Path(a.dir) if a.dir else None)
    print(json.dumps(res, indent=2, default=str))


def cmd_alert_test(a, s):
    ok1 = alerts.notify(s, "edgelab test alert", "If you see this on your phone, ntfy works.", tags="white_check_mark")
    ok2 = alerts.hc_ping(s, "", "alert test")
    print(f"ntfy: {'sent' if ok1 else 'NOT configured/failed'} | healthchecks: {'pinged' if ok2 else 'NOT configured/failed'}")


def cmd_export(a, s):
    """CSV exports for the scheduled Claude reviewers (they read GitHub, not this VPS)."""
    import pandas as pd
    con = _open(s)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    q = {
        "trades": "SELECT * FROM trades",
        "equity_daily": "SELECT * FROM equity_daily",
        "signals_outcomes": "SELECT s.signal_id, s.strategy_id, s.symbol, s.event_kind, s.event_ref, s.info_ts, "
                            "s.decision_date, s.direction, s.traded, s.not_traded_reason, s.pre_beta, s.pre_vol20, "
                            "s.size_bucket, s.time_of_day, o.horizon, o.ret, o.mkt_ret, o.beta_adj_ret, o.peer_ret, "
                            "o.peer_resid_ret, o.n_peers FROM signals s LEFT JOIN signal_outcomes o USING(signal_id) "
                            "WHERE s.decision_date >= date('now','-400 days')",
        "regime_daily": "SELECT * FROM regime_daily WHERE r_date >= date('now','-400 days')",
        "hypotheses": "SELECT * FROM hypotheses",
        "test_log": "SELECT * FROM test_log",
        "job_runs_7d": "SELECT job, status, started_at, finished_at, rows_written, substr(detail,1,300) detail "
                       "FROM job_runs WHERE started_at >= datetime('now','-7 days')",
        "data_gaps": "SELECT * FROM data_gaps",
        "risk_events": "SELECT * FROM risk_events",
        "hs_trade_reviews": "SELECT * FROM hs_trade_reviews",
    }
    for name, sql in q.items():
        pd.read_sql_query(sql, con).to_csv(out / f"{name}.csv", index=False)
    print(f"exported {len(q)} tables to {out}")


def cmd_import_reviews(a, s):
    """Load tags written by the Claude daily reviewer (JOURNAL/reviews/*.csv) into hs_trade_reviews."""
    import pandas as pd
    from .config import PROJECT_ROOT
    from .db import upsert
    con = _open(s)
    allowed = {"market_driven", "sector_driven", "signal_consistent", "cost_driven", "execution_problem", "unexplained"}
    n = 0
    for f in sorted((PROJECT_ROOT / "JOURNAL" / "reviews").glob("*.csv")):
        df = pd.read_csv(f)
        bad = set(df["tag"]) - allowed
        if bad:
            print(f"skip {f.name}: unknown tags {bad}")
            continue
        rows = [{"trade_id": r.trade_id, "review_date": r.review_date, "tag": r.tag,
                 "noise": None if pd.isna(r.noise) else int(r.noise),
                 "vol_rel_move": None if pd.isna(r.vol_rel_move) else float(r.vol_rel_move),
                 "comment": str(r.comment)[:1000], "reviewer": r.reviewer, "created_at": now_iso()}
                for r in df.itertuples()]
        n += upsert(con, "hs_trade_reviews", rows, ["trade_id", "review_date", "reviewer"])
    print(f"imported {n} reviews")


def main(argv=None):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(prog="edgelab")
    p.add_argument("--settings")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init").set_defaults(fn=cmd_init)
    c = sub.add_parser("collect"); c.add_argument("source"); c.add_argument("--date"); c.add_argument("--limit", type=int)
    c.set_defaults(fn=cmd_collect)
    n = sub.add_parser("nightly"); n.add_argument("--date"); n.set_defaults(fn=cmd_nightly)
    d = sub.add_parser("decide"); d.add_argument("--date"); d.set_defaults(fn=cmd_decide)
    sub.add_parser("health").set_defaults(fn=cmd_health)
    k = sub.add_parser("kill"); k.add_argument("--reason", required=True); k.add_argument("--account")
    k.set_defaults(fn=cmd_kill)
    u = sub.add_parser("unkill"); u.add_argument("--reason", required=True); u.add_argument("--account")
    u.set_defaults(fn=cmd_unkill)
    r = sub.add_parser("register"); r.add_argument("path"); r.set_defaults(fn=cmd_register)
    rp = sub.add_parser("report"); rp.add_argument("--date"); rp.set_defaults(fn=cmd_report)
    b = sub.add_parser("backfill"); b.add_argument("what", choices=["bars", "edgar_index", "universe"])
    b.add_argument("--start", required=True); b.add_argument("--end"); b.add_argument("--symbols")
    b.set_defaults(fn=cmd_backfill)
    sub.add_parser("smoke").set_defaults(fn=cmd_smoke)
    sub.add_parser("alert-test").set_defaults(fn=cmd_alert_test)
    ex = sub.add_parser("export"); ex.add_argument("--out", required=True); ex.set_defaults(fn=cmd_export)
    sub.add_parser("import-reviews").set_defaults(fn=cmd_import_reviews)
    f = sub.add_parser("fake-e2e"); f.add_argument("--dir"); f.set_defaults(fn=cmd_fake_e2e)
    a = p.parse_args(argv)
    s = load_settings(a.settings)
    a.fn(a, s)


if __name__ == "__main__":
    main()
