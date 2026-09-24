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
