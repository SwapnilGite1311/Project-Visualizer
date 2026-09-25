# VS Code bridge security

## Context

The VS Code extension and the desktop app talk to each other (show a line on the map, open a map element in the editor). Any local channel is also reachable by other programs on the same computer, including a web page that tries to connect to `localhost`.

## What we decided

The desktop app runs a WebSocket server bound to `127.0.0.1` only (ports 47101–47110). It writes the port and a random 128-bit token to `~/.project-visualizer/bridge.json` (mode 600 on macOS/Linux, in the user's profile on Windows) and removes the file on exit. A client must send `hello` with that token within 5 seconds or is disconnected. Messages are validated strictly, and the protocol can only reveal, explain and open files — nothing that runs commands or returns code.

## Why

- Binding to `127.0.0.1` keeps other computers out.
- The token keeps out local programs and web pages that cannot read the user's home folder; a browser page cannot read `bridge.json`, so it cannot authenticate.
- A small, validated message set limits what a compromised or buggy client can do.
- Writing the token to a file means the extension needs no setup, which matters for adoption.

## What we learned

- Fall back to the next port when 47101 is busy (another copy of the app, or tests running in parallel) instead of failing; the extension reads the actual port from `bridge.json`.
- The end-to-end check without VS Code — a script that reads `bridge.json`, authenticates and exchanges messages with the real app — caught more than unit tests would, and verified the file is removed on quit.
