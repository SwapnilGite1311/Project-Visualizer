# Runtime end-to-end test

Proves the whole runtime chain with real processes: the Python agent records `sample_app/app.py`, sends events over HTTP to a small receiver (`forwarder.py`), which passes them to a real `pv-engine`; the test then checks the engine's mapping, health and errors.

## Prerequisites

- The engine is built: `cmake --preset dev && cmake --build --preset dev` (creates `engine/build/app/Debug/pv-engine.exe`).
- Python 3.12 or newer for the sample app (the agent needs `sys.monitoring`). The runner itself works on any Python 3; it runs the sample app with, in order: `PV_E2E_PYTHON` if set, the Python running the test if it is 3.12+, or the 3.12 that `uv python find 3.12` reports. The agent has no dependencies; it is loaded from `agents/python` through `PYTHONPATH`, so no install is needed.

## Run

```bash
python tests/e2e-runtime/run_e2e.py engine/build/app/Debug/pv-engine.exe
```

It prints `E2E RUNTIME OK (...)` and exits 0, or `E2E RUNTIME FAILED: <reason>` and exits 1.

What it checks:

- the sample app ran and ended with the expected `KeyError`;
- the engine received at least 6 events;
- `health.get` reports `shop/cart.py#broken` as `error` and counts the calls of `add`;
- `errors.list` has an error whose origin is `shop/cart.py#broken`;
- `runtime.recent_traces` is not empty.

`python tests/e2e-runtime/sample_app/app.py` on its own also ends with a `KeyError` traceback; that is expected.
