# rtsync module

Runtime-to-static synchronization: live data at the same zoom level as the map. Runtime events point at functions and methods; the user may be looking at packages. `rtsync.level_view` rolls the events up to whatever level is on screen.

## What it returns

`rtsync.level_view {project_id, parent_id = "project:", window_ms = 5000}` returns the normal level view (`parent`, `nodes`, `edges` — the same as `graph.level_view`) plus:

- `live` — for each element of the level that had activity in the window: `calls`, `errors`, `stalls`, `p95_ms` (95th-percentile duration) and `health` (from the health module, `unknown` if none). An event counts for the element that *is* its node or *contains* it: a call in `app/services.py#UserService.get_user` counts for `package:app` at the top level and for `module:app/services.py` inside `app`.
- `flows` — calls between two different elements of the level: `source_id`, `target_id`, `count` and `edge_id`. Calls that stay inside one element (for example two functions of the same package at the top level) are not flows at that level.

## Matching flows to edges

A flow from A to B gets `edge_id` = `agg|calls|A|B` when the static level view has that aggregated call edge, so the UI can animate the existing line on the map. When the code analysis did not find the call (dynamic calls, callbacks, calls through variables), `edge_id` is `""` and the UI draws a separate runtime-only flow — these are exactly the connections the static map misses.

## Window

Only events whose start is within `window_ms` of the **newest** event count, so a paused program keeps showing its last activity instead of going blank. `window_ms` is clamped to 1,000–600,000 (1 second to 10 minutes). Health states come from the health module's own window (default 60 s), evaluated at request time.
