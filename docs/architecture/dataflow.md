# Data and control flow

The main flows of the new client-server architecture (2026-09-26). Transports and ports are in [`interfaces.md`](interfaces.md).

## Open a project

1. The user picks a folder (or a Git URL: the desktop clones it first, P1-DGIT).
2. Renderer → main (`pv:*` IPC) → engine over the named pipe: `project.open`.
3. The engine discovers files and, for each file, asks the local cache for an extraction with the same content hash. **Cache hit:** reuse it. **Miss:** parse with tree-sitter and store the result (SQLite index + LevelDB blob).
4. The engine builds the graph, computes metrics and sends `project.progress` notifications to every client.
5. The renderer asks for a level view and, for the React Flow / R3F views, `layout.compute` (cached per graph version in LevelDB).

## Save a file

1. The native watcher (ReadDirectoryChangesW / inotify / FSEvents) reports the changed path after a 30 ms debounce.
2. The engine re-parses only that file (hash check skips saves without changes), updates the graph and sends `graph.changed`.
3. The renderer reloads the visible level; changed elements are marked "updated". Target: **< 100 ms** from save to screen. Polling every 10 s remains a safety net.

## Show code on the map from VS Code

1. The extension reads `~/.project-visualizer/engine.json`, connects to `127.0.0.1:7700` and calls `engine.hello {token, client: 'vscode'}`.
2. "Show on map" → `editor.reveal {file_path, line}` → the engine sends the `editor.reveal` notification to the desktop → the map selects the element.
3. "Open in VS Code" on the map → `editor.open` → notification to the `vscode` client → the editor opens the file. If no extension is connected to the engine, the desktop uses the 47101 bridge.

## Ask the AI

1. The engine builds a grounding pack (`grounding.for_question` / `for_error`, `context.for_node`) — facts only, no raw source files.
2. **Direct mode:** the main process calls the LLM with the user's key.
3. **Cloud mode:** HTTPS to the AI gateway (quota, cache, queue) → Python AI service (LLM gateway with provider fallback) → answer streams back as **SSE** (`delta` events, then `done`).
4. Citations are checked against real node ids; the answer highlights nodes on the map.

## Share runtime metrics with the team

1. Agents send events to the local hub (`127.0.0.1:47100`) → the engine maps them to nodes (health, errors, flows) — this all stays local.
2. If the user turned on sharing for the project, every 5 s the desktop uploads **aggregates** (calls, errors, p95 per node; error counts) to the runtime aggregation service → TimescaleDB.
3. The alert engine evaluates rules; a firing alert is published on Redis `pv:notify:<project>` → realtime WebSocket → teammates' desktops show a toast.

## Share a map

1. The engine exports a snapshot (`snapshot.export`: names, paths, spans, metrics — never code).
2. Desktop → sync service (HTTPS) → MongoDB (graph) + PostgreSQL (metadata); `snapshot.shared` goes to teammates over WSS.
3. Teammates open it (`snapshot.load`); sync can diff and merge snapshots and export JSON/CSV to S3.

## Import a Git repository for the team

1. The desktop clones the repository on this computer (P1-DGIT).
2. The local engine analyzes it (flow "Open a project").
3. The map is shared to the chosen team project (flow "Share a map"). The server never receives or parses the code.
