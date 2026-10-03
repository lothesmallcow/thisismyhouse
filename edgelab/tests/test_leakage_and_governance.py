import re
from pathlib import Path

import pytest

from edgelab.governance import GateError, assert_holdout_unlocked

PKG = Path(__file__).resolve().parent.parent / "edgelab"


def test_no_hindsight_tables_in_signal_code():
    """Hindsight data (reviews, tags, narratives) must never feed a predictive feature."""
    offenders = []
    for folder in ("strategies", "executor", "collectors"):
        for f in (PKG / folder).glob("*.py"):
            if re.search(r"\bhs_\w+", f.read_text()):
                offenders.append(str(f))
    assert not offenders, offenders


def test_holdout_locked_by_default():
    with pytest.raises(GateError):
        assert_holdout_unlocked("H999")
