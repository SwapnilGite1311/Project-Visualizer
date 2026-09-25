import importlib
import sys
import textwrap
import threading
import time

from pv_agent import context
from pv_agent.config import load_config
from pv_agent.tracer import Tracer
from pv_agent.watchdog import Watchdog


def test_reports_a_function_that_hangs(tmp_path):
    (tmp_path / "slowpkg").mkdir()
    (tmp_path / "slowpkg" / "__init__.py").write_text("")
    (tmp_path / "slowpkg" / "work.py").write_text(
        textwrap.dedent("""
        import time

        def wait():
            time.sleep(1.5)
    """)
    )
    sys.path.insert(0, str(tmp_path))
    context.reset_for_tests()
    events = []
    config = load_config({"PV_RUNTIME_TOKEN": "t", "PV_PROJECT_ROOT": str(tmp_path), "PV_STALL_MS": "200"})
    work = importlib.import_module("slowpkg.work")
    tracer = Tracer(config, events.append)
    watchdog = Watchdog(config, events.append, interval_s=0.1)
    tracer.start()
    watchdog.start()
    try:
        t = threading.Thread(target=work.wait)
        t.start()
        t.join()
    finally:
        watchdog.stop()
        tracer.stop()
        sys.path.remove(str(tmp_path))
        sys.modules.pop("slowpkg.work", None)
        sys.modules.pop("slowpkg", None)
        context.reset_for_tests()
    stalls = [e for e in events if e["kind"] == "stall"]
    assert len(stalls) == 1  # reported once per span
    assert stalls[0]["file_path"].replace("\\", "/").endswith("slowpkg/work.py")
    assert stalls[0]["line"] == 5
    assert stalls[0]["duration_ns"] >= 200_000_000
    assert time.time_ns() >= stalls[0]["start_ns"]
