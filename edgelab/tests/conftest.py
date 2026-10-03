import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from edgelab.config import load_settings  # noqa: E402
from edgelab.db import connect, init_db  # noqa: E402


@pytest.fixture
def settings(tmp_path):
    return load_settings(overrides={"project": {"data_dir": str(tmp_path)}})


@pytest.fixture
def con(settings):
    c = connect(settings.db_path)
    init_db(c)
    yield c
    c.close()
