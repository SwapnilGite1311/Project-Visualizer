# pv-engine

## Run

- **Stdio mode (default):** `pv-engine` with no arguments reads JSON-RPC 2.0 requests from stdin and writes responses and notifications to stdout, using `Content-Length` framing (see `engine/modules/rpc/README.md`). The desktop app starts it this way.
- **Version:** `pv-engine --version` prints the engine version.
- **CLI sub-commands:** `pv-engine <command> [args…]`. Commands are added by modules through `reg.cli.add(...)`, so they appear automatically when a module provides one.

## Smoke test

```bash
python engine/app/smoke_test.py engine/build/app/Debug/pv-engine.exe
```

On Linux/macOS use `engine/build/app/pv-engine`. It pings the engine, lists languages, opens the Python fixture project, waits until it is ready, checks `files_total == 8` and shuts the engine down. It prints `SMOKE OK` on success.

## Debugging

Send one framed request by hand with a small Python snippet:

```python
import json, subprocess
p = subprocess.Popen(["engine/build/app/Debug/pv-engine.exe"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "engine.ping", "params": {}}).encode()
p.stdin.write(b"Content-Length: %d\r\n\r\n" % len(body) + body); p.stdin.flush()
print(p.stdout.read(200))
```

Logs are written to stderr only, as `[pv-engine] <LEVEL> <message>`. The log level is `INFO` by default; a command-line flag to change it will be added later.

## Where modules are wired

`engine/app/CMakeLists.txt` generates `registry_gen.cpp` in the build folder. It calls `pv_register_<module>(reg)` for every `engine/modules/<module>/src/register.cpp`, in alphabetical order. `main.cpp` calls `register_all_modules(reg)` once at start-up; nobody edits a central list.
