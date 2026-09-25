"""One trace per HTTP request: WSGI (Flask, Django) and ASGI (FastAPI, Starlette) middleware."""

from __future__ import annotations

from . import context
from .events import error_info, make_event
from .ids import new_span_id, new_trace_id, now_ns


def _http_event(config, method: str, path: str, status_code: int | None, start: int, trace_id: str, span_id: str, error=None) -> dict:
    failed = error is not None or (status_code is not None and status_code >= 500)
    attrs = {"http.method": method, "http.route": path}
    if status_code is not None:
        attrs["http.status_code"] = status_code
    return make_event(
        config,
        "http_in",
        method + " " + path,
        start_ns=start,
        duration_ns=now_ns() - start,
        trace_id=trace_id,
        span_id=span_id,
        status="error" if failed else "ok",
        error=error,
        attrs=attrs,
    )


class PvWsgiMiddleware:
    def __init__(self, app, emit, config):
        self.app = app
        self.emit = emit
        self.config = config

    def __call__(self, environ, start_response):
        trace_id = new_trace_id()
        token = context.set_request_trace(trace_id)
        status = {"code": None}

        def capture(status_line, headers, exc_info=None):
            try:
                status["code"] = int(str(status_line).split(" ", 1)[0])
            except ValueError:
                pass
            return start_response(status_line, headers, exc_info) if exc_info else start_response(status_line, headers)

        start = now_ns()
        method, path = environ.get("REQUEST_METHOD", "GET"), environ.get("PATH_INFO", "/")
        try:
            result = self.app(environ, capture)
        except BaseException as exc:
            self.emit(_http_event(self.config, method, path, status["code"], start, trace_id, new_span_id(), error_info(exc)))
            raise
        finally:
            context.reset_request_trace(token)
        self.emit(_http_event(self.config, method, path, status["code"], start, trace_id, new_span_id()))
        return result


class PvAsgiMiddleware:
    def __init__(self, app, emit, config):
        self.app = app
        self.emit = emit
        self.config = config

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        trace_id = new_trace_id()
        token = context.set_request_trace(trace_id)
        status = {"code": None}

        async def capture(message):
            if message.get("type") == "http.response.start":
                status["code"] = message.get("status")
            await send(message)

        start = now_ns()
        method, path = scope.get("method", "GET"), scope.get("path", "/")
        try:
            await self.app(scope, receive, capture)
        except BaseException as exc:
            self.emit(_http_event(self.config, method, path, status["code"], start, trace_id, new_span_id(), error_info(exc)))
            raise
        finally:
            context.reset_request_trace(token)
        self.emit(_http_event(self.config, method, path, status["code"], start, trace_id, new_span_id()))
