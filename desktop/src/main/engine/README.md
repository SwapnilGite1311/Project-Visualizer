# Engine client (main process)

## Files

- `framing.ts` — `Content-Length` framing: `encodeMessage` and the streaming `FrameDecoder`.
- `json-rpc.ts` — JSON-RPC message types, type guards and `RpcError` (keeps the engine error code).
- `engine-client.ts` — sends requests, matches responses by id, times out, delivers notifications.
- `engine-locator.ts` — finds the `pv-engine` executable.
- `engine-process.ts` — starts the executable with piped stdio.
- `engine-service.ts` — the one object the app uses: start, request, notifications, status, auto-restart, stop.

## Restart policy

When the engine exits unexpectedly, pending requests fail with `engine stopped`, the status becomes `crashed`, and the service restarts it (`restarting` → `starting` → `ready`). At most 3 restarts are made within 60 seconds; after that the status stays `crashed` until the app restarts the engine.

## Locating the engine

1. `PV_ENGINE_PATH` environment variable, if the file exists.
2. Installed app: `<resources>/engine/pv-engine(.exe)`.
3. Development, relative to `desktop/../engine`: `build/app/Debug`, `build/app/Release`, `build/app`, `build-release/app`.

## Logs

The engine writes logs to stderr. Each line is forwarded to the main process console prefixed with `[pv-engine]`.

## Transports

New architecture (R9 "Local server mode"): the main process starts `pv-engine serve --pipe <pipe> --tcp 7700 --parent-pid <desktop pid>` and talks to it over a **named pipe** (Windows `\\.\pipe\pv-engine-<user>-<pid>`) or a **Unix socket** (`<tmp>/pv-engine-<user>-<pid>.sock`). The same engine serves the VS Code extension on TCP 127.0.0.1:7700, so a project is parsed once for both.

- `pipe-transport.ts`: `pipePath()` and `connectPipe()` (retries every 100 ms for up to 5 s).
- `spawnEngineOverPipe` in `engine-process.ts` starts the server and connects; it fails fast when the engine exits (for example an older engine without `serve`).
- `EngineService` tries the pipe first and falls back to stdio for the rest of the session when that fails (a warning is logged). `service.transport` tells which one is in use. Set `PV_ENGINE_TRANSPORT=stdio` to force stdio. Fake spawners in tests stay on stdio unless a `pipeSpawner` is passed.
- `--parent-pid` makes the engine stop by itself if the desktop app dies without shutting it down.

