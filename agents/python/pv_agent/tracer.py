"""Records calls of project functions with sys.monitoring (Python 3.12+), with low overhead elsewhere."""

from __future__ import annotations

import os
import random
import sys

from . import context
from .context import Span
from .events import ProjectFiles, error_info, make_event
from .ids import new_span_id, new_trace_id, now_ns

TOOL_IDS = (2, 3, 4)  # 2 = sys.monitoring.PROFILER_ID; 3 and 4 are free for tools


class Tracer:
    def __init__(self, config, emit):
        self.config = config
        self.emit = emit
        self.files = ProjectFiles(config.project_root)
        self.tool_id: int | None = None
        self._modules: dict[str, str] = {}

    def start(self) -> None:
        mon = sys.monitoring
        for tool_id in TOOL_IDS:
            if mon.get_tool(tool_id) is None:
                mon.use_tool_id(tool_id, "pv_agent")
                self.tool_id = tool_id
                break
        else:
            raise RuntimeError("no free sys.monitoring tool id")
        ev = mon.events
        for event, callback in (
            (ev.PY_START, self._on_start),
            (ev.PY_RESUME, self._on_start),
            (ev.PY_RETURN, self._on_return),
            (ev.PY_YIELD, self._on_return),
            (ev.PY_UNWIND, self._on_unwind),
        ):
            mon.register_callback(self.tool_id, event, callback)
        mon.set_events(self.tool_id, ev.PY_START | ev.PY_RESUME | ev.PY_RETURN | ev.PY_YIELD | ev.PY_UNWIND)

    def stop(self) -> None:
        if self.tool_id is None:
            return
        mon = sys.monitoring
        mon.set_events(self.tool_id, 0)
        for event in (mon.events.PY_START, mon.events.PY_RESUME, mon.events.PY_RETURN, mon.events.PY_YIELD, mon.events.PY_UNWIND):
            mon.register_callback(self.tool_id, event, None)
        mon.free_tool_id(self.tool_id)
        self.tool_id = None

    def _module(self, filename: str) -> str:
        name = self._modules.get(filename)
        if name is None:
            rel = os.path.relpath(os.path.abspath(filename), self.config.project_root).replace("\\", "/")
            name = rel.removesuffix(".py")
            name = name.replace("/", ".")
            self._modules[filename] = name
        return name

    def _on_start(self, code, offset):
        if not self.files.contains(code.co_filename):
            return sys.monitoring.DISABLE
        top = context.top()
        if top is None:
            trace_id = context.request_trace_id() or new_trace_id()
            sampled = random.random() < self.config.sample_rate
            parent = None
        else:
            trace_id, sampled, parent = top.trace_id, top.trace_id is not None, top.span_id
        context.push(
            Span(
                trace_id if sampled else None,
                new_span_id(),
                parent if sampled else None,
                self._module(code.co_filename) + "." + code.co_qualname,
                code.co_filename,
                code.co_firstlineno,
                now_ns(),
            )
        )
        return None

    def _finish(self, status: str, error: dict | None) -> None:
        span = context.pop()
        if span is None or span.trace_id is None:
            return
        end = now_ns()
        self.emit(
            make_event(
                self.config,
                "call",
                span.name,
                file_path=span.file_path,
                line=span.line,
                start_ns=span.start_ns,
                duration_ns=end - span.start_ns,
                trace_id=span.trace_id,
                span_id=span.span_id,
                parent_span_id=span.parent_span_id,
                status=status,
                error=error,
            )
        )

    def _on_return(self, code, offset, value):
        if not self.files.contains(code.co_filename):
            return sys.monitoring.DISABLE
        self._finish("ok", None)
        return None

    def _on_unwind(self, code, offset, exc):
        # PY_UNWIND cannot be disabled, so this returns None even outside the project.
        if self.files.contains(code.co_filename):
            self._finish("error", error_info(exc))
