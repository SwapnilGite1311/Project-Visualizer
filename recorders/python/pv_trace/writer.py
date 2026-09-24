"""Writes trace events as JSON lines."""
import json
import time


class TraceWriter:
    def __init__(self, path):
        self._file = open(path, "w", encoding="utf-8", newline="\n")
        self._seq = 0
        self._t0 = time.perf_counter_ns()

    @property
    def count(self):
        return self._seq

    def write(self, kind, file="", line=0, func="", depth=0, **extra):
        event = {
            "v": 1,
            "seq": self._seq,
            "kind": kind,
            "file": file,
            "line": line,
            "func": func,
            "depth": depth,
            "t_ns": time.perf_counter_ns() - self._t0,
        }
        for key, value in extra.items():
            if value is not None:
                event[key] = value
        self._file.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")
        self._seq += 1

    def close(self):
        if not self._file.closed:
            self._file.flush()
            self._file.close()
