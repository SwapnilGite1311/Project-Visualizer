# runtime module

The engine's side of live runtime data: agents (Python, Node.js, any OpenTelemetry app) send events to the desktop runtime hub, which forwards them with `runtime.ingest`. This module maps each event to the map, keeps the recent ones, and pushes 250 ms summaries to the UI.

## Mapping

- An event's `file_path` (absolute, or relative to the project) is made project-relative with `locate::to_project_relative`; the event's element is `graph.innermost_at(file, line)` — the innermost class, function or method containing the line, or the module (line 0 or outside any definition). Events from files outside the project stay unmapped (`node_id` `""`).
- Each mapped event remembers its span; a later event whose `parent_span_id` names that span gets `parent_node_id`, which is how *flows* between elements are found (up to 200,000 remembered spans per project, then the map starts over).
- Input is untrusted: `event_from_json` checks every field (card R12), cuts text to 4,096 characters (stacks to 16,384) and rejects unknown kinds; `runtime.ingest` counts invalid events as dropped instead of failing the whole batch.

## Buffer and windows

- Each project keeps the last **50,000** events in a ring buffer (oldest dropped first).
- Every ingest adds to the current window: calls per element (`node_hits`), flows between elements (`edge_flows`, key `"parent|child"`), errors and stalls. When 250 ms have passed since the window started, the engine sends a `runtime.update` notification with that window and starts a new one.
- `runtime.status` reports totals, the services seen, and `active` = an event arrived in the last 10 seconds.

## Listeners

Other modules react to every ingested batch without editing this one: in their own `register.cpp` they call

```cpp
pv::runtime::hub().add_listener([](const std::string& project_id, const std::vector<pv::runtime::MappedEvent>& batch) { … });
```

Listeners run after the hub's lock is released, in the order they were added (P3-HEALTH, P3-ERRMAP and P3-MODTR use this). Tests call `hub().reset_for_tests()`, which also removes listeners.

## Methods

- `runtime.ingest {project_id, events}` → `{accepted, mapped, dropped}`
- `runtime.status {project_id}` → `{project_id, active, events_total, events_buffered, last_event_ms, services}`
- `runtime.clear {project_id}` → `{ok: true}`
- `runtime.trace {project_id, trace_id}` → `{trace_id, steps}`: the trace's events in time order with their nodes
- `runtime.recent_traces {project_id, limit = 20}` → `{traces}`: newest first, with root name, duration, spans and errors
- Notification `runtime.update {project_id, window_start_ns, window_end_ns, node_hits, edge_flows, errors, stalls}`
