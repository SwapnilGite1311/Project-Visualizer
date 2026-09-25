# VS Code bridge

A small WebSocket server in the desktop app's main process lets editor extensions (the Project Visualizer VS Code extension, `vscode-extension/`) talk to the map: "show this line on the map", "explain this" and, the other way, "open this file at this line in the editor".

## Discovery

When the app starts it listens on `127.0.0.1:47101` (or the next free port up to `47110`) and writes `~/.project-visualizer/bridge.json`:

```json
{ "port": 47101, "token": "3f9c…32 hex characters…", "pid": 12345 }
```

- `port` — where to connect (`ws://127.0.0.1:<port>`).
- `token` — the shared secret, created once and kept in the app setting `bridge.token`.
- `pid` — the app's process id, to detect a stale file.

The file is removed when the app quits. Extensions read it on every connection attempt, so no setup is needed.

## Authentication

The first message on a new connection must be `{"type":"hello","token":"<token>","client":"<name>","version":"<x.y.z>"}` and must arrive within **5 seconds**. A wrong token closes the connection (code 4003); silence closes it after 5 s (code 4001). A correct hello gets `{"type":"welcome","app_version":"<version>"}`; after that the client may send requests.

## Messages

| Direction | Message | Meaning |
| --- | --- | --- |
| client → app | `{"type":"hello","token","client","version"}` | authenticate (first message) |
| client → app | `{"type":"reveal","file_path","line"}` | show the element at that file and line on the map |
| client → app | `{"type":"explain","file_path","line"}` | show it and open Explain for it |
| app → client | `{"type":"welcome","app_version"}` | authentication accepted |
| app → client | `{"type":"error","message"}` | the last message was not understood |
| app → client | `{"type":"open","file_path","line"}` | open this file at this line in the editor |

`file_path` is an absolute path (a path relative to the open project also works for `reveal` and `explain`); `line` is 1-based. The app maps the path and line to an element with the engine's `locate.node_at`; a file outside the open project shows a notice in the app.

## Security

- The server listens on `127.0.0.1` only; other computers cannot connect.
- Every connection must prove it knows the token. The token file is readable only by the current user on macOS and Linux (`chmod 600`); on Windows it lives in the user's profile folder, which other users cannot read by default.
- Messages are validated strictly (types and field types); anything unexpected is rejected. The bridge only reveals, explains and opens files — it never runs commands or returns code.
