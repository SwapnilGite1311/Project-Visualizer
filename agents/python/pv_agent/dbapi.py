"""Times database queries of any DB-API connection (sqlite3, psycopg, mysqlclient, ...)."""

from __future__ import annotations

import sys

from . import context
from .events import ProjectFiles, error_info, make_event
from .ids import now_ns


class _Cursor:
    def __init__(self, cursor, owner):
        self._cursor = cursor
        self._owner = owner

    def execute(self, sql, *args, **kwargs):
        return self._owner.timed(sql, lambda: self._cursor.execute(sql, *args, **kwargs))

    def executemany(self, sql, *args, **kwargs):
        return self._owner.timed(sql, lambda: self._cursor.executemany(sql, *args, **kwargs))

    def __getattr__(self, name):
        return getattr(self._cursor, name)

    def __iter__(self):
        return iter(self._cursor)


class _Connection:
    def __init__(self, conn, emit, config):
        self._conn = conn
        self._emit = emit
        self._config = config
        self._files = ProjectFiles(config.project_root)
        self._system = type(conn).__module__.split(".")[0]

    def cursor(self, *args, **kwargs):
        return _Cursor(self._conn.cursor(*args, **kwargs), self)

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __enter__(self):
        self._conn.__enter__()
        return self

    def __exit__(self, *exc):
        return self._conn.__exit__(*exc)

    def timed(self, sql, run):
        frame = self._files.innermost_frame(sys._getframe(2))
        top = context.top()
        start = now_ns()
        error = None
        try:
            return run()
        except BaseException as exc:
            error = error_info(exc)
            raise
        finally:
            text = str(sql)
            self._emit(
                make_event(
                    self._config,
                    "db_query",
                    " ".join(text.split())[:60],
                    file_path=frame.f_code.co_filename if frame else "",
                    line=frame.f_lineno if frame else 0,
                    start_ns=start,
                    duration_ns=now_ns() - start,
                    trace_id=top.trace_id if top and top.trace_id else None,
                    parent_span_id=top.span_id if top and top.trace_id else None,
                    status="error" if error else "ok",
                    error=error,
                    attrs={"db.statement": text[:500], "db.system": self._system},
                )
            )


def wrap_connection(conn, emit, config):
    """Returns a connection that behaves like `conn` and reports every execute/executemany."""
    return _Connection(conn, emit, config)
