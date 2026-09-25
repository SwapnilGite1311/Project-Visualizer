"""Agent settings from environment variables."""

from __future__ import annotations

import os
import sys
from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    url: str
    token: str
    project_root: str
    service: str
    sample_rate: float
    stall_ms: int
    max_queue: int
    flush_ms: int


def _number(env: Mapping[str, str], key: str, default, cast, low=None, high=None):
    try:
        value = cast(env[key])
    except (KeyError, ValueError, TypeError):
        return default
    if (low is not None and value < low) or (high is not None and value > high):
        return default
    return value


def load_config(env: Mapping[str, str] | None = None) -> Config | None:
    """None when PV_RUNTIME_TOKEN is missing (the agent then stays off)."""
    env = os.environ if env is None else env
    token = env.get("PV_RUNTIME_TOKEN", "")
    if not token:
        return None
    root = os.path.normpath(os.path.abspath(env.get("PV_PROJECT_ROOT") or os.getcwd())).replace("\\", "/")
    service = env.get("PV_SERVICE") or (os.path.basename(sys.argv[0]) if sys.argv and sys.argv[0] else "python")
    return Config(
        url=env.get("PV_RUNTIME_URL", "http://127.0.0.1:47100").rstrip("/"),
        token=token,
        project_root=root,
        service=service,
        sample_rate=_number(env, "PV_SAMPLE_RATE", 1.0, float, 0.0, 1.0),
        stall_ms=_number(env, "PV_STALL_MS", 5000, int, 1),
        max_queue=_number(env, "PV_MAX_QUEUE", 20000, int, 1),
        flush_ms=_number(env, "PV_FLUSH_MS", 200, int, 1),
    )
