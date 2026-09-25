import threading

from pv_agent import context
from pv_agent.context import Span


def span(name, trace="t"):
    return Span(trace, name, None, name, "a.py", 1, 0)


def test_each_thread_has_its_own_stack():
    context.reset_for_tests()
    context.push(span("main"))
    seen = {}

    def worker():
        context.push(span("worker", "t2"))
        seen["worker_top"] = context.top().name
        seen["worker_trace"] = context.current_trace_id()

    t = threading.Thread(target=worker)
    t.start()
    t.join()
    assert seen == {"worker_top": "worker", "worker_trace": "t2"}
    assert context.top().name == "main"
    names = sorted(s.name for _, s in context.snapshot_open_spans())
    assert names == ["main", "worker"]
    assert context.pop().name == "main"
    assert context.pop() is None
    context.reset_for_tests()


def test_request_trace_id():
    assert context.request_trace_id() is None
    token = context.set_request_trace("abc")
    assert context.request_trace_id() == "abc"
    context.reset_request_trace(token)
    assert context.request_trace_id() is None
