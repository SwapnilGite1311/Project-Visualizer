# Project Visualizer for VS Code

Jump between your code in VS Code and its living map in the Project Visualizer desktop app.

## Features

- **Show on map:** put the cursor in a function, method or class and run *Project Visualizer: Show on map*. The desktop app moves the map to that element and selects it.
- **Explain this:** the same, and the app opens its AI explanation of the element.
- **Open from the map:** in the desktop app, right-click an element and choose *Open in VS Code (extension)*; VS Code opens the file at that line.
- **Status bar:** `$(graph) PV` when connected to the app, `$(debug-disconnect) PV` when not (click it to reconnect).

## Requirements

- The Project Visualizer desktop app is running, with the project that contains your file open.
- Both run on the same computer. The extension finds the app automatically through `~/.project-visualizer/bridge.json`, which the app writes when it starts; there is nothing to configure.

## Commands

| Command | What it does |
| --- | --- |
| `Project Visualizer: Show on map` | Reveals the element under the cursor on the map |
| `Project Visualizer: Explain this` | Reveals it and opens Explain in the app |
| `Project Visualizer: Reconnect` | Connects to the app again (also: click the status bar item) |

Bind them to keys in *File → Preferences → Keyboard Shortcuts* if you use them often.

## Troubleshooting

- **"Project Visualizer is not running or not connected."** Start the desktop app, then run *Reconnect*. The extension also retries on its own (after 1, 2, 5 and then every 10 seconds).
- **The app says "That file is not part of the open project".** Open the project folder that contains the file in the desktop app.
- **Still not connected.** Check that `~/.project-visualizer/bridge.json` exists while the app runs. Security software that blocks local connections on ports 47101–47110 can also stop the connection.
- **"Open in VS Code" in the app does nothing.** The extension must be installed and connected (status bar shows `$(graph) PV`).
