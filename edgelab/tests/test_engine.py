import pandas as pd

from edgelab.executor import engine
from edgelab.executor.costs import side_cost_bps
from edgelab.fake import build_world
from edgelab.ops import run_job
from edgelab.strategies.base import SignalSpec
from edgelab.timeutil import iso, prev_trading_day, session_bounds
from edgelab.universe import snapshot_universe

ACCTS = [{"account_id": "r", "strategy": "random_universe", "broker": "sim", "start_equity": 100000,
          "params": {"trades_per_day": 3, "hold_days": 2, "position_pct": 0.04}}]


def _setup(con, settings):
    settings.raw["accounts"] = ACCTS
    w = build_world(con, start="2026-03-02", end="2026-06-30", n_symbols=20)
    with run_job(con, settings, "collect_filings"):
        pass
    return w


def _ts(d):
    o, _ = session_bounds(d)
    return iso(o - pd.Timedelta(minutes=15))


def test_lookahead_guard():
    spec = SignalSpec("X", 1, "2026-10-02T14:00:00Z", "filing", "acc")
    assert engine._check_signal(spec, "2026-10-02", "2026-10-02T13:15:00Z").startswith("LOOKAHEAD")
    late = SignalSpec("X", 1, "2026-10-02T13:26:00Z", "filing", "acc")   # 09:26 ET: public, but too late for the auction
    assert engine._check_signal(late, "2026-10-02", "2026-10-02T13:27:00Z").startswith("LOOKAHEAD")
    ok = SignalSpec("X", 1, "2026-10-01T21:00:00Z", "filing", "acc")
    assert engine._check_signal(ok, "2026-10-02", "2026-10-02T13:15:00Z") is None


def test_cycle_fills_at_open_and_closes(con, settings):
    w = _setup(con, settings)
    days = w["days"][-10:]
    snapshot_universe(con, settings, prev_trading_day(days[0]))
    for d in days:
        engine.decide(con, settings, d, _ts(d))
        engine.reconcile(con, settings, d)
        engine.mark(con, settings, d)
        snapshot_universe(con, settings, d)
    o = con.execute("SELECT o.*, b.open FROM orders o JOIN bars_daily b ON b.symbol=o.symbol AND b.bar_date=o.trade_date "
                    "WHERE o.sim_status='filled' LIMIT 5").fetchall()
    assert o and all(abs(r["sim_fill_px_raw"] - r["open"]) < 1e-9 for r in o)
    closed = con.execute("SELECT * FROM trades WHERE status='closed'").fetchall()
    assert closed
    assert all(t["cost_pess"] > t["cost_opt"] for t in closed)
    assert all(abs(t["net_ret_pess"] - (t["gross_ret"] - t["cost_pess"])) < 1e-12 for t in closed)


def test_kill_switch_blocks_entries_and_exits(con, settings):
    w = _setup(con, settings)
    days = w["days"][-6:]
    snapshot_universe(con, settings, prev_trading_day(days[0]))
    engine.decide(con, settings, days[0], _ts(days[0]))
    engine.reconcile(con, settings, days[0])
    engine.set_kill(con, settings, "test", None)
    res = engine.decide(con, settings, days[1], _ts(days[1]))
    assert res["accounts"]["r"]["entries"] == 0
    assert res["accounts"]["r"]["exits"] == 3
    assert any("kill" in b for b in res["accounts"]["r"]["blocked"])


def test_max_open_positions(con, settings):
    settings.raw["risk"]["max_open_positions"] = 2
    w = _setup(con, settings)
    d = w["days"][-3]
    snapshot_universe(con, settings, prev_trading_day(d))
    res = engine.decide(con, settings, d, _ts(d))
    assert res["accounts"]["r"]["entries"] == 2
    assert any("max_open_positions" in b for b in res["accounts"]["r"]["blocked"])


def test_stale_data_blocks_event_strategy(con, settings):
    settings.raw["accounts"] = [{"account_id": "e", "strategy": "random_event", "broker": "sim", "start_equity": 1e5,
                                 "params": {"trades_per_day": 2}}]
    build_world(con, start="2026-03-02", end="2026-06-30", n_symbols=20)   # no collect_filings job recorded
    d = "2026-06-29"
    snapshot_universe(con, settings, prev_trading_day(d))
    reasons = engine.stale_reasons(con, settings, d, needs_filings=True)
    assert any("filings collector" in r for r in reasons)


def test_costs_scale_with_size(settings):
    small = side_cost_bps(settings, "pess", "small", 10_000, 5e6, 0.03)
    big = side_cost_bps(settings, "pess", "small", 1_000_000, 5e6, 0.03)
    assert big["impact"] > small["impact"] > 0
