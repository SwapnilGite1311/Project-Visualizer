# health module

Turns live runtime events into a health state for every element on the map — the colors of the live overlay — and keeps each node's `health` field in the graph up to date.

## States

For each element, the events of the last `window_ms` (default 60 s) are counted: calls, errors, the error rate and the 95th-percentile duration. The first rule that matches wins:

| State | When |
| --- | --- |
| **error** | error rate ≥ `error_rate` (default 5 %), or any error in the last 10 seconds |
| **stalled** | a stall event arrived in the last `2 × stall_ms` (default 10 s) and no successful call since |
| **warning** | some errors (older than 10 s, below the error rate), or slow (`p95 > warn_p95_ms`, default 1,000 ms), or a possible loop (more than `loop_calls` calls, default 1,000, inside one trace) |
| **ok** | at least one call in the window |
| **unknown** | no runtime data |

`reason` explains the state: `errors (10%)`, `stalled`, `slow (p95 1500 ms)`, `possible loop`.

## Propagation

A parent takes the **worst** state of its children (error > stalled > warning > ok > unknown), so a package turns red when a function deep inside it fails, and the problem is visible at every zoom level. A parent without events of its own adds up its children's calls and errors and gets the reason `child: <reason>`.

States are re-evaluated at most every 500 ms per project while events arrive; nodes whose state changed are written into the graph and sent to the UI as a `health.changed` notification (`{node_id, from, to}`).

## Thresholds

Defaults: `window_ms` 60000, `error_rate` 0.05, `warn_p95_ms` 1000, `stall_ms` 5000, `loop_calls` 1000. `health.config {project_id, thresholds?}` returns the current values and, when `thresholds` is given, changes only the fields present (invalid values are rejected). `health.get {project_id, node_ids?}` returns the states: all non-unknown ones, or exactly the requested ids.

## Limits

- Health reflects only the events the agents send: sampled or filtered agents mean fewer calls, and code that never runs stays unknown.
- One view per desktop app: events from several processes of the same service are merged, without per-process health.
- Durations are measured by the agents; network and queue time outside instrumented code is not included.
