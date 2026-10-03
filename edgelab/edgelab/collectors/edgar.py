"""SEC EDGAR collector.

Discovery: the 'latest filings' Atom feed (browse-edgar?action=getcurrent), polled every few
minutes per tracked form type. Enrichment: data.sec.gov submissions JSON gives the exact
acceptanceDateTime and 8-K item numbers. Gap check: the daily form index lists every filing
of a day, so after each day we can prove nothing was missed.

SEC fair-access rules: declared User-Agent with contact email, <=10 requests/second.
"""
from __future__ import annotations

import gzip
import hashlib
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET_xml

from ..db import insert_ignore, tx, upsert
from ..timeutil import ET, UTC, iso, now_iso
from .http import RateLimitedSession

log = logging.getLogger(__name__)

ATOM = "{http://www.w3.org/2005/Atom}"
CURRENT_URL = ("https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type={form}"
               "&company=&dateb=&owner=include&start={start}&count=100&output=atom")
SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik:010d}.json"
TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json"
DAILY_INDEX_URL = "https://www.sec.gov/Archives/edgar/daily-index/{y}/QTR{q}/form.{ymd}.idx"
ACC_RE = re.compile(r"(\d{10}-\d{2}-\d{6})")


def session(settings) -> RateLimitedSession:
    ua = os.environ.get(settings["sec"]["user_agent_env"])
    if not ua or "@" not in ua:
        raise RuntimeError("Set EDGELAB_SEC_UA to 'Name email@domain' (SEC requires a contact email)")
    return RateLimitedSession(settings["sec"]["max_requests_per_sec"],
                              headers={"User-Agent": ua, "Accept-Encoding": "gzip, deflate"})


# ------------------------------------------------------------------ parsing (pure, tested)
def parse_atom(xml_text: str) -> list[dict]:
    """Parse the getcurrent Atom feed into filing stubs.

    Entry title looks like: '8-K - APPLE INC (0000320193) (Filer)'.
    Entry 'updated' is the acceptance time with ET offset. Accession number sits in the id/link.
    """
    root = ET_xml.fromstring(xml_text)
    out = []
    for e in root.findall(f"{ATOM}entry"):
        title = (e.findtext(f"{ATOM}title") or "").strip()
        updated = (e.findtext(f"{ATOM}updated") or "").strip()
        link_el = e.find(f"{ATOM}link")
        link = link_el.get("href") if link_el is not None else ""
        eid = e.findtext(f"{ATOM}id") or ""
        m = ACC_RE.search(eid) or ACC_RE.search(link)
        cat = e.find(f"{ATOM}category")
        form = cat.get("term") if cat is not None else title.split(" - ")[0]
        tm = re.match(r"^(.*?) - (.*) \((\d{1,10})\) \((\w[\w ]*)\)$", title)
        if not m or not tm:
            continue
        role = tm.group(4)
        if role not in ("Filer", "Issuer", "Subject"):
            # Form 4: the Reporting person entry duplicates the Issuer entry
            continue
        accepted = datetime.fromisoformat(updated) if updated else None
        summary = e.findtext(f"{ATOM}summary") or ""
        items = ",".join(re.findall(r"Item (\d+\.\d+)", summary)) or None
        out.append({
            "accession": m.group(1),
            "cik": int(tm.group(3)),
            "company": tm.group(2).strip(),
            "form_type": form.strip(),
            "accepted_ts": iso(accepted.astimezone(UTC)) if accepted else None,
            "index_url": link,
            "items": items,
            "role": role,
        })
    return out


def parse_daily_index(text: str) -> list[dict]:
    """form.YYYYMMDD.idx: fixed-width rows 'Form Type  Company Name  CIK  Date Filed  File Name'."""
    rows, started = [], False
    for line in text.splitlines():
        if line.startswith("-----"):
            started = True
            continue
        if not started or not line.strip():
            continue
        m = re.match(r"^(.+?)\s{2,}(.+?)\s{2,}(\d+)\s{2,}(\d{8}|\d{4}-\d{2}-\d{2})\s{2,}(\S+)$", line.rstrip())
        if not m:
            continue
        acc = ACC_RE.search(m.group(5))
        if not acc:
            continue
        d = m.group(4).replace("-", "")
        rows.append({"form_type": m.group(1).strip(), "company": m.group(2).strip(),
                     "cik": int(m.group(3)), "filed_date": f"{d[:4]}-{d[4:6]}-{d[6:]}",
                     "accession": acc.group(1)})
    return rows


