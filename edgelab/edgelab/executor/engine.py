"""Deterministic executor: decisions before the open, simulated fills after the close.

Daily cycle (all times ET):
  09:15  decide()     exits due today + new entries from each account's strategy, risk-checked,
                      orders created (and mirrored to Alpaca paper where configured)
  18:30  reconcile()  once today's bars exist: simulated fills at the official open, trades
                      opened/closed, both cost models applied, MAE/MFE + shortfall recorded
  18:40  mark()       equity per account per cost model

Accounting truth is the simulator. Broker fills are recorded next to it for comparison.
"""
from __future__ import annotations

import logging
import math
from pathlib import Path

import pandas as pd

from .. import alerts
from ..broker.alpaca_paper import make_broker
from ..db import dumps, one, tx
from ..marketdata import adjusted_panel, raw_panel, trailing_beta
from ..strategies.base import Context, SignalSpec
from ..strategies.controls import build
from ..timeutil import (first_tradable_open, market_phase, next_trading_day, now_iso, prev_trading_day,
                        trading_days)
from ..universe import latest_universe
from .costs import borrow_cost, side_cost_bps

log = logging.getLogger(__name__)


# ------------------------------------------------------------------ setup
def ensure_accounts(con, settings) -> None:
    with tx(con):
        for a in settings["accounts"]:
            strat = build(a["strategy"], a.get("params"))
            sid = f"{a['account_id']}:{strat.strategy_id}_v{strat.version}"
            con.execute(
                "INSERT INTO strategies(strategy_id, hyp_id, kind, version, params_json, status, updated_at) "
                "VALUES(?,?,?,?,?, 'active', ?) ON CONFLICT(strategy_id) DO UPDATE SET params_json=excluded.params_json, "
                "updated_at=excluded.updated_at",
                (sid, a.get("hyp_id"), strat.kind, strat.version, dumps(a.get("params", {})), now_iso()))
            con.execute(
                "INSERT INTO accounts(account_id, strategy_id, broker, start_equity, created_at) VALUES(?,?,?,?,?) "
                "ON CONFLICT(account_id) DO NOTHING",
                (a["account_id"], sid, a.get("broker", "sim"), float(a["start_equity"]), now_iso()))


def strategy_id_for(con, account_id: str) -> str:
    return one(con, "SELECT strategy_id FROM accounts WHERE account_id=?", (account_id,))


def risk_limits(settings, account_cfg: dict) -> dict:
    r = dict(settings["risk"])
    r.update(account_cfg.get("risk_overrides", {}))
    return r


# ------------------------------------------------------------------ kill switch / staleness
def kill_file(settings) -> Path:
    return settings.data_dir / "KILL"


def killed(con, settings, account_id: str | None = None) -> str | None:
    if kill_file(settings).exists():
        return "global kill file present: " + kill_file(settings).read_text().strip()
    if account_id:
        v = one(con, "SELECT value FROM meta WHERE key=?", (f"kill:{account_id}",))
        if v:
            return v
    return None


