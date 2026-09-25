"""Reports uncaught exceptions (main thread and other threads) as error events."""

from __future__ import annotations

import sys
import threading

from .events import ProjectFiles, error_info, make_event
from .ids import now_ns

_previous: dict[str, object] = {}


def _report(emit, config, files: ProjectFiles, exc: BaseException) -> None:
    tb = exc.__traceback__
    frame, line = None, 0
    while tb is not None:  # the innermost project frame of the traceback
        if files.contains(tb.tb_frame.f_code.co_filename):
            frame, line = tb.tb_frame, tb.tb_lineno
        tb = tb.tb_next
    emit(
        make_event(
            config,
            "error",
            type(exc).__name__,
            file_path=frame.f_code.co_filename if frame else "",
            line=line,
            start_ns=now_ns(),
            status="error",
            error=error_info(exc),
        )
    )


def install(emit, config) -> None:
    if _previous:
        return
    files = ProjectFiles(config.project_root)
    _previous["sys"] = sys.excepthook
    _previous["threading"] = threading.excepthook

    def sys_hook(exc_type, exc, tb):
        try:
            _report(emit, config, files, exc)
        finally:
            _previous["sys"](exc_type, exc, tb)

    def thread_hook(args):
        try:
            if args.exc_value is not None:
                _report(emit, config, files, args.exc_value)
        finally:
            _previous["threading"](args)

    sys.excepthook = sys_hook
    threading.excepthook = thread_hook


def uninstall() -> None:
    if not _previous:
        return
    sys.excepthook = _previous.pop("sys")
    threading.excepthook = _previous.pop("threading")
