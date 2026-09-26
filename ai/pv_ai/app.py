"""FastAPI app. Features plug in by folder: pv_ai/features/<name>/router.py exposing `router`."""

import importlib
import pkgutil

from fastapi import Depends, FastAPI
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

import pv_ai.features
from pv_ai import __version__
from pv_ai.core.config import get_settings
from pv_ai.core.errors import install_error_handlers
from pv_ai.core.logging import setup_logging
from pv_ai.core.security import require_internal


def feature_names() -> list[str]:
    return sorted(
        m.name for m in pkgutil.iter_modules(pv_ai.features.__path__) if not m.name.startswith("_")
    )


def create_app() -> FastAPI:
    setup_logging(get_settings().log_level)
    app = FastAPI(title="pv-ai", version=__version__)
    install_error_handlers(app)

    @app.get("/healthz")
    def healthz() -> dict:
        return {"ok": True}

    @app.get("/metrics")
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    for name in feature_names():
        module = importlib.import_module(f"pv_ai.features.{name}.router")
        app.include_router(module.router, dependencies=[Depends(require_internal)])
    return app


app = create_app()