def set_kill(con, settings, reason: str, account_id: str | None = None) -> None:
    if account_id:
        con.execute("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (f"kill:{account_id}", reason))
    else:
        kill_file(settings).parent.mkdir(parents=True, exist_ok=True)
        kill_file(settings).write_text(reason)
    con.execute("INSERT INTO risk_events(ts, account_id, kind, detail) VALUES(?,?,?,?)",
                (now_iso(), account_id, "kill_switch", reason))
    alerts.notify(settings, "edgelab KILL SWITCH", f"{account_id or 'GLOBAL'}: {reason}", priority="urgent", tags="rotating_light")


def stale_reasons(con, settings, decision_date: str, needs_filings: bool) -> list[str]:
    reasons = []
    prev = prev_trading_day(decision_date, settings["risk"]["stale_bars_max_trading_days"])
    if not one(con, "SELECT 1 FROM bars_daily WHERE bar_date>=? AND bar_date<? AND symbol='SPY' LIMIT 1",
               (prev, decision_date)):
        reasons.append(f"no SPY daily bar since {prev}")
    if needs_filings:
        last = one(con, "SELECT MAX(finished_at) FROM job_runs WHERE job='collect_filings' AND status='ok'")
        if last is None:
            reasons.append("filings collector never succeeded")
        else:
            age_min = (pd.Timestamp(now_iso()) - pd.Timestamp(last)).total_seconds() / 60
            if age_min > settings["risk"]["stale_filings_max_minutes"]:
                reasons.append(f"filings collector last ok {age_min:.0f} min ago")
    return reasons


# ------------------------------------------------------------------ equity helpers
def last_equity(con, account_id: str, before_date: str, model: str = "pess") -> tuple[float, float | None]:
    """(latest equity strictly before date, equity the day before that)."""
    rows = con.execute("SELECT equity FROM equity_daily WHERE account_id=? AND cost_model=? AND e_date<? "
                       "ORDER BY e_date DESC LIMIT 2", (account_id, model, before_date)).fetchall()
    start = one(con, "SELECT start_equity FROM accounts WHERE account_id=?", (account_id,))
    if not rows:
        return start, None
    return rows[0][0], (rows[1][0] if len(rows) > 1 else start)


def peak_equity(con, account_id: str, before_date: str, model: str = "pess") -> float:
    start = one(con, "SELECT start_equity FROM accounts WHERE account_id=?", (account_id,))
    pk = one(con, "SELECT MAX(equity) FROM equity_daily WHERE account_id=? AND cost_model=? AND e_date<?",
             (account_id, model, before_date))
    return max(start, pk or start)


# ------------------------------------------------------------------ decide
def decide(con, settings, decision_date: str, decision_ts: str | None = None) -> dict:
    decision_ts = decision_ts or now_iso()
    summary = {"date": decision_date, "accounts": {}}
    ensure_accounts(con, settings)
    prev_day = prev_trading_day(decision_date)
    universe = latest_universe(con, prev_day)
    for acfg in settings["accounts"]:
        acc = acfg["account_id"]
        res = {"exits": 0, "signals": 0, "entries": 0, "blocked": []}
        summary["accounts"][acc] = res
        strat = build(acfg["strategy"], acfg.get("params"))
        sid = strategy_id_for(con, acc)
        limits = risk_limits(settings, acfg)
        broker = make_broker(acfg)

        # exits first: they reduce risk and are allowed even when entries are blocked
        due = con.execute("SELECT * FROM trades WHERE account_id=? AND status='open' AND planned_exit_date<=?",
                          (acc, decision_date)).fetchall()
        kill = killed(con, settings, acc)
        if kill:
            due = con.execute("SELECT * FROM trades WHERE account_id=? AND status='open'", (acc,)).fetchall()
        for t in due:
            _create_order(con, settings, broker, acc, t["signal_id"], t["trade_id"], t["symbol"],
                          "sell" if t["direction"] > 0 else "buy", "close", t["qty"], decision_ts, decision_date,
                          _last_close(con, t["symbol"], decision_date))
            con.execute("UPDATE trades SET status='pending_exit', exit_reason=?, updated_at=? WHERE trade_id=?",
                        ("kill_switch" if kill else "time", now_iso(), t["trade_id"]))
            res["exits"] += 1

        if kill:
            res["blocked"].append(f"kill: {kill}")
            continue

        stale = stale_reasons(con, settings, decision_date, needs_filings=acfg["strategy"] != "spy_buy_hold"
                              and acfg["strategy"] != "random_universe")
        equity, equity_prev = last_equity(con, acc, decision_date)
        block_entries = []
        if stale:
            block_entries.append("stale_data: " + "; ".join(stale))
        if equity_prev and (equity / equity_prev - 1) < -limits["max_daily_loss_pct"]:
            block_entries.append(f"daily_loss {(equity / equity_prev - 1):.2%}")
        dd = equity / peak_equity(con, acc, decision_date) - 1
        if dd < -limits["max_drawdown_kill_pct"]:
            set_kill(con, settings, f"drawdown {dd:.2%} breached {limits['max_drawdown_kill_pct']:.0%}", acc)
            block_entries.append("drawdown_kill")
        for b in block_entries:
            con.execute("INSERT INTO risk_events(ts, account_id, kind, detail) VALUES(?,?,?,?)",
                        (now_iso(), acc, "limit_block", b))
        if stale:
            alerts.notify(settings, "edgelab: entries blocked (stale data)", f"{acc}: {'; '.join(stale)}",
                          priority="high", tags="warning")

        held = {r[0] for r in con.execute(
            "SELECT symbol FROM trades WHERE account_id=? AND status IN ('pending_entry','open','pending_exit')", (acc,))}
        ctx = Context(con, settings, acc, decision_date, decision_ts, universe, held)
        specs = strat.generate(ctx)
        open_n = len(held)
        gross = _gross_exposure(con, acc, prev_day) / max(equity, 1e-9)
        for spec in specs:
            res["signals"] += 1
            reason = _check_signal(spec, decision_date, decision_ts)
            if reason is None and block_entries:
                reason = block_entries[0]
            pos_pct = min(spec.position_pct or limits["max_position_pct"], limits["max_position_pct"])
            if reason is None and spec.direction < 0 and not (limits["allow_short"] or acfg.get("allow_short")):
                reason = "short_not_allowed"
            if reason is None and open_n >= limits["max_open_positions"]:
                reason = "max_open_positions"
            if reason is None and gross + pos_pct > limits["max_gross_exposure"] + 1e-9:
                reason = "max_gross_exposure"
            px = _last_close(con, spec.symbol, decision_date)
            qty = math.floor(pos_pct * equity / px) if px else 0
            if reason is None and qty <= 0:
                reason = "no_price_or_zero_qty"
            signal_id = _record_signal(con, settings, sid, spec, decision_date, decision_ts, traded=reason is None,
                                       reason=reason)
            if reason:
                res["blocked"].append(f"{spec.symbol}:{reason}")
                continue
            trade_id = f"{acc}|{signal_id}"
            exit_date = next_trading_day(decision_date, spec.hold_days) if spec.hold_days else None
            with tx(con):
                con.execute(
                    "INSERT INTO trades(trade_id, account_id, strategy_id, signal_id, symbol, direction, qty, status, "
                    "planned_exit_date, created_at, updated_at) VALUES(?,?,?,?,?,?,?, 'pending_entry', ?,?,?)",
                    (trade_id, acc, sid, signal_id, spec.symbol, spec.direction, qty, exit_date, now_iso(), now_iso()))
            _create_order(con, settings, broker, acc, signal_id, trade_id, spec.symbol,
                          "buy" if spec.direction > 0 else "sell", "open", qty, decision_ts, decision_date, px)
            open_n += 1
            gross += pos_pct
            res["entries"] += 1
    return summary


def _check_signal(spec: SignalSpec, decision_date: str, decision_ts: str) -> str | None:
    """Look-ahead guard: the info must be public before the decision and tradable at this open."""
    if spec.info_ts > decision_ts:
        return "LOOKAHEAD: info_ts after decision_ts"
    if spec.event_kind not in ("random", "schedule") and first_tradable_open(spec.info_ts) > decision_date:
        return "LOOKAHEAD: info not public before this open"
    return None


def _record_signal(con, settings, strategy_id, spec: SignalSpec, decision_date, decision_ts, traded, reason) -> str:
    signal_id = f"{strategy_id}|{spec.symbol}|{spec.event_ref}|{decision_date}"
    pre = _pre_signal_stats(con, settings, spec.symbol, decision_date)
    regime_date = one(con, "SELECT MAX(r_date) FROM regime_daily WHERE r_date<?", (decision_date,))
    with tx(con):
        con.execute(
            "INSERT OR IGNORE INTO signals(signal_id, strategy_id, symbol, event_kind, event_ref, info_ts, detected_ts, "
            "decision_date, direction, strength, features_json, pre_beta, pre_beta_n, pre_vol20, pre_ret_5d, size_bucket, "
            "adv20_usd, regime_date, time_of_day, traded, not_traded_reason, created_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (signal_id, strategy_id, spec.symbol, spec.event_kind, spec.event_ref, spec.info_ts, decision_ts,
             decision_date, spec.direction, spec.strength, dumps(spec.features), pre["beta"], pre["beta_n"],
             pre["vol20"], pre["ret_5d"], pre["size_bucket"], pre["adv20"], regime_date, market_phase(spec.info_ts),
             int(traded), reason, now_iso()))
    return signal_id


