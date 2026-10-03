"""Health checks: catch silent failures. Run every 15 minutes by the scheduler."""
from __future__ import annotations

import pandas as pd

from . import alerts
from .db import one
from .timeutil import ET, et_date, is_trading_day, now_iso, prev_trading_day, utcnow

# job -> max minutes between successful runs, and whether it only matters on trading days
EXPECTATIONS = {
    "collect_filings": (30, False, (6, 22)),     # EDGAR hours ET, weekdays
    "collect_news": (60, False, (6, 22)),
    "nightly": (60 * 26, True, None),
}


def check(con, settings) -> list[str]:
    problems = []
    now = utcnow()
    local = now.astimezone(ET)
    weekday = local.weekday() < 5
    for job, (max_min, trading_only, hours) in EXPECTATIONS.items():
        if hours and not (weekday and hours[0] <= local.hour < hours[1]):
            continue
        if trading_only and not is_trading_day(et_date()):
            continue
        last = one(con, "SELECT MAX(finished_at) FROM job_runs WHERE job=? AND status='ok'", (job,))
        if last is None:
            problems.append(f"{job}: never succeeded")
            continue
        age = (pd.Timestamp(now_iso()) - pd.Timestamp(last)).total_seconds() / 60
        if age > max_min:
            problems.append(f"{job}: last success {age:.0f} min ago (limit {max_min})")
    errs = con.execute("SELECT job, COUNT(*) c FROM job_runs WHERE status='error' AND started_at>=datetime('now','-1 day') "
                       "GROUP BY job").fetchall()
    for e in errs:
        if e["c"] >= 3:
            problems.append(f"{e['job']}: {e['c']} errors in 24h")
    stuck = one(con, "SELECT COUNT(*) FROM job_runs WHERE status='running' AND started_at < datetime('now','-2 hours')")
    if stuck:
        problems.append(f"{stuck} job(s) stuck in 'running' > 2h")
    # bars freshness: after 20:00 ET on a trading day we must have today's SPY bar
    today = et_date()
    if is_trading_day(today) and local.hour >= 20:
        if not one(con, "SELECT 1 FROM bars_daily WHERE symbol='SPY' AND bar_date=?", (today,)):
            problems.append(f"no SPY bar for {today} after 20:00 ET")
    gaps = one(con, "SELECT COUNT(*) FROM data_gaps WHERE resolved_at IS NULL AND detected_at>=datetime('now','-1 day')")
    if gaps:
        problems.append(f"{gaps} new data gap(s) logged in 24h (backfilled, but investigate)")
    return problems


def run(con, settings) -> list[str]:
    problems = check(con, settings)
    if problems:
        alerts.notify(settings, "edgelab health: PROBLEMS", "\n".join(problems), priority="high", tags="warning")
        alerts.hc_ping(settings, "/fail", "\n".join(problems))
    else:
        alerts.hc_ping(settings, "", "ok")
    return problems
