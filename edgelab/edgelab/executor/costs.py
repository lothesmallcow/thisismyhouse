"""Cost models. Every trade is costed under BOTH 'opt' and 'pess'. Results are reported
side by side; a strategy that only works under 'opt' is treated as having no edge."""
from __future__ import annotations

import math


def side_cost_bps(settings, model: str, bucket: str, notional: float, adv_usd: float | None,
                  vol20: float | None) -> dict:
    c = settings["costs"][model]
    spread = float(c["half_spread_bps"].get(bucket, c["half_spread_bps"]["micro"]))
    commission = float(c["commission_bps"])
    impact = 0.0
    if c["impact_coef"] and adv_usd and adv_usd > 0 and vol20:
        impact = float(c["impact_coef"]) * (vol20 * 1e4) * math.sqrt(max(notional, 0.0) / adv_usd)
    return {"spread": spread, "commission": commission, "impact": impact,
            "total": spread + commission + impact}


def borrow_cost(settings, bucket: str, days_held: int) -> float:
    rate = settings["costs"]["borrow_annual"].get(bucket, settings["costs"]["borrow_annual"]["micro"])
    return rate * days_held / 360.0
