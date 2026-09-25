"""Builds runtime events in the R12 format (contracts/events/runtime-event.schema.json)."""

from __future__ import annotations

import os
import threading
import traceback

from .ids import new_event_id, new_span_id, new_trace_id

MAX_STACK = 16384


def make_event(
    config,
    kind: str,
    name: str,
    *,
    file_path: str = "",
    line: int = 0,
    start_ns: int,
    duration_ns: int = 0,
    trace_id: str | None = None,
    span_id: str | None = None,
    parent_span_id: str | None = None,
    status: str = "ok",
    error: dict | None = None,
    attrs: dict | None = None,
) -> dict:
    return {
        "v": 1,
        "event_id": new_event_id(),
        "trace_id": trace_id or new_trace_id(),
        "span_id": span_id or new_span_id(),
        "parent_span_id": parent_span_id,
        "kind": kind,
        "name": name,
        "file_path": file_path,
        "line": max(0, int(line or 0)),
        "start_ns": start_ns,
        "duration_ns": max(0, duration_ns),
        "status": status,
        "error": error,
        "attrs": attrs or {},
        "service": config.service,
        "pid": os.getpid(),
        "thread": threading.current_thread().name,
    }


def error_info(exc: BaseException) -> dict:
    try:
        message = str(exc)
    except Exception:  # noqa: BLE001 - a broken __str__ must not break reporting
        message = "?"
    stack = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    return {"type": type(exc).__name__, "message": message[:4096], "stack": stack[:MAX_STACK]}


class ProjectFiles:
    """Decides whether a file belongs to the user's project (and not to libraries or the agent itself)."""

    def __init__(self, project_root: str):
        self.root = self._norm(project_root).rstrip("/") + "/"
        self.agent_dir = self._norm(os.path.dirname(os.path.abspath(__file__))) + "/"
        self._cache: dict[str, bool] = {}

    @staticmethod
    def _norm(path: str) -> str:
        return os.path.normcase(os.path.abspath(path)).replace("\\", "/")

    def contains(self, filename: str) -> bool:
        cached = self._cache.get(filename)
        if cached is not None:
            return cached
        result = False
        if filename and not filename.startswith("<"):
            path = self._norm(filename)
            result = (
                path.startswith(self.root)
                and "/site-packages/" not in path
                and "/.venv/" not in path
                and not path.startswith(self.agent_dir)
            )
        self._cache[filename] = result
        return result

    def innermost_frame(self, frame):
        """The innermost frame of the stack that is in the project, or None."""
        while frame is not None:
            if self.contains(frame.f_code.co_filename):
                return frame
            frame = frame.f_back
        return None
