# ipc — engine local server

`pv-engine serve` lets several local clients share one engine (new architecture: "IPC bridge"; R9 "Local server mode").

```text
pv-engine serve [--pipe <name or path>] [--tcp <port>] [--parent-pid <pid>] [--stdio] [--no-info-file]
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--pipe` | `pv-engine-<user>` | Windows named pipe `\.\pipe\<name>`; macOS/Linux Unix socket `<tmp>/<name>.sock` (a full path is used as is). Another engine on the same name → exit code 1. |
| `--tcp` | `7700` | TCP port on 127.0.0.1; the next 9 ports are tried when busy; `0` = no TCP. |
| `--parent-pid` | none | stop when that process ends (checked every 2 s) — the desktop passes its own pid |
| `--stdio` | off | also serve stdin/stdout |
| `--no-info-file` | off | do not write `engine.json` (tests) |

## Transports and security

- **Pipe / Unix socket** — the desktop app. Windows: a security descriptor that grants access only to the current user, plus `PIPE_REJECT_REMOTE_CLIENTS`. POSIX: socket file mode 0600. No token needed.
- **TCP 127.0.0.1** — the VS Code extension and other local tools. Bound to loopback only (`SO_EXCLUSIVEADDRUSE` on Windows). The first request must be `engine.hello {token, client}`; until then every request gets error `-32600` and no notifications are sent.
- **`~/.project-visualizer/engine.json`** (`$PV_HOME` overrides the folder): `{pid, version, pipe, tcp_port, token}`. Written after listening (temp file + rename; mode 0600 on POSIX), removed on exit when it still holds our pid.

## Clients and notifications

Every connection is a `pv::rpc::Connection`; all share one dispatch lock, so method handlers still run one at a time. Each connection is a sink of the engine's `FanoutNotifier`, so every client sees `project.progress`, `runtime.update`, `graph.changed`, … `engine.info` lists the connected clients (`desktop`, `vscode`, `tool`; transport `pipe`, `tcp`, `stdio`).

## Editor relay

- `editor.reveal {file_path, line, column?}` — sent by VS Code; every other client gets the notification `editor.reveal` (the map selects the element). Result `{delivered}`.
- `editor.open {file_path, line}` — sent by the map; only `vscode` clients get `editor.open`. `delivered: 0` tells the desktop to use its 47101 bridge instead.

Without `serve` (plain stdio mode) the methods still answer: `engine.info` lists one stdio client and the editor methods deliver to nobody.

## Tests

- `ctest --preset dev -R Ipc` — listeners, info file, and a server with pipe and TCP clients.
- `python engine/modules/ipc/tests/serve_smoke.py engine/build/app/Debug/pv-engine.exe` — the real executable with a TCP client and a pipe client; prints `SERVE OK`.