def _pre_signal_stats(con, settings, symbol: str, decision_date: str) -> dict:
    """Everything here uses data strictly before decision_date."""
    o = settings["outcomes"]
    end = prev_trading_day(decision_date)
    days = trading_days(pd.Timestamp(end) - pd.Timedelta(days=int(o["beta_window_days"] * 1.6)), end)
    start = days[-(o["beta_window_days"] + 1)] if len(days) > o["beta_window_days"] else days[0]
    rets = adjusted_panel(con, [symbol, "SPY"], start, end).pct_change(fill_method=None)
    beta, n = (None, 0)
    if symbol in rets and "SPY" in rets:
        beta, n = trailing_beta(rets[symbol], rets["SPY"], o["beta_min_obs"])
    snap = con.execute("SELECT adv20_usd, vol20, size_bucket FROM universe_snapshots WHERE symbol=? AND snap_date<? "
                       "ORDER BY snap_date DESC LIMIT 1", (symbol, decision_date)).fetchone()
    px = rets.get(symbol)
    ret5 = float((1 + px.tail(5)).prod() - 1) if px is not None and px.tail(5).notna().all() and len(px) >= 5 else None
    return {"beta": beta, "beta_n": n, "vol20": snap["vol20"] if snap else None,
            "adv20": snap["adv20_usd"] if snap else None, "size_bucket": snap["size_bucket"] if snap else None,
            "ret_5d": ret5}


