"""Runtime end-to-end test: Python agent -> HTTP -> engine mapping, health and errors, with real processes.

Usage: python tests/e2e-runtime/run_e2e.py <path-to-pv-engine>
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SAMPLE = HERE / "sample_app"
BROKEN = "function:shop/cart.py#broken"

sys.path.insert(0, str(HERE))
from forwarder import TOKEN, Forwarder  # noqa: E402


def agent_python() -> str:
    """A Python 3.12+ interpreter for the sample app: PV_E2E_PYTHON, this one, or the one uv finds."""
    if os.environ.get("PV_E2E_PYTHON"):
        return os.environ["PV_E2E_PYTHON"]
    if sys.version_info >= (3, 12):
        return sys.executable
    found = subprocess.run(["uv", "python", "find", "3.12"], capture_output=True, text=True, check=False)
    if found.returncode != 0 or not found.stdout.strip():
        raise RuntimeError("the agent needs Python 3.12+: install it (uv python install 3.12) or set PV_E2E_PYTHON")
    return found.stdout.strip()


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python tests/e2e-runtime/run_e2e.py <path-to-pv-engine>")
        return 1
    fw = Forwarder(sys.argv[1], str(SAMPLE))
    try:
        fw.start()
        env = dict(
            os.environ,
            PV_RUNTIME_URL=fw.url,
            PV_RUNTIME_TOKEN=TOKEN,
            PV_PROJECT_ROOT=str(SAMPLE),
            PV_FLUSH_MS="50",
            PYTHONPATH=str(REPO / "agents" / "python"),
            PYTHONDONTWRITEBYTECODE="1",
        )
        app = subprocess.run(
            [agent_python(), "-m", "pv_agent", "run", str(SAMPLE / "app.py")],
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        check(app.returncode == 1 and "KeyError" in app.stderr, f"the sample app should end with a KeyError:\n{app.stderr}")
        check("total 6" in app.stdout, f"unexpected output: {app.stdout!r}")
        time.sleep(1)  # health is recomputed at most every 500 ms

        pid = fw.project_id
        status = fw.call("runtime.status", {"project_id": pid})
        check(status["events_total"] >= 6, f"too few events: {status}")

        states = fw.call("health.get", {"project_id": pid, "node_ids": [BROKEN, "function:shop/cart.py#add"]})["states"]
        check(states[BROKEN]["state"] == "error", f"broken() should be in error: {states.get(BROKEN)}")
        check(states["function:shop/cart.py#add"]["calls"] >= 3, f"add() calls not counted: {states}")

        errors = fw.call("errors.list", {"project_id": pid})["errors"]
        check(any(e["origin_node_id"] == BROKEN for e in errors), f"no error mapped to broken(): {errors}")

        traces = fw.call("runtime.recent_traces", {"project_id": pid})["traces"]
        check(len(traces) > 0, "no traces recorded")
    except Exception as error:  # noqa: BLE001 - report any failure and exit 1
        print(f"E2E RUNTIME FAILED: {error}")
        return 1
    finally:
        fw.stop()
    print(f"E2E RUNTIME OK ({fw.received} events, {len(errors)} errors, {len(traces)} traces)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
