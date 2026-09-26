"""One trained model per project and kind, on disk (joblib) with a small meta.json."""

import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib


def models_dir() -> Path:
    configured = os.environ.get("PV_AI_MODELS_DIR", "")
    return Path(configured) if configured else Path.home() / ".pv_ai_models"


def _folder(project_key: str, kind: str) -> Path:
    digest = hashlib.sha1(project_key.encode("utf-8")).hexdigest()[:16]
    return models_dir() / digest / kind


def save(project_key: str, kind: str, model: Any, meta: dict) -> str:
    folder = _folder(project_key, kind)
    folder.mkdir(parents=True, exist_ok=True)
    base = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")[:-3]
    version, n = base, 1
    while (folder / f"{version}.joblib").exists():  # two saves in one millisecond
        n += 1
        version = f"{base}-{n}"
    joblib.dump(model, folder / f"{version}.joblib")
    (folder / "meta.json").write_text(json.dumps({**meta, "version": version}), encoding="utf-8")
    return version


def load_latest(project_key: str, kind: str) -> tuple[Any, dict] | None:
    folder = _folder(project_key, kind)
    meta_file = folder / "meta.json"
    if not meta_file.is_file():
        return None
    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    model_file = folder / f"{meta['version']}.joblib"
    if not model_file.is_file():
        return None
    return joblib.load(model_file), meta
