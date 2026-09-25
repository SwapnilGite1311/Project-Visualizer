import importlib
import json
import sys
import textwrap

import pytest

from pv_agent import context
from pv_agent.config import load_config
from pv_agent.tracer import Tracer


@pytest.fixture
def project(tmp_path):
    (tmp_path / "shop").mkdir()
    (tmp_path / "shop" / "__init__.py").write_text("")
    (tmp_path / "shop" / "calc.py").write_text(
        textwrap.dedent("""
        import json

        def a():
            return b() + 1

        def b():
            return len(json.dumps({"x": 1}))

        def boom():
            raise ValueError("bad id")

        def gen():
            yield 1
            yield 2
    """)
    )
    sys.path.insert(0, str(tmp_path))
    context.reset_for_tests()
    yield tmp_path
    sys.path.remove(str(tmp_path))
    for name in ("shop", "shop.calc"):
        sys.modules.pop(name, None)
    context.reset_for_tests()


def run_traced(root, fn_name):
    events = []
    tracer = Tracer(load_config({"PV_RUNTIME_TOKEN": "t", "PV_PROJECT_ROOT": str(root)}), events.append)
    calc = importlib.import_module("shop.calc")
    tracer.start()
    try:
        getattr(calc, fn_name)()
    except ValueError:
        pass
    finally:
        tracer.stop()
    return [e for e in events if e["name"] != "shop.calc.<module>"]


def test_calls_become_parent_and_child_events(project):
    events = run_traced(project, "a")
    names = [e["name"] for e in events]
    assert names == ["shop.calc.b", "shop.calc.a"]  # b returns first
    b, a = events
    assert b["parent_span_id"] == a["span_id"]
    assert a["parent_span_id"] is None
    assert b["trace_id"] == a["trace_id"]
    assert a["kind"] == "call" and a["status"] == "ok"
    assert a["file_path"].replace("\\", "/").endswith("shop/calc.py")
    assert a["line"] == 4
    assert a["duration_ns"] >= b["duration_ns"]
    json.dumps(events)  # plain JSON; no stdlib (json.dumps) calls were recorded


def test_errors_and_generators(project):
    [boom] = run_traced(project, "boom")
    assert boom["status"] == "error"
    assert boom["error"]["type"] == "ValueError"
    assert "bad id" in boom["error"]["stack"]


def test_stop_releases_the_tool(project):
    tracer = Tracer(load_config({"PV_RUNTIME_TOKEN": "t", "PV_PROJECT_ROOT": str(project)}), lambda e: None)
    tracer.start()
    tool = tracer.tool_id
    tracer.stop()
    assert sys.monitoring.get_tool(tool) is None
