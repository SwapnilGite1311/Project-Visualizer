# cache — local project cache (SQLite + LevelDB)

The new architecture's "local cache": reopening a project only parses files whose content changed.

## Layout on disk

`$PV_CACHE_DIR`, else `$PV_HOME/cache`, else `~/.project-visualizer/cache/`, then one folder per project (16 hex characters of the normalized root; case-insensitive on Windows):

| File | Store | Contents |
| --- | --- | --- |
| `meta.db` | SQLite | table `project(key, value)`: schema version, engine build fingerprint, root; table `files(rel_path, language, content_hash, stored_ms)`: the extraction index |
| `blobs/` | LevelDB | `x:<language>:<content hash>` → extraction JSON (names, spans, signatures, docstrings, imports, calls — never whole files); `l:<mode>:<rankdir>:<parent>:<version>` → layout JSON (module `layout`) |

A different engine build (version + size and time of the executable) or schema wipes the folder when it is opened, so a changed parser never reads old results.

## How it plugs in

- The builder offers `pv::builder::ExtractionCache` (P1-BUILDR-012). `register.cpp` installs an implementation that finds the open project a file belongs to and uses that project's `ProjectCache`. `PV_CACHE=off` turns this off.
- `pv::cache::shared_cache(root)` gives other modules the same per-project cache (the layout module stores layouts there).
- RPC: `cache.status {project_id}` → `{dir, files, hits, misses, bytes}`; `cache.clear {project_id}` → `{ok: true}`.

## Measured

Generated Python project, 520 files, 101,000 lines, Release engine on the Windows dev machine (`project.open` until `ready`):

| | Time |
| --- | --- |
| First open (empty cache) | 1.11 s |
| Second open (all 501 extractions from the cache) | 0.49 s (2.3× faster) |
| Cache size | 4.2 MB |

The rest of the second open is file discovery, linking and metrics, which always run.
