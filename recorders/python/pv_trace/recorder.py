"""Records calls, lines, returns, exceptions and changed locals of project files with sys.settrace."""
import sys

from .reprs import safe_repr

MAX_CHANGED = 20


class Recorder:
    def __init__(self, project_filter, writer, max_events=200_000, max_repr=120):
        self.filter = project_filter
        self.writer = writer
        self.max_events = max_events
        self.max_repr = max_repr
        self.truncated = False
        self._full = False
        self._depths = {}
        self._snaps = {}

    def start(self):
        sys.settrace(self._global)

    def stop(self):
        sys.settrace(None)

    def _global(self, frame, event, arg):
        if self._full or self.filter.relative(frame.f_code.co_filename) is None:
            return None
        self._depths[id(frame)] = self._depth_of(frame)
        self._emit("call", frame, locals=self._changed(frame))
        return self._local

    def _local(self, frame, event, arg):
        if self._full:
            return None
        if event == "line":
            self._emit("line", frame, locals=self._changed(frame))
        elif event == "return":
            self._emit("return", frame, locals=self._changed(frame), value=safe_repr(arg, self.max_repr))
            self._depths.pop(id(frame), None)
            self._snaps.pop(id(frame), None)
        elif event == "exception":
            exc_type, exc_value, _ = arg
            try:
                message = str(exc_value)
            except Exception:
                message = "?"
            self._emit("exception", frame, value=(exc_type.__name__ + ": " + message)[: self.max_repr])
        return self._local

    def _depth_of(self, frame):
        parent = frame.f_back
        while parent is not None:
            depth = self._depths.get(id(parent))
            if depth is not None:
                return depth + 1
            parent = parent.f_back
        return 0

    def _changed(self, frame):
        snap = self._snaps.setdefault(id(frame), {})
        changed = {}
        for name, value in list(frame.f_locals.items()):
            if name.startswith("__"):
                continue
            text = safe_repr(value, self.max_repr)
            if snap.get(name) != text:
                snap[name] = text
                changed[name] = text
                if len(changed) >= MAX_CHANGED:
                    break
        return changed or None

    def _emit(self, kind, frame, **extra):
        code = frame.f_code
        self.writer.write(
            kind,
            self.filter.relative(code.co_filename),
            frame.f_lineno,
            getattr(code, "co_qualname", code.co_name),
            self._depths.get(id(frame), 0),
            **extra,
        )
        if self.writer.count >= self.max_events:
            self._full = True
            self.truncated = True
            sys.settrace(None)
