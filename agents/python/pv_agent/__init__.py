"""Project Visualizer runtime agent: pv_agent.start() or `python -m pv_agent run app.py`."""

from __future__ import annotations

import atexit
import sys

__version__ = "0.1.0"

_state: dict[str, object] = {}


def start(config=None) -> bool:
    """Starts recording; False (with a warning) when no token is configured. Calling it twice is harmless."""
    if _state:
        return True
    from . import errors
    from .config import load_config
    from .tracer import Tracer
    from .transport import Transport
    from .watchdog import Watchdog

    config = config or load_config()
    if config is None:
        print("pv_agent: PV_RUNTIME_TOKEN is not set; runtime recording is off.", file=sys.stderr)
        return False
    transport = Transport(config)
    tracer = Tracer(config, transport.emit)
    watchdog = Watchdog(config, transport.emit)
    tracer.start()
    watchdog.start()
    errors.install(transport.emit, config)
    _state.update(config=config, transport=transport, tracer=tracer, watchdog=watchdog)
    atexit.register(stop)
    return True


def stop() -> None:
    if not _state:
        return
    from . import errors

    errors.uninstall()
    _state["tracer"].stop()
    _state["watchdog"].stop()
    _state["transport"].close()
    _state.clear()


def emit(event: dict) -> None:
    """Sends an event through the running agent (used by the middleware and wrappers)."""
    transport = _state.get("transport")
    if transport:
        transport.emit(event)


def PvWsgiMiddleware(app):
    from .web import PvWsgiMiddleware as Middleware

    return Middleware(app, emit, _state["config"]) if _state else app


def PvAsgiMiddleware(app):
    from .web import PvAsgiMiddleware as Middleware

    return Middleware(app, emit, _state["config"]) if _state else app


def wrap_connection(conn):
    from .dbapi import wrap_connection as wrap

    return wrap(conn, emit, _state["config"]) if _state else conn