def _last_close(con, symbol: str, before_date: str) -> float | None:
    return one(con, "SELECT close FROM bars_daily WHERE symbol=? AND adjustment='raw' AND bar_date<? "
                    "ORDER BY bar_date DESC LIMIT 1", (symbol, before_date))


def _gross_exposure(con, account_id: str, as_of: str) -> float:
    rows = con.execute("SELECT symbol, qty FROM trades WHERE account_id=? AND status IN ('open','pending_entry','pending_exit')",
                       (account_id,)).fetchall()
    total = 0.0
    for r in rows:
        px = _last_close(con, r["symbol"], next_trading_day(as_of))
        total += abs(r["qty"] * (px or 0))
    return total


def _create_order(con, settings, broker, account_id, signal_id, trade_id, symbol, side, intent, qty,
                  decision_ts, trade_date, decision_px) -> str:
    order_id = f"{trade_id}|{intent}"[:120]
    order = {"order_id": order_id, "account_id": account_id, "signal_id": signal_id, "trade_id": trade_id,
             "symbol": symbol, "side": side, "intent": intent, "qty": qty, "order_type": "market",
             "tif": settings["execution"]["entry_tif" if intent == "open" else "exit_tif"],
             "decision_ts": decision_ts, "decision_px": decision_px, "trade_date": trade_date,
             "created_at": now_iso(), "updated_at": now_iso()}
    with tx(con):
        con.execute(f"INSERT OR IGNORE INTO orders({','.join(order)}) VALUES({','.join('?' for _ in order)})",
                    tuple(order.values()))
    try:
        b = broker.submit(order)
        con.execute("UPDATE orders SET broker_order_id=?, broker_status=? WHERE order_id=?",
                    (b.get("broker_order_id"), b.get("broker_status"), order_id))
    except Exception as exc:   # broker trouble never blocks simulated accounting, but it is loud
        con.execute("UPDATE orders SET broker_status=? WHERE order_id=?", (f"submit_error: {exc}"[:300], order_id))
        alerts.notify(settings, "edgelab broker submit failed", f"{account_id} {symbol}: {exc}", priority="high")
    return order_id


