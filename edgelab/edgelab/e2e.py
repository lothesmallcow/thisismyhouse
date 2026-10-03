"""Phase 0 gate: run the full daily cycle on a synthetic market, no network."""
from __future__ import annotations

import tempfile
from pathlib import Path

import pandas as pd

from .analytics import outcomes
from .analytics.stats import block_bootstrap_ci, calendar_time_returns, t_test_mean
from .config import load_settings
from .db import connect, init_db
from .executor import engine
from .fake import build_world
from .ops import run_job
from .reports import daily
from .timeutil import iso, prev_trading_day, session_bounds
from .universe import compute_regime, snapshot_universe

ACCOUNTS = [
    {"account_id": "ctrl_spy", "strategy": "spy_buy_hold", "broker": "sim", "start_equity": 100000,
     "risk_overrides": {"max_position_pct": 1.0}},
    {"account_id": "ctrl_random", "strategy": "random_universe", "broker": "sim", "start_equity": 100000,
     "params": {"trades_per_day": 2, "hold_days": 5, "position_pct": 0.04}},
    {"account_id": "ctrl_event_random", "strategy": "random_event", "broker": "sim", "start_equity": 100000,
     "params": {"trades_per_day": 2, "hold_days": 5, "position_pct": 0.04, "event_forms": ["8-K"]}},
    {"account_id": "planted_101", "strategy": "filing_item", "broker": "sim", "start_equity": 100000,
     "params": {"forms": ["8-K"], "item": "1.01", "direction": 1, "hold_days": 5, "position_pct": 0.04}},
]


def run_fake_e2e(workdir: Path | None = None, n_days: int = 120, seed: int = 42) -> dict:
    workdir = Path(workdir or tempfile.mkdtemp(prefix="edgelab_e2e_"))
    s = load_settings(overrides={"project": {"data_dir": str(workdir)}, "accounts": ACCOUNTS,
                                 "risk": {"max_open_positions": 40}})
    con = connect(s.db_path)
    init_db(con)
    world = build_world(con, seed=seed)
    with run_job(con, s, "collect_filings") as r:     # pretend the live collector is healthy
        r.detail = "synthetic"
    days = world["days"][-n_days:]
    # warm-up snapshots so the first decision has a universe
    snapshot_universe(con, s, prev_trading_day(days[0]))
    for d in days:
        prev = prev_trading_day(d)
        compute_regime(con, prev)
        open_, _ = session_bounds(d)
        engine.decide(con, s, d, decision_ts=iso(open_ - pd.Timedelta(minutes=15)))
        engine.reconcile(con, s, d)
        engine.mark(con, s, d)
        snapshot_universe(con, s, d)
        outcomes.update_all(con, s, d)
    rep_path = daily.write(con, s, days[-1], out_dir=workdir / "reports")
    return {"workdir": str(workdir), "report": str(rep_path), **evaluate(con, s)}


def evaluate(con, s) -> dict:
    """Did the pipeline detect the planted effect, and does the placebo show nothing?"""
    df = pd.read_sql_query(
        "SELECT s.strategy_id, s.decision_date, o.horizon, o.ret, o.peer_resid_ret, o.beta_adj_ret FROM signals s "
        "JOIN signal_outcomes o ON o.signal_id=s.signal_id WHERE o.horizon='5d'", con)
    res = {}
    for sid, g in df.groupby("strategy_id"):
        daily_r = calendar_time_returns(g, "decision_date", "peer_resid_ret")
        tt = t_test_mean(daily_r.values)
        res[sid] = {"n_signals": int(len(g)), "n_days": tt["n"], "mean_5d_peer_resid": tt["mean"], "t": tt["t"],
                    "ci95": block_bootstrap_ci(daily_r.values)}
    trades = pd.read_sql_query("SELECT account_id, COUNT(*) n, AVG(net_ret_pess) pess, AVG(net_ret_opt) opt "
                               "FROM trades WHERE status='closed' GROUP BY account_id", con)
    eq = pd.read_sql_query("SELECT account_id, cost_model, equity FROM equity_daily WHERE e_date=(SELECT MAX(e_date) "
                           "FROM equity_daily)", con)
    return {"signal_stats_5d": res, "closed_trades": trades.to_dict("records"), "final_equity": eq.to_dict("records"),
            "counts": {t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                       for t in ("signals", "signal_outcomes", "orders", "trades", "equity_daily", "signal_peers")}}
