"""Time and trading-calendar helpers. All stored timestamps are UTC ISO strings."""
from __future__ import annotations

from bisect import bisect_left, bisect_right
from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache
from zoneinfo import ZoneInfo

import pandas as pd
import pandas_market_calendars as mcal

ET = ZoneInfo("America/New_York")
UTC = timezone.utc


def utcnow() -> datetime:
    return datetime.now(UTC)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        raise ValueError("naive datetime; attach a timezone first")
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ts(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(UTC)


def now_iso() -> str:
    return iso(utcnow())


@lru_cache(maxsize=1)
def _sessions() -> pd.DataFrame:
    cal = mcal.get_calendar("XNYS")
    return cal.schedule(start_date="2000-01-01", end_date="2030-12-31")


@lru_cache(maxsize=1)
def _days() -> tuple[list[str], frozenset]:
    days = [d.strftime("%Y-%m-%d") for d in _sessions().index]
    return days, frozenset(days)


def trading_days(start: str | date, end: str | date) -> list[str]:
    days, _ = _days()
    s, e = str(start)[:10], str(end)[:10]
    return days[bisect_left(days, s):bisect_right(days, e)]


def is_trading_day(d: str | date) -> bool:
    return str(d)[:10] in _days()[1]


def session_bounds(d: str) -> tuple[datetime, datetime]:
    """Open and close of the session on trading date d (UTC, early closes handled)."""
    row = _sessions().loc[d]
    return row["market_open"].to_pydatetime(), row["market_close"].to_pydatetime()


def next_trading_day(d: str, n: int = 1) -> str:
    days, _ = _days()
    return days[bisect_right(days, str(d)[:10]) + n - 1]


def prev_trading_day(d: str, n: int = 1) -> str:
    days, _ = _days()
    return days[bisect_left(days, str(d)[:10]) - n]


def first_tradable_open(info_ts: str | datetime) -> str:
    """Trading date whose OPEN is the first open strictly after the information became public.

    Information at 09:31 ET on day D cannot be traded at D's open (it already happened), so
    the answer is D+1. Information at 08:00 ET on D is traded at D's open. This is the single
    most important look-ahead guard in the system.
    """
    t = parse_ts(info_ts) if isinstance(info_ts, str) else info_ts.astimezone(UTC)
    d = t.astimezone(ET).date().isoformat()
    if is_trading_day(d):
        open_, _ = session_bounds(d)
        # need a margin: OPG orders must be in before 09:28 ET, so info after 09:25 ET misses it
        if t <= open_ - timedelta(minutes=5):
            return d
    return next_trading_day(d)


def market_phase(ts: str | datetime) -> str:
    t = parse_ts(ts) if isinstance(ts, str) else ts.astimezone(UTC)
    d = t.astimezone(ET).date().isoformat()
    if not is_trading_day(d):
        return "closed_day"
    open_, close_ = session_bounds(d)
    local = t.astimezone(ET).time()
    if t < open_:
        return "pre_market" if local >= time(4, 0) else "overnight"
    if t <= close_:
        return "regular"
    return "after_hours" if local <= time(20, 0) else "overnight"


def et_date(ts: str | datetime | None = None) -> str:
    t = utcnow() if ts is None else (parse_ts(ts) if isinstance(ts, str) else ts)
    return t.astimezone(ET).date().isoformat()
