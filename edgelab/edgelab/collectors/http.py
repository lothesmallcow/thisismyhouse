"""HTTP session with polite rate limiting and retries."""
from __future__ import annotations

import threading
import time

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class RateLimitedSession:
    def __init__(self, max_per_sec: float, headers: dict | None = None) -> None:
        self.min_interval = 1.0 / max_per_sec
        self._last = 0.0
        self._lock = threading.Lock()
        self.s = requests.Session()
        retry = Retry(total=5, backoff_factor=1.5, status_forcelist=(429, 500, 502, 503, 504),
                      allowed_methods=("GET",), respect_retry_after_header=True)
        self.s.mount("https://", HTTPAdapter(max_retries=retry))
        if headers:
            self.s.headers.update(headers)

    def get(self, url: str, **kw) -> requests.Response:
        with self._lock:
            wait = self.min_interval - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.monotonic()
        kw.setdefault("timeout", 30)
        r = self.s.get(url, **kw)
        r.raise_for_status()
        return r
