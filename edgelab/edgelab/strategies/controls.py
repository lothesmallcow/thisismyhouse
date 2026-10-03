"""Mandatory controls. If a smart strategy cannot beat these after costs, that is the answer.

- spy_buy_hold: the market.
- random_universe: random liquid stocks, same trade frequency/holding/costs as candidates.
- random_event: random stocks that had a tracked filing since the last open. This is the sharp
  placebo: it shares the 'event day' volatility and attention of the candidate strategies but
  carries no information about direction.
"""
from __future__ import annotations

import numpy as np

from ..timeutil import first_tradable_open
from .base import Context, SignalSpec, Strategy


class SpyBuyHold(Strategy):
    strategy_id = "spy_buy_hold"
    kind = "control"

    def generate(self, ctx: Context) -> list[SignalSpec]:
        if "SPY" in ctx.held_symbols:
            return []
        n = ctx.con.execute("SELECT COUNT(*) FROM trades WHERE account_id=? AND symbol='SPY' AND status!='cancelled'",
                            (ctx.account_id,)).fetchone()[0]
        if n:
            return []
        return [SignalSpec("SPY", 1, ctx.decision_ts, "schedule", "buy_and_hold",
                           hold_days=None, position_pct=self.params.get("position_pct", 0.99))]


class RandomUniverse(Strategy):
    strategy_id = "random_universe"
    kind = "control"

    def generate(self, ctx: Context) -> list[SignalSpec]:
        if ctx.universe.empty:
            return []
        rng = np.random.default_rng(self.rng_seed(ctx.account_id, ctx.decision_date))
        pool = sorted(set(ctx.universe["symbol"]) - ctx.held_symbols - {"SPY"})
        k = min(int(self.params.get("trades_per_day", 2)), len(pool))
        picks = rng.choice(pool, size=k, replace=False) if k else []
        return [SignalSpec(str(s), 1, ctx.decision_ts, "random", f"seed:{ctx.account_id}:{ctx.decision_date}",
                           hold_days=int(self.params.get("hold_days", 5)),
                           position_pct=float(self.params.get("position_pct", 0.04))) for s in picks]


class RandomEvent(Strategy):
    strategy_id = "random_event"
    kind = "control"

    def generate(self, ctx: Context) -> list[SignalSpec]:
        forms = self.params.get("event_forms", ["8-K"])
        rows = ctx.con.execute(
            f"SELECT accession, symbol, available_at FROM filings WHERE symbol IS NOT NULL "
            f"AND form_type IN ({','.join('?' for _ in forms)}) AND available_at <= ? "
            f"AND available_at >= datetime(?, '-6 days') ORDER BY accession",
            (*forms, ctx.decision_ts, ctx.decision_date)).fetchall()
        univ = set(ctx.universe["symbol"]) if not ctx.universe.empty else set()
        cands = {}
        for r in rows:
            if (first_tradable_open(r["available_at"]) == ctx.decision_date and r["symbol"] in univ
                    and r["symbol"] not in ctx.held_symbols):
                cands.setdefault(r["symbol"], r)
        if not cands:
            return []
        rng = np.random.default_rng(self.rng_seed(ctx.account_id, ctx.decision_date))
        pool = sorted(cands)
        k = min(int(self.params.get("trades_per_day", 2)), len(pool))
        picks = rng.choice(pool, size=k, replace=False)
        return [SignalSpec(str(s), 1, cands[s]["available_at"], "filing", cands[s]["accession"],
                           hold_days=int(self.params.get("hold_days", 5)),
                           position_pct=float(self.params.get("position_pct", 0.04))) for s in picks]


def _registry():
    from .filing_item import FilingItem
    return {c.strategy_id: c for c in (SpyBuyHold, RandomUniverse, RandomEvent, FilingItem)}


def build(name: str, params: dict | None):
    reg = _registry()
    if name not in reg:
        raise KeyError(f"unknown strategy {name}; registered: {sorted(reg)}")
    return reg[name](params)