# ------------------------------------------------------------------ reconcile (after the close)
def reconcile(con, settings, through_date: str) -> dict:
    """Simulated fills at the official open of trade_date, once that bar exists."""
    out = {"filled": 0, "expired": 0}
    pend = con.execute("SELECT * FROM orders WHERE sim_status='pending' AND trade_date<=? ORDER BY trade_date, order_id",
                       (through_date,)).fetchall()
    acfg = {a["account_id"]: a for a in settings["accounts"]}
    for o in pend:
        bar = con.execute("SELECT open FROM bars_daily WHERE symbol=? AND bar_date=? AND adjustment='raw'",
                          (o["symbol"], o["trade_date"])).fetchone()
        if bar is None or bar["open"] is None:
            # no trade that day (halt, delisting, data gap): retry for 3 sessions, then expire
            if trading_days(o["trade_date"], through_date).__len__() > 3:
                _expire(con, settings, o)
                out["expired"] += 1
            continue
        with tx(con):
            con.execute("UPDATE orders SET sim_status='filled', sim_fill_px_raw=?, updated_at=? WHERE order_id=?",
                        (bar["open"], now_iso(), o["order_id"]))
            if o["intent"] == "open":
                con.execute("UPDATE trades SET status='open', entry_date=?, entry_px_raw=?, updated_at=? WHERE trade_id=?",
                            (o["trade_date"], bar["open"], now_iso(), o["trade_id"]))
            else:
                con.execute("UPDATE trades SET exit_date=?, exit_px_raw=?, updated_at=? WHERE trade_id=?",
                            (o["trade_date"], bar["open"], now_iso(), o["trade_id"]))
                _close_trade(con, settings, o["trade_id"])
        out["filled"] += 1
        # sync broker mirror if any
        cfg = acfg.get(o["account_id"], {})
        if cfg.get("broker") == "alpaca_paper" and o["broker_order_id"]:
            try:
                b = make_broker(cfg).sync(dict(o))
                if b:
                    con.execute("UPDATE orders SET broker_status=?, broker_fill_px=?, broker_fill_qty=?, broker_filled_ts=? "
                                "WHERE order_id=?", (b["broker_status"], b["broker_fill_px"], b["broker_fill_qty"],
                                                    b["broker_filled_ts"], o["order_id"]))
                    col = "broker_entry_px" if o["intent"] == "open" else "broker_exit_px"
                    con.execute(f"UPDATE trades SET {col}=? WHERE trade_id=?", (b["broker_fill_px"], o["trade_id"]))
            except Exception as exc:
                log.warning("broker sync failed %s: %s", o["order_id"], exc)
    return out


def _expire(con, settings, o) -> None:
    with tx(con):
        con.execute("UPDATE orders SET sim_status='expired', reject_reason='no bar for 3 sessions', updated_at=? "
                    "WHERE order_id=?", (now_iso(), o["order_id"]))
        if o["intent"] == "open":
            con.execute("UPDATE trades SET status='cancelled', updated_at=? WHERE trade_id=?", (now_iso(), o["trade_id"]))
        else:
            # cannot exit: mark at last known close and flag. Real money would be stuck here.
            last = con.execute("SELECT bar_date, close FROM bars_daily WHERE symbol=? AND adjustment='raw' "
                               "ORDER BY bar_date DESC LIMIT 1", (o["symbol"],)).fetchone()
            con.execute("UPDATE trades SET exit_date=?, exit_px_raw=?, exit_reason='delisted_or_halted', updated_at=? "
                        "WHERE trade_id=?", (last["bar_date"] if last else o["trade_date"],
                                             last["close"] if last else None, now_iso(), o["trade_id"]))
    _close_trade(con, settings, o["trade_id"])
    alerts.notify(settings, "edgelab order expired", f"{o['account_id']} {o['symbol']} {o['intent']}", priority="default")


def _close_trade(con, settings, trade_id: str) -> None:
    t = con.execute("SELECT * FROM trades WHERE trade_id=?", (trade_id,)).fetchone()
    s = con.execute("SELECT * FROM signals WHERE signal_id=?", (t["signal_id"],)).fetchone()
    if t["entry_px_raw"] is None or t["exit_px_raw"] is None:
        return
    # total-return adjusted prices so splits/dividends inside the holding window are handled
    opens = adjusted_panel(con, [t["symbol"]], t["entry_date"], t["exit_date"], "open")
    highs = adjusted_panel(con, [t["symbol"]], t["entry_date"], t["exit_date"], "high")
    lows = adjusted_panel(con, [t["symbol"]], t["entry_date"], t["exit_date"], "low")
    closes = adjusted_panel(con, [t["symbol"]], t["entry_date"], t["exit_date"], "close")
    d = t["direction"]
    try:
        e_adj = opens.loc[t["entry_date"], t["symbol"]]
        x_adj = opens.loc[t["exit_date"], t["symbol"]] if t["exit_reason"] != "delisted_or_halted" \
            else closes.loc[t["exit_date"], t["symbol"]]
        gross = d * (x_adj / e_adj - 1)
    except KeyError:
        gross = d * (t["exit_px_raw"] / t["entry_px_raw"] - 1)
        e_adj = None
    # excursions use bars strictly before the exit open (the exit day's range happened after we left)
    if e_adj is not None and not highs.empty:
        window_h = highs[t["symbol"]].loc[:t["exit_date"]].iloc[:-1]
        window_l = lows[t["symbol"]].loc[:t["exit_date"]].iloc[:-1]
        if len(window_h):
            fav = (window_h.max() / e_adj - 1) if d > 0 else (1 - window_l.min() / e_adj)
            adv = (window_l.min() / e_adj - 1) if d > 0 else (1 - window_h.max() / e_adj)
            mfe, mae = float(max(fav, 0)), float(min(adv, 0))
        else:
            mfe = mae = 0.0
    else:
        mfe = mae = None
    notional = t["qty"] * t["entry_px_raw"]
    bucket = (s["size_bucket"] if s else None) or "micro"
    adv = s["adv20_usd"] if s else None
    vol = s["pre_vol20"] if s else None
    days_held = len(trading_days(t["entry_date"], t["exit_date"])) - 1
    c = {}
    for m in ("opt", "pess"):
        side = side_cost_bps(settings, m, bucket, notional, adv, vol)
        c[m] = side
    borrow = borrow_cost(settings, bucket, days_held) if d < 0 else 0.0
    cost_opt = 2 * c["opt"]["total"] / 1e4 + borrow
    cost_pess = 2 * c["pess"]["total"] / 1e4 + borrow
    dec_px = one(con, "SELECT decision_px FROM orders WHERE trade_id=? AND intent='open'", (trade_id,))
    delay = d * (t["entry_px_raw"] / dec_px - 1) if dec_px else None
    with tx(con):
        con.execute(
            "UPDATE trades SET status='closed', gross_ret=?, cost_opt=?, cost_pess=?, net_ret_opt=?, net_ret_pess=?, "
            "shortfall_delay=?, shortfall_spread=?, shortfall_impact=?, borrow_cost=?, mae=?, mfe=?, updated_at=? "
            "WHERE trade_id=?",
            (gross, cost_opt, cost_pess, gross - cost_opt, gross - cost_pess, delay,
             2 * c["pess"]["spread"] / 1e4, 2 * c["pess"]["impact"] / 1e4, borrow, mae, mfe, now_iso(), trade_id))


