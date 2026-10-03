"""Settings loader. YAML for parameters, environment variables for secrets."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SETTINGS = PROJECT_ROOT / "config" / "settings.yaml"

_ENV_PATTERN = re.compile(r"\$\{(\w+)(?::-([^}]*))?\}")


def _expand(value: Any) -> Any:
    if isinstance(value, str):
        return _ENV_PATTERN.sub(lambda m: os.environ.get(m.group(1), m.group(2) or ""), value)
    if isinstance(value, dict):
        return {k: _expand(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_expand(v) for v in value]
    return value


def load_dotenv(path: Path) -> None:
    """Minimal .env loader (KEY=VALUE lines). Existing environment wins."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


@dataclass
class Settings:
    raw: dict
    path: Path = field(default=DEFAULT_SETTINGS)

    def __getitem__(self, key: str) -> Any:
        return self.raw[key]

    def get(self, key: str, default: Any = None) -> Any:
        return self.raw.get(key, default)

    @property
    def data_dir(self) -> Path:
        d = Path(self.raw["project"]["data_dir"])
        if not d.is_absolute():
            d = PROJECT_ROOT / d
        return d

    @property
    def db_path(self) -> Path:
        return self.data_dir / self.raw["project"]["db_file"]

    def secret(self, env_name_key: str, section: str) -> str | None:
        env_name = self.raw[section][env_name_key]
        return os.environ.get(env_name) or None


def load_settings(path: Path | str | None = None, overrides: dict | None = None) -> Settings:
    load_dotenv(PROJECT_ROOT / ".env")
    p = Path(path) if path else Path(os.environ.get("EDGELAB_SETTINGS", DEFAULT_SETTINGS))
    raw = _expand(yaml.safe_load(p.read_text()))
    if overrides:
        _deep_update(raw, overrides)
    return Settings(raw=raw, path=p)


def _deep_update(base: dict, upd: dict) -> None:
    for k, v in upd.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            _deep_update(base[k], v)
        else:
            base[k] = v
