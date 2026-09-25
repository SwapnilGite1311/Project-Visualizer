import asyncio
from wsgiref.util import setup_testing_defaults

import pytest

from pv_agent import context
from pv_agent.config import load_config
from pv_agent.web import PvAsgiMiddleware, PvWsgiMiddleware

CONFIG = load_config({"PV_RUNTIME_TOKEN": "t", "PV_SERVICE": "shop"})


def wsgi_app(environ, start_response):
    assert context.request_trace_id() is not None  # functions called here join the request's trace
    if environ["PATH_INFO"] == "/crash":
        raise RuntimeError("down")
    code = "500 Internal Server Error" if environ["PATH_INFO"] == "/fail" else "200 OK"
    start_response(code, [("Content-Type", "text/plain")])
    return [b"ok"]


def call_wsgi(path):
    events = []
    environ = {}
    setup_testing_defaults(environ)
    environ["PATH_INFO"] = path
    app = PvWsgiMiddleware(wsgi_app, events.append, CONFIG)
    app(environ, lambda status, headers: None)
    return events


def test_wsgi_requests_become_http_events():
    [e] = call_wsgi("/users/1")
    assert e["kind"] == "http_in"
    assert e["name"] == "GET /users/1"
    assert e["attrs"] == {"http.method": "GET", "http.route": "/users/1", "http.status_code": 200}
    assert e["status"] == "ok"
    assert e["service"] == "shop"
    assert context.request_trace_id() is None
    [failed] = call_wsgi("/fail")
    assert failed["status"] == "error"


def test_wsgi_exceptions_are_reported_and_re_raised():
    with pytest.raises(RuntimeError):
        call_wsgi("/crash")


def test_asgi_requests():
    events = []

    async def asgi_app(scope, receive, send):
        await send({"type": "http.response.start", "status": 404, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        return {"type": "http.request"}

    app = PvAsgiMiddleware(asgi_app, events.append, CONFIG)
    asyncio.run(app({"type": "http", "method": "POST", "path": "/orders"}, receive, send))
    asyncio.run(app({"type": "lifespan"}, receive, send))
    assert len(events) == 1
    assert events[0]["name"] == "POST /orders"
    assert events[0]["attrs"]["http.status_code"] == 404
    assert events[0]["status"] == "ok"
    assert len(sent) == 4
