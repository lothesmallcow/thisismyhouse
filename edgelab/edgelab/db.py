"""SQLite access. One file, WAL mode, foreign keys on."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterable

SCHEMA_PATH = Path(__file__).with_name("schema.sql")
SCHEMA_VERSION = "1"


def connect(path: Path | str) -> sqlite3.Connection:
    path = Path(path)
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=60, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("PRAGMA busy_timeout=60000")
    return con


def init_db(con: sqlite3.Connection) -> None:
    con.executescript(SCHEMA_PATH.read_text())
    con.execute(
        "INSERT INTO meta(key, value) VALUES('schema_version', ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (SCHEMA_VERSION,),
    )


@contextmanager
def tx(con: sqlite3.Connection):
    if con.in_transaction:          # nested: use a savepoint so inner failures roll back cleanly
        name = f"sp{id(object())}"
        con.execute(f"SAVEPOINT {name}")
        try:
            yield con
        except BaseException:
            con.execute(f"ROLLBACK TO {name}")
            con.execute(f"RELEASE {name}")
            raise
        else:
            con.execute(f"RELEASE {name}")
        return
    con.execute("BEGIN IMMEDIATE")
    try:
        yield con
    except BaseException:
        con.execute("ROLLBACK")
        raise
    else:
        con.execute("COMMIT")


def upsert(con: sqlite3.Connection, table: str, rows: Iterable[dict], keys: list[str]) -> int:
    """Insert rows; on primary-key conflict update the non-key columns."""
    rows = list(rows)
    if not rows:
        return 0
    cols = list(rows[0].keys())
    placeholders = ",".join("?" for _ in cols)
    updates = ",".join(f"{c}=excluded.{c}" for c in cols if c not in keys)
    conflict = f"ON CONFLICT({','.join(keys)}) DO " + (f"UPDATE SET {updates}" if updates else "NOTHING")
    sql = f"INSERT INTO {table}({','.join(cols)}) VALUES({placeholders}) {conflict}"
    con.executemany(sql, [tuple(r[c] for c in cols) for r in rows])
    return len(rows)


def insert_ignore(con: sqlite3.Connection, table: str, rows: Iterable[dict]) -> int:
    rows = list(rows)
    if not rows:
        return 0
    cols = list(rows[0].keys())
    sql = f"INSERT OR IGNORE INTO {table}({','.join(cols)}) VALUES({','.join('?' for _ in cols)})"
    before = con.total_changes
    con.executemany(sql, [tuple(r[c] for c in cols) for r in rows])
    return con.total_changes - before


def one(con: sqlite3.Connection, sql: str, params: tuple = ()) -> Any:
    row = con.execute(sql, params).fetchone()
    return None if row is None else row[0]


def dumps(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, default=str)
