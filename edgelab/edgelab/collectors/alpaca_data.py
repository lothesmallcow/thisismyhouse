"""Alpaca market data: assets, daily/minute bars, news.

Free 'Basic' plan (verify periodically, see docs/VERIFICATION.md): real-time is IEX only, but
historical SIP bars are allowed when the query ends more than 15 minutes ago, back to 2016.
200 requests/minute. We only ever request finished bars, so SIP is usable.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

from ..db import tx, upsert
from ..timeutil import UTC, iso, now_iso, parse_ts, utcnow

log = logging.getLogger(__name__)


def _keys(settings) -> tuple[str, str]:
    k = os.environ.get(settings["alpaca"]["key_env"])
    s = os.environ.get(settings["alpaca"]["secret_env"])
    if not k or not s:
        raise RuntimeError("Alpaca keys missing: set ALPACA_API_KEY / ALPACA_SECRET_KEY in .env")
    return k, s


def data_client(settings):
    from alpaca.data.historical import StockHistoricalDataClient
    return StockHistoricalDataClient(*_keys(settings))


def trading_client(settings, key_env: str | None = None, secret_env: str | None = None):
    from alpaca.trading.client import TradingClient
    if key_env:
        return TradingClient(os.environ[key_env], os.environ[secret_env], paper=True)
    return TradingClient(*_keys(settings), paper=True)


def refresh_assets(con, settings) -> int:
    """Store active and inactive US equities. Inactive ones matter for survivorship."""
    from alpaca.trading.enums import AssetClass, AssetStatus
    from alpaca.trading.requests import GetAssetsRequest
    tc = trading_client(settings)
    today = utcnow().date().isoformat()
    n = 0
    for status in (AssetStatus.ACTIVE, AssetStatus.INACTIVE):
        assets = tc.get_all_assets(GetAssetsRequest(status=status, asset_class=AssetClass.US_EQUITY))
        with tx(con):
            for a in assets:
                exch = getattr(a.exchange, "value", str(a.exchange))
                con.execute(
                    "INSERT INTO instruments(symbol, name, exchange, asset_class, shortable, easy_to_borrow, status,"
                    " first_seen_date, last_seen_date, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) "
                    "ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, exchange=excluded.exchange, "
                    "asset_class=excluded.asset_class, shortable=excluded.shortable, easy_to_borrow=excluded.easy_to_borrow, "
                    "status=excluded.status, last_seen_date=excluded.last_seen_date, updated_at=excluded.updated_at, "
                    "first_seen_date=COALESCE(instruments.first_seen_date, excluded.first_seen_date)",
                    (a.symbol, a.name, exch, "us_equity", int(bool(a.shortable)), int(bool(a.easy_to_borrow)),
                     getattr(a.status, "value", str(a.status)), today, today, now_iso()))
                n += 1
    # crude ETF flag: Alpaca has no asset-type field; ARCA-listed or name hints
    con.execute("UPDATE instruments SET is_etf=1 WHERE name LIKE '%ETF%' OR name LIKE '%Fund%' OR name LIKE '%Trust Units%'")
    return n


def _bar_rows(barset, source: str, adjustment: str) -> list[dict]:
    rows = []
    for sym, bars in barset.data.items():
        for b in bars:
            rows.append({
                "symbol": sym, "bar_date": _et_date(b.timestamp),
                "open": b.open, "high": b.high, "low": b.low, "close": b.close,
                "volume": b.volume, "vwap": b.vwap, "trade_count": int(b.trade_count or 0),
                "adjustment": adjustment, "source": source, "ingested_at": now_iso()})
    return rows


def _et_date(ts: datetime) -> str:
    from ..timeutil import ET
    return ts.astimezone(ET).date().isoformat()


def fetch_daily_bars(con, settings, symbols: list[str], start: str, end: str,
                     adjustment: str = "raw", chunk: int = 200) -> int:
    """Daily bars for many symbols. 'raw' bars are what traded; 'all' (split+dividend adjusted)
    is used for return computations across corporate actions."""
    from alpaca.data.enums import Adjustment, DataFeed
    from alpaca.data.requests import StockBarsRequest
    from alpaca.data.timeframe import TimeFrame
    dc = data_client(settings)
    feed = DataFeed(settings["alpaca"]["data_feed"])
    end_dt = min(datetime.fromisoformat(end).replace(tzinfo=UTC) + timedelta(days=1),
                 utcnow() - timedelta(minutes=20))   # never ask for the restricted last 15 min
    n = 0
    source = f"alpaca_{feed.value}"
    for i in range(0, len(symbols), chunk):
        part = symbols[i:i + chunk]
        req = StockBarsRequest(symbol_or_symbols=part, timeframe=TimeFrame.Day,
                               start=datetime.fromisoformat(start).replace(tzinfo=UTC), end=end_dt,
                               adjustment=Adjustment(adjustment), feed=feed)
        rows = _bar_rows(dc.get_stock_bars(req), source, adjustment)
        with tx(con):
            n += upsert(con, "bars_daily", rows, ["symbol", "bar_date", "adjustment"])
    return n


def fetch_minute_bars(con, settings, symbol: str, start_ts: str, end_ts: str) -> int:
    from alpaca.data.enums import DataFeed
    from alpaca.data.requests import StockBarsRequest
    from alpaca.data.timeframe import TimeFrame
    dc = data_client(settings)
    feed = DataFeed(settings["alpaca"]["data_feed"])
    end_dt = min(parse_ts(end_ts), utcnow() - timedelta(minutes=20))
    req = StockBarsRequest(symbol_or_symbols=symbol, timeframe=TimeFrame.Minute,
                           start=parse_ts(start_ts), end=end_dt, feed=feed)
    bs = dc.get_stock_bars(req)
    rows = [{"symbol": symbol, "bar_ts": iso(b.timestamp), "open": b.open, "high": b.high, "low": b.low,
             "close": b.close, "volume": b.volume, "vwap": b.vwap, "source": f"alpaca_{feed.value}",
             "ingested_at": now_iso()} for b in bs.data.get(symbol, [])]
    with tx(con):
        return upsert(con, "bars_minute", rows, ["symbol", "bar_ts"])


def fetch_news(con, settings, start_ts: str | None = None, end_ts: str | None = None, max_pages: int = 50) -> int:
    """Pull news since the latest stored item (Benzinga via Alpaca)."""
    from alpaca.data.historical.news import NewsClient
    from alpaca.data.requests import NewsRequest
    nc = NewsClient(*_keys(settings))
    if start_ts is None:
        last = con.execute("SELECT MAX(created_ts) FROM news").fetchone()[0]
        start_ts = last or iso(utcnow() - timedelta(days=3))
    token, n = None, 0
    for _ in range(max_pages):
        req = NewsRequest(start=parse_ts(start_ts), end=parse_ts(end_ts) if end_ts else None,
                          limit=50, sort="asc", page_token=token, exclude_contentless=False)
        res = nc.get_news(req)
        items = res.data.get("news", []) if hasattr(res, "data") else []
        news_rows, sym_rows = [], []
        for it in items:
            nid = str(it.id)
            news_rows.append({"news_id": nid, "created_ts": iso(it.created_at), "updated_ts": iso(it.updated_at),
                              "available_at": iso(it.created_at), "headline": it.headline, "summary": it.summary,
                              "source": it.source, "author": it.author, "url": it.url, "ingested_at": now_iso()})
            sym_rows += [{"news_id": nid, "symbol": s} for s in (it.symbols or [])]
        with tx(con):
            n += upsert(con, "news", news_rows, ["news_id"])
            upsert(con, "news_symbols", sym_rows, ["news_id", "symbol"])
        token = getattr(res, "next_page_token", None)
        if not token or not items:
            break
    return n


def fetch_corporate_actions(con, settings, start: str, end: str, symbols: list[str] | None = None) -> int:
    """Splits and cash dividends, used to build total-return adjusted prices from raw bars."""
    from alpaca.data.enums import CorporateActionsType as T
    from alpaca.data.historical.corporate_actions import CorporateActionsClient
    from alpaca.data.requests import CorporateActionsRequest
    cc = CorporateActionsClient(*_keys(settings))
    req = CorporateActionsRequest(symbols=symbols, types=[T.FORWARD_SPLIT, T.REVERSE_SPLIT, T.CASH_DIVIDEND],
                                  start=datetime.fromisoformat(start).date(), end=datetime.fromisoformat(end).date())
    res = cc.get_corporate_actions(req)
    rows = []
    for kind, items in res.data.items():
        for a in items:
            if kind in ("forward_splits", "reverse_splits"):
                rows.append({"symbol": a.symbol, "ex_date": str(a.ex_date), "action": "split",
                             "ratio": float(a.new_rate) / float(a.old_rate), "amount": None,
                             "detail": kind, "ingested_at": now_iso()})
            elif kind == "cash_dividends":
                rows.append({"symbol": a.symbol, "ex_date": str(a.ex_date), "action": "dividend",
                             "ratio": None, "amount": float(a.rate), "detail": kind, "ingested_at": now_iso()})
    with tx(con):
        return upsert(con, "corporate_actions", rows, ["symbol", "ex_date", "action"])
