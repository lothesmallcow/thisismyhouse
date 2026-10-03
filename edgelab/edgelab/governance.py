"""Research governance enforced in code: pre-registration hashes and the holdout lock."""
from __future__ import annotations

import hashlib
import re
import subprocess
from pathlib import Path

from .config import PROJECT_ROOT
from .db import tx
from .timeutil import now_iso

HYP_DIR = PROJECT_ROOT / "HYPOTHESES"
UNLOCK_DIR = PROJECT_ROOT / "HYPOTHESES" / "holdout_unlocks"


class GateError(RuntimeError):
    pass


def assert_holdout_unlocked(hyp_id: str) -> None:
    """The final holdout may be touched once per hypothesis, only after Lorenzo approves.
    Approval = a committed file HYPOTHESES/holdout_unlocks/<hyp_id>.md containing 'APPROVED-BY: Lorenzo'.
    After use, the unlock is consumed (renamed) so a second look needs a second approval."""
    f = UNLOCK_DIR / f"{hyp_id}.md"
    if not f.exists() or "APPROVED-BY: Lorenzo" not in f.read_text():
        raise GateError(f"holdout locked for {hyp_id}: needs {f.relative_to(PROJECT_ROOT)} with 'APPROVED-BY: Lorenzo'")
    f.rename(f.with_suffix(".used.md"))


def _git(*args: str) -> str | None:
    try:
        return subprocess.check_output(["git", *args], cwd=PROJECT_ROOT, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return None


def register(con, prereg_path: str) -> dict:
    """Freeze a pre-registration: hash the file, record the git commit that contains it.
    The file must be committed and unmodified, so the timestamp is provable."""
    p = (PROJECT_ROOT / prereg_path).resolve()
    text = p.read_text()
    m = re.search(r"^hyp_id:\s*(H\d{3})", text, re.M)
    t = re.search(r"^title:\s*(.+)$", text, re.M)
    if not m or not t:
        raise GateError("pre-registration needs 'hyp_id: H###' and 'title:' lines")
    if re.search(r"^status:\s*draft", text, re.M):
        raise GateError("set 'status: registered' in the file and commit it before registering")
    rel = str(p.relative_to(PROJECT_ROOT.parent)) if _git("rev-parse", "--show-toplevel") else str(p)
    dirty = _git("status", "--porcelain", "--", str(p))
    if dirty:
        raise GateError(f"{prereg_path} has uncommitted changes; commit first so the timestamp is provable")
    commit = _git("log", "-n", "1", "--format=%H", "--", str(p))
    sha = hashlib.sha256(text.encode()).hexdigest()
    with tx(con):
        con.execute(
            "INSERT INTO hypotheses(hyp_id, title, status, prereg_path, prereg_sha256, git_commit, registered_at, updated_at) "
            "VALUES(?,?, 'registered', ?,?,?,?,?) ON CONFLICT(hyp_id) DO UPDATE SET "
            "prereg_sha256=excluded.prereg_sha256, git_commit=excluded.git_commit, updated_at=excluded.updated_at",
            (m.group(1), t.group(1).strip(), rel, sha, commit, now_iso(), now_iso()))
    return {"hyp_id": m.group(1), "sha256": sha, "commit": commit}


def verify_prereg_unchanged(con, hyp_id: str) -> bool:
    row = con.execute("SELECT prereg_path, prereg_sha256 FROM hypotheses WHERE hyp_id=?", (hyp_id,)).fetchone()
    if not row:
        return False
    p = PROJECT_ROOT.parent / row["prereg_path"]
    if not p.exists():
        p = Path(row["prereg_path"])
    return hashlib.sha256(p.read_text().encode()).hexdigest() == row["prereg_sha256"]
