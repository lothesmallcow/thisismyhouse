"""Generic EDGAR event strategy: trade a stock after a filing of a given form (and optional 8-K
item) became public. Template for pre-registered hypotheses like 'NT 10-K -> negative drift'
or '8-K item 4.02 -> negative drift'. All parameters come from the frozen pre-registration."""
from __future__ import annotations

from ..timeutil import first_tradable_open
from .base import Context, SignalSpec, Strategy


class FilingItem(Strategy):
    strategy_id = "filing_item"
    kind = "candidate"

    def generate(self, ctx: Context) -> list[SignalSpec]:
        p = self.params
        forms = p.get("forms", ["8-K"])
        item = p.get("item")
        rows = ctx.con.execute(
            f"SELECT accession, symbol, items, available_at FROM filings WHERE symbol IS NOT NULL "
            f"AND form_type IN ({','.join('?' for _ in forms)}) AND available_at <= ? "
            f"AND available_at >= datetime(?, '-6 days') ORDER BY available_at, accession",
            (*forms, ctx.decision_ts, ctx.decision_date)).fetchall()
        univ = set(ctx.universe["symbol"]) if not ctx.universe.empty else set()
        out, seen = [], set()
        for r in rows:
            if item and item not in (r["items"] or "").split(","):
                continue
            if first_tradable_open(r["available_at"]) != ctx.decision_date:
                continue
            if r["symbol"] not in univ or r["symbol"] in ctx.held_symbols or r["symbol"] in seen:
                continue
            seen.add(r["symbol"])
            out.append(SignalSpec(r["symbol"], int(p.get("direction", 1)), r["available_at"], "filing", r["accession"],
                                  hold_days=int(p.get("hold_days", 5)), position_pct=p.get("position_pct"),
                                  features={"form": forms, "item": item}))
        return out
