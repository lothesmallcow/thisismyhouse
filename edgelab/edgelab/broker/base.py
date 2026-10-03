"""Broker interface. The internal simulator is the accounting truth for every account; an
optional Alpaca paper adapter mirrors the orders so the real plumbing gets exercised and
broker fills can be compared with simulated ones."""
from __future__ import annotations

from typing import Protocol


class Broker(Protocol):
    name: str

    def submit(self, order: dict) -> dict:
        """Returns {'broker_order_id', 'broker_status'}."""

    def sync(self, order: dict) -> dict:
        """Returns {'broker_status','broker_fill_px','broker_fill_qty','broker_filled_ts'}."""


class NullBroker:
    """Sim-only accounts: nothing leaves the box."""
    name = "sim"

    def submit(self, order: dict) -> dict:
        return {"broker_order_id": None, "broker_status": "sim_only"}

    def sync(self, order: dict) -> dict:
        return {}
