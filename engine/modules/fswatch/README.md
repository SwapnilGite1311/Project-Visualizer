# fswatch — native file watcher

Operating-system file change events for a project folder, so a saved file reaches the engine at once (new architecture: "file system watcher → change detected"). Used by `incremental` (P4-INCR-005).

```cpp
auto watcher = pv::fswatch::create_watcher(root, exclude_globs, [](std::vector<pv::fswatch::Change> batch) {
    // Modified / Created / Deleted with a path relative to root, or Rescan
});
// ...
watcher->stop();  // no callbacks after it returns
```

## Platforms

| Platform | API | Notes |
| --- | --- | --- |
| Windows | `ReadDirectoryChangesW`, recursive, overlapped I/O, 64 KB buffer | buffer overflow → `Rescan` |
| Linux | inotify, one watch per directory | new folders get watches; `IN_Q_OVERFLOW` → `Rescan`; the user watch limit (`fs.inotify.max_user_watches`) reached → `create_watcher` returns nullptr |
| macOS | FSEvents with file events, latency 0.02 s | dropped events → `Rescan` |
| other | — | `create_watcher` returns nullptr |

`nullptr` means "no native watching here": callers fall back to polling.

## Behaviour

- **Excludes:** the default excludes of `pv::fs` (`.git`, `node_modules`, virtual environments, build folders…) plus the given globs.
- **Debounce:** events are collected until nothing new arrived for `debounce_ms` (30 ms by default); then one batch is delivered with one entry per path (the latest kind; "created then modified" stays "created").
- **Folders:** a new or renamed-in folder produces `Rescan` (its files may have no events of their own). A deleted folder produces `Deleted` for its path; consumers treat an unknown deleted path as "compare everything".
- **Speed:** on the Windows dev machine a new file is reported about 50 ms after it is written (see the `FsWatch` test output).
