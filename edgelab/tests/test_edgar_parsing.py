from edgelab.collectors.edgar import (conservative_available_at, parse_atom, parse_daily_index,
                                      parse_submissions_recent)
from edgelab.timeutil import first_tradable_open

ATOM = """<?xml version="1.0" encoding="ISO-8859-1" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>Latest Filings</title>
<entry>
<title>8-K - Apple Inc. (0000320193) (Filer)</title>
<link rel="alternate" type="text/html" href="https://www.sec.gov/Archives/edgar/data/320193/000032019326000105/0000320193-26-000105-index.htm"/>
<summary type="html"> &lt;b&gt;Filed:&lt;/b&gt; 2026-10-02 &lt;b&gt;AccNo:&lt;/b&gt; 0000320193-26-000105 &lt;b&gt;Size:&lt;/b&gt; 345 KB&lt;br&gt;Item 2.02: Results of Operations&lt;br&gt;Item 9.01: Financial Statements and Exhibits</summary>
<updated>2026-10-02T16:31:07-04:00</updated>
<category scheme="https://www.sec.gov/" label="form type" term="8-K"/>
<id>urn:tag:sec.gov,2008:accession-number=0000320193-26-000105</id>
</entry>
<entry>
<title>4 - Doe John (0001999999) (Reporting)</title>
<link rel="alternate" type="text/html" href="https://www.sec.gov/Archives/edgar/data/1999999/000199999926000001/0001999999-26-000001-index.htm"/>
<summary type="html">x</summary>
<updated>2026-10-02T16:40:00-04:00</updated>
<category scheme="https://www.sec.gov/" label="form type" term="4"/>
<id>urn:tag:sec.gov,2008:accession-number=0001999999-26-000001</id>
</entry>
</feed>"""

IDX = """Description:           Daily Index of EDGAR Dissemination Feed by Form Type
Last Data Received:    October 2, 2026

Form Type   Company Name                                                  CIK         Date Filed  File Name
---------------------------------------------------------------------------------------------------------------------------------------------
10-K             ACME CORP                                                     1234567     20261002    edgar/data/1234567/0001234567-26-000010.txt
NT 10-K          LATE FILER INC                                                7654321     20261002    edgar/data/7654321/0007654321-26-000003.txt
"""


def test_parse_atom_extracts_acceptance_items_and_skips_reporting_owner():
    rows = parse_atom(ATOM)
    assert len(rows) == 1
    r = rows[0]
    assert r["accession"] == "0000320193-26-000105"
    assert r["cik"] == 320193
    assert r["form_type"] == "8-K"
    assert r["items"] == "2.02,9.01"
    assert r["accepted_ts"] == "2026-10-02T20:31:07Z"
    assert first_tradable_open(r["accepted_ts"]) == "2026-10-05"


def test_parse_daily_index_handles_spaces_in_form_type():
    rows = parse_daily_index(IDX)
    assert [r["form_type"] for r in rows] == ["10-K", "NT 10-K"]
    assert rows[1]["accession"] == "0007654321-26-000003"
    assert rows[1]["filed_date"] == "2026-10-02"


def test_submissions_clock_interpretation():
    js = {"filings": {"recent": {"accessionNumber": ["a"], "acceptanceDateTime": ["2026-10-02T16:31:07.000Z"],
                                 "filingDate": ["2026-10-02"], "items": ["2.02"], "primaryDocument": ["x.htm"],
                                 "form": ["8-K"]}}}
    assert parse_submissions_recent(js, "ET")["a"]["accepted_ts"] == "2026-10-02T20:31:07Z"
    assert parse_submissions_recent(js, "UTC")["a"]["accepted_ts"] == "2026-10-02T16:31:07Z"


def test_conservative_availability_never_same_open():
    assert first_tradable_open(conservative_available_at("2026-10-02")) == "2026-10-05"
