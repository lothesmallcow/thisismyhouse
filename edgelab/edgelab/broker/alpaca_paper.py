"""Alpaca paper adapter.

Alpaca's docs (Oct 2026, unverified for paper) suggest OPG/CLS auction orders may require their
'Elite' router. So by default we send a plain market DAY order shortly after the open and record
its fill next to the simulator's open-auction fill. The difference is itself a measurement of
how optimistic the simulator is.
"""
from __future__ import annotations

import os

from ..timeutil import iso


class AlpacaPaperBroker:
    name = "alpaca_paper"

    def __init__(self, key_env: str, secret_env: str, tif: str = "day") -> None:
        from alpaca.trading.client import TradingClient
        self.client = TradingClient(os.environ[key_env], os.environ[secret_env], paper=True)
        self.tif = tif

    def submit(self, order: dict) -> dict:
        from alpaca.trading.enums import OrderSide, TimeInForce
        from alpaca.trading.requests import MarketOrderRequest
        req = MarketOrderRequest(symbol=order["symbol"], qty=order["qty"],
                                 side=OrderSide.BUY if order["side"] == "buy" else OrderSide.SELL,
                                 time_in_force=TimeInForce(self.tif), client_order_id=order["order_id"])
        o = self.client.submit_order(req)
        return {"broker_order_id": str(o.id), "broker_status": getattr(o.status, "value", str(o.status))}

    def sync(self, order: dict) -> dict:
        if not order.get("broker_order_id"):
            return {}
        o = self.client.get_order_by_id(order["broker_order_id"])
        return {"broker_status": getattr(o.status, "value", str(o.status)),
                "broker_fill_px": float(o.filled_avg_price) if o.filled_avg_price else None,
                "broker_fill_qty": float(o.filled_qty) if o.filled_qty else None,
                "broker_filled_ts": iso(o.filled_at) if o.filled_at else None}

    def account_equity(self) -> float:
        return float(self.client.get_account().equity)


def make_broker(account_cfg: dict):
    from .base import NullBroker
    if account_cfg.get("broker") == "alpaca_paper":
        return AlpacaPaperBroker(account_cfg.get("key_env", "ALPACA_API_KEY"),
                                 account_cfg.get("secret_env", "ALPACA_SECRET_KEY"),
                                 account_cfg.get("broker_tif", "day"))
    return NullBroker()