# ------------------------------------------------------------------ mark to market
def mark(con, settings, e_date: str) -> int:
    """Equity = start + realized net P&L (closed) + unrealized P&L (open, at today's close,
    entry cost already paid). Computed separately for each cost model."""
    n = 0
    for acfg in settings["accounts"]:
        acc = acfg["account_id"]
        start = one(con, "SELECT start_equity FROM accounts WHERE account_id=?", (acc,))
        if start is None:
            continue
        trades = con.execute("SELECT t.*, s.size_bucket, s.adv20_usd, s.pre_vol20 FROM trades t "
                             "LEFT JOIN signals s ON s.signal_id=t.signal_id WHERE t.account_id=? AND t.entry_date<=?",
                             (acc, e_date)).fetchall()
        syms = sorted({t["symbol"] for t in trades})
        first = min((t["entry_date"] for t in trades), default=e_date)
        closes = adjusted_panel(con, syms, first, e_date) if syms else pd.DataFrame()
        opens = adjusted_panel(con, syms, first, e_date, "open") if syms else pd.DataFrame()
        for model in ("opt", "pess"):
            equity, gross, n_open = start, 0.0, 0
            for t in trades:
                notional = t["qty"] * t["entry_px_raw"]
                closed = t["status"] == "closed" and t["exit_date"] and t["exit_date"] <= e_date
                if closed:
                    equity += notional * (t[f"net_ret_{model}"] or 0.0)
                    continue
                if t["status"] == "cancelled":
                    continue
                side = side_cost_bps(settings, model, t["size_bucket"] or "micro", notional, t["adv20_usd"],
                                     t["pre_vol20"])["total"] / 1e4
                try:
                    e_adj = opens.loc[t["entry_date"], t["symbol"]]
                    c_adj = closes[t["symbol"]].loc[:e_date].dropna().iloc[-1]
                    unreal = t["direction"] * (c_adj / e_adj - 1)
                    gross += abs(notional * (1 + unreal))
                except (KeyError, IndexError):
                    unreal = 0.0
                    gross += abs(notional)
                equity += notional * (unreal - side)
                n_open += 1
            con.execute(
                "INSERT INTO equity_daily(account_id, e_date, cost_model, equity, cash, gross_exposure, n_open) "
                "VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id, e_date, cost_model) DO UPDATE SET equity=excluded.equity, "
                "cash=excluded.cash, gross_exposure=excluded.gross_exposure, n_open=excluded.n_open",
                (acc, e_date, model, equity, equity - gross, gross / equity if equity else 0, n_open))
            n += 1
    return n