def parse_submissions_recent(js: dict, acceptance_tz: str = "ET") -> dict[str, dict]:
    """Map accession -> {accepted_ts, filed_date, items, primary_doc} from submissions JSON.

    acceptance_tz: the clock acceptanceDateTime is written in. It carries a 'Z' suffix but is
    widely reported to be Eastern time. `edgelab smoke` measures this on the live feed by
    comparing against the Atom feed (which has an explicit offset) and stores the answer in
    meta.sec_acceptance_tz. Never trust either assumption untested.
    """
    rec = js.get("filings", {}).get("recent", {})
    out = {}
    n = len(rec.get("accessionNumber", []))
    for i in range(n):
        acc = rec["accessionNumber"][i]
        adt = rec.get("acceptanceDateTime", [None] * n)[i]
        accepted = None
        if adt:
            naive = datetime.fromisoformat(adt.replace("Z", "").split(".")[0])
            accepted = iso(naive.replace(tzinfo=ET if acceptance_tz == "ET" else UTC))
        out[acc] = {
            "accepted_ts": accepted,
            "filed_date": rec.get("filingDate", [None] * n)[i],
            "items": rec.get("items", [""] * n)[i] or None,
            "primary_doc": rec.get("primaryDocument", [None] * n)[i],
            "form_type": rec.get("form", [None] * n)[i],
        }
    return out


def conservative_available_at(filed_date: str) -> str:
    """When only the filing date is known: assume public at 22:00 ET that day (EDGAR closes),
    which pushes the first tradable open to the next session. Never earlier than truth."""
    d = datetime.fromisoformat(filed_date).replace(hour=22, tzinfo=ET)
    return iso(d)


# ------------------------------------------------------------------ jobs
def cik_symbol_map(con) -> dict[int, str]:
    return {r[0]: r[1] for r in con.execute(
        "SELECT cik, symbol FROM instruments WHERE cik IS NOT NULL ORDER BY status='active' ASC")}


def refresh_tickers(con, settings, sess=None) -> int:
    sess = sess or session(settings)
    js = sess.get(TICKERS_URL).json()
    fields = js["fields"]
    rows = [dict(zip(fields, r)) for r in js["data"]]
    n = 0
    with tx(con):
        for r in rows:
            con.execute(
                "INSERT INTO instruments(symbol, name, exchange, cik, updated_at) VALUES(?,?,?,?,?) "
                "ON CONFLICT(symbol) DO UPDATE SET cik=excluded.cik, "
                "name=COALESCE(instruments.name, excluded.name), updated_at=excluded.updated_at",
                (r["ticker"].replace("-", "."), r["name"], r.get("exchange"), int(r["cik"]), now_iso()))
            n += 1
    return n


def poll_current(con, settings, sess=None, max_pages: int = 3) -> int:
    """Poll the latest-filings feed for each tracked form type."""
    sess = sess or session(settings)
    cikmap = cik_symbol_map(con)
    total = 0
    for form in settings["sec"]["forms_tracked"]:
        for page in range(max_pages):
            xml_text = sess.get(CURRENT_URL.format(form=form.replace(" ", "+"), start=page * 100)).text
            stubs = [s for s in parse_atom(xml_text) if s["form_type"] == form]
            if not stubs:
                break
            rows = [{
                "accession": s["accession"], "cik": s["cik"], "symbol": cikmap.get(s["cik"]),
                "company": s["company"], "form_type": s["form_type"], "items": s["items"],
                "accepted_ts": s["accepted_ts"], "filed_date": None,
                "available_at": s["accepted_ts"] or now_iso(),
                "primary_doc_url": None, "index_url": s["index_url"], "text_sha256": None,
                "text_path": None, "discovered_via": "atom_feed", "ingested_at": now_iso(),
            } for s in stubs]
            with tx(con):
                new = insert_ignore(con, "filings", rows)
            total += new
            if new < len(rows):   # reached filings we already have
                break
    return total


def enrich_filings(con, settings, sess=None, limit: int = 300) -> int:
    """Fill exact acceptance time, items and primary doc from submissions JSON."""
    sess = sess or session(settings)
    pending = con.execute(
        "SELECT accession, cik FROM filings WHERE filed_date IS NULL AND ingested_at >= datetime('now','-3 days') "
        "ORDER BY ingested_at DESC LIMIT ?",
        (limit,)).fetchall()
    by_cik: dict[int, list[str]] = {}
    for r in pending:
        by_cik.setdefault(r["cik"], []).append(r["accession"])
    tz = con.execute("SELECT value FROM meta WHERE key='sec_acceptance_tz'").fetchone()
    tz = tz[0] if tz else "ET"
    n = 0
    for cik, accs in by_cik.items():
        try:
            meta = parse_submissions_recent(sess.get(SUBMISSIONS_URL.format(cik=cik)).json(), tz)
        except Exception as exc:
            log.warning("submissions fetch failed cik=%s: %s", cik, exc)
            continue
        with tx(con):
            for acc in accs:
                m = meta.get(acc)
                if not m:
                    continue
                url = (f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc.replace('-', '')}/{m['primary_doc']}"
                       if m["primary_doc"] else None)
                con.execute(
                    "UPDATE filings SET filed_date=?, items=COALESCE(?, items), primary_doc_url=?, "
                    "accepted_ts=COALESCE(?, accepted_ts), available_at=COALESCE(?, available_at) "
                    "WHERE accession=?",
                    (m["filed_date"], m["items"], url, m["accepted_ts"], m["accepted_ts"], acc))
                n += 1
    return n


