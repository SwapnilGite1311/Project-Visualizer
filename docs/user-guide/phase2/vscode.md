# VS Code

The Project Visualizer extension connects VS Code to the desktop app running on the same computer.

## Install

1. Get the extension file `project-visualizer-0.1.0.vsix` (from the release page, or build it with `pnpm package` in `vscode-extension/`).
2. In VS Code: **Extensions** view → **…** menu → **Install from VSIX…** → choose the file.
3. Start the Project Visualizer desktop app and open your project. The VS Code status bar shows `PV` with a graph icon when the two are connected; the app's status bar shows **VS Code: connected**.

There is nothing to configure: the app writes its connection details to `~/.project-visualizer/bridge.json` when it starts, and the extension reads them.

## Show on map

Put the cursor inside a function, method or class and run **Project Visualizer: Show on map** from the command palette (`Ctrl+Shift+P`). The app moves the map to that element and selects it. **Project Visualizer: Explain this** does the same and opens the AI explanation.

## Open from the map

In the desktop app, right-click an element → **Open in VS Code (extension)**. VS Code opens the file and puts the cursor on the element's first line.

## Troubleshooting

- **VS Code says "Project Visualizer is not running or not connected".** Start the desktop app, then run **Project Visualizer: Reconnect** (or click `PV` in the status bar). The extension also retries by itself.
- **The app says "That file is not part of the open project".** Open the folder that contains the file in the desktop app.
- **"VS Code extension not connected" in the app.** Install the extension and check the VS Code status bar.
- **Several copies of the app.** Each copy uses the next free port (47101–47110); the extension connects to the one that started last.
