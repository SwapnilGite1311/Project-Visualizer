"""python -m pv_agent run <script.py> [args...]   |   python -m pv_agent check"""

from __future__ import annotations

import os
import runpy
import sys

HELP = """Project Visualizer runtime agent

  python -m pv_agent run <script.py> [args...]   run a script with recording on
  python -m pv_agent check                       send one test event to the desktop app

Settings (environment): PV_RUNTIME_TOKEN (required; copy it from the app), PV_RUNTIME_URL,
PV_PROJECT_ROOT, PV_SERVICE, PV_SAMPLE_RATE, PV_STALL_MS, PV_MAX_QUEUE, PV_FLUSH_MS.
"""


def main(argv: list[str]) -> int:
    import pv_agent

    if not argv or argv[0] in ("-h", "--help", "help"):
        print(HELP)
        return 0
    if argv[0] == "check":
        from .config import load_config
        from .events import make_event
        from .ids import now_ns
        from .transport import Transport

        config = load_config()
        if config is None:
            print("PV_RUNTIME_TOKEN is not set", file=sys.stderr)
            return 1
        errors: list[str] = []
        transport = Transport(config)
        sender = transport.sender

        def checked(batch):
            try:
                sender(batch)
            except Exception as exc:  # report instead of dropping silently
                errors.append(str(exc))
                raise

        transport.sender = checked
        transport.emit(make_event(config, "log", "pv_agent check", start_ns=now_ns()))
        transport.close()
        if errors:
            print("FAILED: " + errors[0], file=sys.stderr)
            return 1
        print("OK")
        return 0
    if argv[0] == "run" and len(argv) >= 2:
        script = os.path.abspath(argv[1])
        sys.argv = [script, *argv[2:]]
        sys.path.insert(0, os.path.dirname(script))
        pv_agent.start()
        try:
            runpy.run_path(script, run_name="__main__")
        except SystemExit:
            raise
        except BaseException as exc:
            from . import errors

            errors.report_uncaught(exc)  # the hooks are removed by stop() before Python prints the traceback
            raise
        finally:
            pv_agent.stop()
        return 0
    print(HELP, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
