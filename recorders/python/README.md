# pv-trace (Python execution recorder)

Runs a Python program and writes down how it moves through your own code, for **Code Motion** in Project Visualizer. No dependencies; Python 3.9 or newer. The desktop app installs and runs it for you; this page is for running it by hand.

## Usage

```bash
# a script, with its arguments
python -m pv_trace --root C:/code/demo --out trace.jsonl -- main.py --verbose

# a module, for example your tests
python -m pv_trace --root C:/code/demo --out trace.jsonl -- -m pytest tests/test_users.py -q
```

`pv_trace` must be importable (put this folder on `PYTHONPATH`). Options: `--max-events N` (default 200,000; 1,000–2,000,000) and `--max-repr N` (longest value text, default 120; 20–200). The exit code is the program's exit code.

## What is recorded

One JSON object per line (`contracts/motion/trace-event.schema.json`):

- `start` (command, folder, Python version) and `end` (exit code, number of events, whether it was cut off);
- `call` when a function (or a module's top-level code, `<module>`) starts, with its arguments;
- `line` before each line runs, with the local variables that changed since the last event of that call;
- `return` with the returned value, and `exception` when an exception passes through a function.

Only files under `--root` are recorded; the standard library, installed packages and virtual environments (`venv`, `.venv`, `site-packages`, …) are skipped.

## Limits

- Only the main thread is recorded.
- Programs run roughly 10–50× slower while they are recorded; keep runs short (one script, one test).
- Recording stops after `--max-events` events; the program keeps running and the trace ends with `"truncated": true`.
- Values are shortened `repr` texts (for example `[0, 1, 2, 3, 4, 5, ...]`), not the objects themselves.

## Privacy

The trace contains values of your program's variables (which can include data your program reads). It is written only to the file you choose and never leaves your computer.
