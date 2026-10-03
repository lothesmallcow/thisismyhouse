"""Job bookkeeping: every scheduled job runs inside run_job(), which records start/end in
job_runs, alerts on failure and never lets a failure pass silently."""
from __future__ import annotations

import logging
import traceback
from contextlib import contextmanager

from . import alerts
from .timeutil import now_iso

log = logging.getLogger(__name__)


class JobResult:
    def __init__(self) -> None:
        self.rows = 0
        self.detail = ""
        self.skipped = False


@contextmanager
def run_job(con, settings, job: str, alert_on_error: bool = True):
    cur = con.execute(
        "INSERT INTO job_runs(job, started_at, status) VALUES(?,?, 'running')", (job, now_iso())
    )
    run_id = cur.lastrowid
    res = JobResult()
    try:
        yield res
    except Exception as exc:
        tb = traceback.format_exc()
        con.execute(
            "UPDATE job_runs SET finished_at=?, status='error', detail=? WHERE run_id=?",
            (now_iso(), tb[-4000:], run_id),
        )
        log.error("job %s failed: %s", job, tb)
        if alert_on_error:
            alerts.notify(settings, f"edgelab job FAILED: {job}", f"{type(exc).__name__}: {exc}"[:1000],
                          priority="high", tags="warning")
        raise
    else:
        con.execute(
            "UPDATE job_runs SET finished_at=?, status=?, rows_written=?, detail=? WHERE run_id=?",
            (now_iso(), "skipped" if res.skipped else "ok", res.rows, res.detail[:4000], run_id),
        )


def last_ok(con, job: str) -> str | None:
    row = con.execute(
        "SELECT MAX(finished_at) FROM job_runs WHERE job=? AND status='ok'", (job,)
    ).fetchone()
    return row[0] if row else None
