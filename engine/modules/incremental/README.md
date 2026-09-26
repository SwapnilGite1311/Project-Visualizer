# incremental — live file sync

Keeps an open project's graph in step with the files on disk while you edit, so the map (and everything built on it: health, errors, fix tracking) follows your code without reopening the project.

RPC: `watch.start {project_id, interval_ms?}` (default 1000, 250–60000), `watch.stop {project_id}`, `watch.status {project_id}` → `{watching, interval_ms, seeded, last_change_ms}`. Notification `graph.changed {project_id, files_changed, nodes_added, nodes_removed, nodes_updated}` after every applied change. Other engine modules can subscribe with `manager().add_listener(...)` (fix tracking does).

## How it works

1. **Polling, not OS watchers.** Every `interval_ms`, the project folder is scanned with the same discovery rules as opening a project (language extensions, default excludes, `.gitignore`) and each file's modification time and size are compared with the previous scan. This works the same on every platform and network drive, and never misses events.
2. **Seed.** The first time (or on `watch.start`), every file is parsed once and its extraction (definitions, imports, calls, inheritance) is kept in a per-project cache.
3. **Re-parse changed files only.** Added and modified files are parsed again and replace their cache entry; removed files leave the cache. A file that fails to parse stays in the graph as an empty module until it parses again.
4. **Full relink.** The whole graph is rebuilt from the cache — structure, definitions, index, imports, calls, inheritance and metrics — exactly like a full build, so links from *other* files to a changed file are always correct.
5. **Swap and report.** Runtime health is copied over for elements that still exist, the new graph replaces the old one in a single step, the build info (entry points, syntax errors) is updated, and `graph.changed` lists what was added, removed or changed (a different span, metrics, name or parent).

`engine.shutdown` stops all watchers first. A watcher also stops by itself when its project is closed.

## Native watching

`watch.start` takes `mode`: `auto` (default: native when the operating system watcher works, else polling), `native` (error `-32005` when not available) or `poll`. The result and `watch.status` report the `mode` in use.

- **Native mode** (module `fswatch`): OS events arrive about 30 ms after a save (debounced). A saved file that is already known is re-parsed at once; a new file, a folder change, lost events or an unknown deleted path run one full compare of file states (so `.gitignore` rules still apply). A full compare also runs every 10 s as a safety net.
- **Poll mode:** compares file states every `interval_ms` (250–60000, default 1000).

Measured on the Windows dev machine (Debug build): save → `graph.changed` in about 60 ms (target < 100 ms; see the `IncrNativeWatch` test output).

## Cost

Only parsing is expensive, and only changed files are parsed: saving one file costs one file's parse plus a relink. Relinking works from memory and takes milliseconds for thousands of files. A scan only reads directory entries (no file contents), so an idle project costs almost nothing.

## Limits

- Changes are seen after at most `interval_ms` (1 second by default).
- Very large repositories (tens of thousands of files): raise the interval (for example 5000 ms), since each scan lists every file.
- Files are compared by modification time and size: a tool that rewrites a file with the same size and restores its old modification time is not seen.
- Exclude patterns given when the project was opened are not re-applied (the default excludes and `.gitignore` are).
