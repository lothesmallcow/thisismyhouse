"""Free macro/factor data: VIX from FRED, Fama-French 5 factors + momentum from Ken French."""
from __future__ import annotations

import io
import zipfile

import pandas as pd

from ..db import tx, upsert
from ..timeutil import now_iso
from .http import RateLimitedSession

FRED_VIX = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS"
FF5 = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_5_Factors_2x3_daily_CSV.zip"
MOM = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Momentum_Factor_daily_CSV.zip"


def parse_fred_csv(text: str) -> dict[str, float]:
    df = pd.read_csv(io.StringIO(text))
    df.columns = ["date", "value"]
    df = df[pd.to_numeric(df["value"], errors="coerce").notna()]
    return {str(d)[:10]: float(v) for d, v in zip(df["date"], df["value"])}


def parse_french_zip(content: bytes) -> pd.DataFrame:
    """Ken French CSVs have a text preamble and footer; keep rows whose first field is YYYYMMDD."""
    with zipfile.ZipFile(io.BytesIO(content)) as z:
        text = z.read(z.namelist()[0]).decode("latin-1")
    lines = text.splitlines()
    header_idx = next(i for i, l in enumerate(lines) if l.strip().startswith(",") or l.lower().startswith(",mkt"))
    header = [h.strip() for h in lines[header_idx].split(",")]
    rows = []
    for l in lines[header_idx + 1:]:
        parts = [p.strip() for p in l.split(",")]
        if len(parts) != len(header) or not parts[0].isdigit() or len(parts[0]) != 8:
            if rows:
                break
            continue
        rows.append(parts)
    df = pd.DataFrame(rows, columns=["date"] + header[1:])
    df["date"] = pd.to_datetime(df["date"], format="%Y%m%d").dt.strftime("%Y-%m-%d")
    for c in df.columns[1:]:
        df[c] = df[c].astype(float) / 100.0
    return df.set_index("date")


def update_vix(con) -> dict[str, float]:
    sess = RateLimitedSession(2)
    return parse_fred_csv(sess.get(FRED_VIX).text)


def update_factors(con) -> int:
    sess = RateLimitedSession(1)
    ff = parse_french_zip(sess.get(FF5).content)
    mom = parse_french_zip(sess.get(MOM).content)
    df = ff.join(mom, how="left")
    mom_col = [c for c in df.columns if c.lower().startswith("mom")]
    rows = [{"f_date": d, "mkt_rf": r.get("Mkt-RF"), "smb": r.get("SMB"), "hml": r.get("HML"),
             "rmw": r.get("RMW"), "cma": r.get("CMA"), "mom": r.get(mom_col[0]) if mom_col else None,
             "rf": r.get("RF"), "source": "ken_french", "ingested_at": now_iso()}
            for d, r in df.iterrows()]
    with tx(con):
        return upsert(con, "factors_daily", rows, ["f_date"])
