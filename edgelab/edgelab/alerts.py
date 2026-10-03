"""Alerts: ntfy push to Lorenzo's phone + healthchecks.io dead-man pings.

A dead VPS cannot alert about itself, so the dead-man switch (healthchecks.io) is the
primary guard: it expects a ping on schedule and emails/pushes when pings stop.
"""
from __future__ import annotations

import logging
import os

import requests

log = logging.getLogger(__name__)


def notify(settings, title: str, message: str, priority: str = "default", tags: str = "") -> bool:
    topic = os.environ.get(settings["alerts"]["ntfy_topic_env"])
    if not topic:
        log.warning("ALERT (ntfy not configured): %s | %s", title, message)
        return False
    try:
        r = requests.post(
            f"{settings['alerts']['ntfy_server'].rstrip('/')}/{topic}",
            data=message.encode("utf-8"),
            headers={"Title": title[:200], "Priority": priority, "Tags": tags},
            timeout=15,
        )
        r.raise_for_status()
        return True
    except Exception as exc:  # alerts must never crash the job that raised them
        log.error("ntfy failed: %s (alert was: %s | %s)", exc, title, message)
        return False


def hc_ping(settings, suffix: str = "", body: str = "") -> bool:
    """suffix: '' success, '/start', '/fail'. Check slug can be appended for per-job checks."""
    url = os.environ.get(settings["alerts"]["healthchecks_url_env"])
    if not url:
        return False
    try:
        requests.post(url.rstrip("/") + suffix, data=body[:10000].encode("utf-8"), timeout=15)
        return True
    except Exception as exc:
        log.error("healthchecks ping failed: %s", exc)
        return False