def fetch_texts(con, settings, sess=None, limit: int = 200) -> int:
    """Download primary documents for text-relevant forms and store them gzipped on disk."""
    sess = sess or session(settings)
    forms = settings["sec"]["store_text_forms"]
    q = (f"SELECT accession, primary_doc_url FROM filings WHERE text_path IS NULL AND primary_doc_url IS NOT NULL "
         f"AND form_type IN ({','.join('?' for _ in forms)}) ORDER BY available_at DESC LIMIT ?")
    rows = con.execute(q, (*forms, limit)).fetchall()
    base = settings.data_dir / "filings"
    n = 0
    for r in rows:
        try:
            body = sess.get(r["primary_doc_url"]).content
        except Exception as exc:
            log.warning("text fetch failed %s: %s", r["accession"], exc)
            continue
        sha = hashlib.sha256(body).hexdigest()
        p = base / r["accession"][:10] / f"{r['accession']}.gz"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(gzip.compress(body))
        con.execute("UPDATE filings SET text_path=?, text_sha256=? WHERE accession=?",
                    (str(p.relative_to(settings.data_dir)), sha, r["accession"]))
        n += 1
    return n


def reconcile_day(con, settings, day: str, sess=None) -> dict:
    """Compare the official daily index with what we captured; backfill anything missed.

    Returns counts. A non-zero `missed` is logged to data_gaps (and backfilled) so a silent
    gap becomes a visible, counted one.
    """
    sess = sess or session(settings)
    y, mth, _ = day.split("-")
    q = (int(mth) - 1) // 3 + 1
    url = DAILY_INDEX_URL.format(y=y, q=q, ymd=day.replace("-", ""))
    text = sess.get(url).text
    official = [r for r in parse_daily_index(text) if r["form_type"] in settings["sec"]["forms_tracked"]]
    have = {r[0] for r in con.execute("SELECT accession FROM filings")}
    missed = [r for r in official if r["accession"] not in have]
    cikmap = cik_symbol_map(con)
    rows = [{
        "accession": r["accession"], "cik": r["cik"], "symbol": cikmap.get(r["cik"]),
        "company": r["company"], "form_type": r["form_type"], "items": None, "accepted_ts": None,
        "filed_date": None, "available_at": conservative_available_at(r["filed_date"]),
        "primary_doc_url": None, "index_url": None, "text_sha256": None, "text_path": None,
        "discovered_via": "daily_index", "ingested_at": now_iso(),
    } for r in missed]
    with tx(con):
        insert_ignore(con, "filings", rows)
        if missed:
            con.execute("INSERT INTO data_gaps(detected_at, source, gap_start, gap_end, detail) VALUES(?,?,?,?,?)",
                        (now_iso(), "edgar_feed", day, day, f"{len(missed)} of {len(official)} filings missed by feed"))
    return {"official": len(official), "missed": len(missed)}


def backfill_quarter_index(con, settings, year: int, qtr: int, sess=None) -> int:
    """Historical filings list (no acceptance time; conservative availability)."""
    sess = sess or session(settings)
    url = f"https://www.sec.gov/Archives/edgar/full-index/{year}/QTR{qtr}/form.idx"
    rows = [r for r in parse_daily_index(sess.get(url).text) if r["form_type"] in settings["sec"]["forms_tracked"]]
    cikmap = cik_symbol_map(con)
    out = [{
        "accession": r["accession"], "cik": r["cik"], "symbol": cikmap.get(r["cik"]),
        "company": r["company"], "form_type": r["form_type"], "items": None, "accepted_ts": None,
        "filed_date": r["filed_date"], "available_at": conservative_available_at(r["filed_date"]),
        "primary_doc_url": None, "index_url": None, "text_sha256": None, "text_path": None,
        "discovered_via": "quarterly_index", "ingested_at": now_iso(),
    } for r in rows]
    with tx(con):
        return insert_ignore(con, "filings", out)
