"""Open spans per thread, and a per-request trace id for web middleware."""

from __future__ import annotations

import contextvars
import threading


class Span:
    __slots__ = ("error", "file_path", "line", "name", "parent_span_id", "span_id", "start_ns", "trace_id")

    def __init__(self, trace_id, span_id, parent_span_id, name, file_path, line, start_ns, error=None):
        self.trace_id = trace_id  # None = an unsampled trace (the span is kept only to balance the stack)
        self.span_id = span_id
        self.parent_span_id = parent_span_id
        self.name = name
        self.file_path = file_path
        self.line = line
        self.start_ns = start_ns
        self.error = error


_stacks: dict[int, list[Span]] = {}
_stacks_lock = threading.Lock()
_request_trace: contextvars.ContextVar[str | None] = contextvars.ContextVar("pv_trace_id", default=None)


def current_stack() -> list[Span]:
    ident = threading.get_ident()
    stack = _stacks.get(ident)
    if stack is None:
        with _stacks_lock:
            stack = _stacks.setdefault(ident, [])
    return stack


def push(span: Span) -> None:
    current_stack().append(span)


def pop() -> Span | None:
    stack = current_stack()
    return stack.pop() if stack else None


def top() -> Span | None:
    stack = current_stack()
    return stack[-1] if stack else None


def current_trace_id() -> str | None:
    t = top()
    return t.trace_id if t else None


def request_trace_id() -> str | None:
    return _request_trace.get()


def set_request_trace(trace_id: str):
    return _request_trace.set(trace_id)


def reset_request_trace(token) -> None:
    _request_trace.reset(token)


def snapshot_open_spans() -> list[tuple[int, Span]]:
    """The innermost open span of every thread."""
    with _stacks_lock:
        items = list(_stacks.items())
    return [(ident, stack[-1]) for ident, stack in items if stack]


def reset_for_tests() -> None:
    with _stacks_lock:
        _stacks.clear()
