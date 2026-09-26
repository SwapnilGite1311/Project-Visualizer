# sim — what-if simulation

Try a change on a copy of the twin and see what would happen, using the traces your app really produced (US-23). The simulation runs in the local engine (founder decision D8: it stays offline and local).

## Sandboxes

`sim.create {project_id, label?}` copies the project's graph into a new, separate project (`view_project_id`) that the map can show next to the real one. Sandboxes live in memory until `sim.discard` (which also closes the view project) or the engine stops. `sim.list {project_id}` lists them.

## Change kinds

`sim.apply {sandbox_id, change}`:

| Kind | Effect |
| --- | --- |
| `delete_node` | the node and everything inside it are gone: calls into them fail |
| `remove_edge` | calls from `source_id` (or anything inside it) to `target_id` (or anything inside it) fail |
| `add_edge` | adds an unresolved edge to the sandbox copy (the real project is untouched) |
| `set_latency` | the node's own time × `factor` (0.1–100) |
| `set_error_rate` | the node fails with probability `rate` (0–1), decided by a hash of the event id so runs repeat exactly |
| `rename`, `move` | recorded; the static impact shows what depends on the node |

The answer lists the affected node ids.

## Replay rules

`sim.run {sandbox_id, scenario?: {trace_limit}}` takes the newest traces (default 500) recorded for the **base** project and replays each span:

- a step fails in the sandbox when it failed for real, or when a change above makes it fail; a new failure makes every caller span of the same trace fail too;
- simulated time = own time × latency factor + the extra time of the steps it called;
- results: traces that fail for real vs in the sandbox, p95 trace latency real vs simulated, per-node effects, failed trace ids (max 100), and `broken_node_ids` (nodes that fail more often in the sandbox).

Without recorded traces the answer is `mode: "static"`: the dependents of deleted, renamed or moved nodes and the sources of removed edges.

`sim.flows {sandbox_id, parent_id?}` gives the replayed flows between the elements of one level, with how many would fail — for animating the sandbox map.

## Limits

A simulation is only as good as the recorded traces: paths your app did not run are not simulated, and a new edge (`add_edge`) has no recorded behaviour. Latency changes do not model queues or concurrency.
