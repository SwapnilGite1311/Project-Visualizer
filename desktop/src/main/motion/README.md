# Code Motion host

The main-process side of Code Motion: it runs the user's program under the Python recorder (`recorders/python`, package `pv_trace`) and hands the trace file to the renderer, which loads it into the engine.

## Flow

1. The renderer calls `pv:motion.record {root, command}` (for example `main.py` or `-m pytest tests/test_users.py`).
2. `parseCommand` splits the command (quotes group words; no shell is involved).
3. `installRecorder` writes the bundled recorder to `<userData>/recorder/pv_trace` (only when its version changed).
4. `startRecording` runs `python -m pv_trace --root <root> --out <trace> -- <command>` in the project folder, with the recorder on `PYTHONPATH` and `PYTHONDONTWRITEBYTECODE=1`, and stops it after 120 s or on `pv:motion.cancel`.
5. The result has the trace path, the exit code and the last 20,000 characters of the program's output. The renderer then calls the engine's `motion.load_trace` with that path.

## Python

`findPython` tries, in order: the setting `motion.python` (a full path to a Python executable), then `py -3`, `python`, `python3` on Windows, or `python3`, `python` elsewhere. The first one that reports version 3.9 or newer is used. The Windows Store `python` stub fails this check and is skipped.

## Files

- `<userData>/recorder/` — the recorder package and a `VERSION` file (a hash of the bundled files).
- `<userData>/traces/trace-<time>.jsonl` — recorded runs; only the newest 10 are kept.
- The recorder files are bundled with Vite `?raw` imports, so packaging needs no extra step.
