"""Reports functions that have been running for too long (where a program hangs)."""

from __future__ import annotations

import sys
import threading

from . import context
from .events import ProjectFiles, make_event
from .ids import now_ns


class Watchdog(threading.Thread):
    def __init__(self, config, emit, interval_s: float = 1.0):
        super().__init__(name="pv-agent-watchdog", daemon=True)
        self.config = config
        self.emit = emit
        self.interval_s = interval_s
        self.files = ProjectFiles(config.project_root)
        self._reported: set[str] = set()
        self._stop = threading.Event()

    def run(self) -> None:
        while not self._stop.wait(self.interval_s):
            self.check()

    def stop(self) -> None:
        self._stop.set()

    def check(self) -> None:
        limit_ns = self.config.stall_ms * 1_000_000
        now = now_ns()
        frames = sys._current_frames()
        for ident, span in context.snapshot_open_spans():
            if span.trace_id is None or span.span_id in self._reported or now - span.start_ns <= limit_ns:
                continue
            self._reported.add(span.span_id)
            frame = self.files.innermost_frame(frames.get(ident))
            self.emit(
                make_event(
                    self.config,
                    "stall",
                    span.name,
                    file_path=frame.f_code.co_filename if frame else span.file_path,
                    line=frame.f_lineno if frame else span.line,
                    start_ns=span.start_ns,
                    duration_ns=now - span.start_ns,
                    trace_id=span.trace_id,
                    parent_span_id=span.span_id,
                )
            )
        if len(self._reported) > 100_000:
            self._reported.clear()
