"""python -m pv_trace --root DIR --out FILE [--max-events N] [--max-repr N] -- (SCRIPT | -m MODULE) [ARGS...]"""
import argparse
import os
import platform
import runpy
import sys
import traceback

from .filters import ProjectFilter
from .recorder import Recorder
from .writer import TraceWriter

USAGE = "usage: python -m pv_trace --root DIR --out FILE [--max-events N] [--max-repr N] -- (SCRIPT | -m MODULE) [ARGS...]"


def _clamp(value, low, high):
    return max(low, min(high, value))


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--" in argv:
        split = argv.index("--")
        options, target = argv[:split], argv[split + 1:]
    else:
        options, target = argv, []
    parser = argparse.ArgumentParser(prog="pv_trace", usage=USAGE)
    parser.add_argument("--root", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--max-events", type=int, default=200_000)
    parser.add_argument("--max-repr", type=int, default=120)
    args = parser.parse_args(options)
    if not target or (target[0] == "-m" and len(target) < 2):
        print(USAGE, file=sys.stderr)
        return 2

    if target[0] == "-m":
        module = target[1]
        sys.argv = [module] + target[2:]
        sys.path.insert(0, os.getcwd())

        def run():
            runpy.run_module(module, run_name="__main__", alter_sys=True)
    else:
        script = os.path.abspath(target[0])
        sys.argv = [script] + target[1:]
        sys.path.insert(0, os.path.dirname(script))

        def run():
            runpy.run_path(script, run_name="__main__")

    root = os.path.abspath(args.root)
    writer = TraceWriter(args.out)
    writer.write(
        "start",
        argv=target,
        cwd=os.getcwd().replace(os.sep, "/"),
        python=platform.python_version(),
        root=root.replace(os.sep, "/"),
    )
    recorder = Recorder(
        ProjectFilter(root),
        writer,
        max_events=_clamp(args.max_events, 1000, 2_000_000),
        max_repr=_clamp(args.max_repr, 20, 200),
    )
    exit_code = 0
    recorder.start()
    try:
        run()
    except SystemExit as e:
        exit_code = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
    except BaseException:
        exit_code = 1
        traceback.print_exc()
    finally:
        recorder.stop()
    writer.write("end", exit_code=exit_code, events=writer.count + 1, truncated=recorder.truncated)
    writer.close()
    return exit_code
