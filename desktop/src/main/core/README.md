# Desktop main process

## Startup order

1. Take the single-instance lock (a second launch focuses the existing window).
2. When Electron is ready: create the logger (`userData/logs/main.log`), the settings store (`userData/settings.json`) and the encrypted secret store (`userData/secrets.json`, Electron `safeStorage`).
3. Locate `pv-engine` and create the `EngineService`.
4. Create the main context and load every handler in `src/main/handlers/`.
5. Forward engine notifications (`pv:notification`) and engine status (`pv:engine.status`) to the window.
6. Create the main window.
7. Start the engine (or log that it was not found).
8. Recreate the window on macOS `activate`; quit when all windows close (not on macOS); stop the engine before quitting.

## Adding a handler

Create `src/main/handlers/<name>.ts` with `export default function register(ctx: MainContext): void` and call `ctx.handle('pv:<area>.<action>', fn)`. It is loaded automatically at startup; never edit a central list. Every result is wrapped in an `Envelope` (`{ok:true,value}` or `{ok:false,error:{code,message}}`).

## Channels

| Channel | Payload | Result |
| --- | --- | --- |
| `pv:rpc` | `{method, params?}` | the engine result |
| `pv:app.info` | — | `{version, platform, engineStatus, enginePath}` |
| `pv:engine.restart` | — | `true` |
| `pv:dialog.openFolder` | — | folder path or `null` |
| `pv:settings.get` | `{key, fallback?}` | stored value or fallback |
| `pv:settings.set` | `{key, value}` | `true` |
| `pv:settings.all` | — | all settings |
| `pv:secrets.set` | `{name, value}` | `true` |
| `pv:secrets.has` | `{name}` | boolean |
| `pv:secrets.delete` | `{name}` | `true` |
| `pv:editor.open` | `{file_path, line}` | `{opened_with: 'vscode' \| 'default'}` |

## Events

- `pv:notification` — `{method, params}` for every engine notification (for example `project.progress`).
- `pv:engine.status` — `{status}` whenever the engine status changes (`starting`, `ready`, `crashed`, `restarting`, `stopped`).

## Security

- There is no channel that returns a secret value; secrets are only used inside the main process.
- The renderer runs with `contextIsolation`, `sandbox` and no Node integration; it can only use `window.pv`.
- Only `https://` links open externally; every other new window is denied. Packaged builds send a strict Content-Security-Policy.
