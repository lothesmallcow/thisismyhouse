"""Strategy contract.

A strategy is a pure function of information available BEFORE the decision time. It returns
SignalSpecs; the executor (not the strategy) decides whether each one is traded, after risk
checks, and records every signal either way so non-traded signals still get outcomes.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

import pandas as pd


@dataclass
class Context:
    con: object
    settings: object
    account_id: str
    decision_date: str          # trading date whose open we trade at
    decision_ts: str            # UTC ISO, the moment the decision is made
    universe: pd.DataFrame      # latest universe snapshot strictly before decision_date
    held_symbols: set[str] = field(default_factory=set)


@dataclass
class SignalSpec:
    symbol: str
    direction: int
    info_ts: str
    event_kind: str
    event_ref: str
    strength: float | None = None
    hold_days: int | None = None          # None = hold until strategy says otherwise
    position_pct: float | None = None
    features: dict = field(default_factory=dict)


class Strategy:
    strategy_id: str = "base"
    kind: str = "candidate"
    version: str = "1"

    def __init__(self, params: dict | None = None) -> None:
        self.params = params or {}

    def generate(self, ctx: Context) -> list[SignalSpec]:
        raise NotImplementedError

    @staticmethod
    def rng_seed(*parts: str) -> int:
        return int(hashlib.sha256("|".join(parts).encode()).hexdigest()[:16], 16)
