# modtrace module

Module tracing: the runtime view of *module boundaries* — every place where code in one file calls code in another — built from the events kept by the runtime hub.

## Crossings

`modtrace.boundaries {project_id, window_ms = 300000}` looks at the events of the last `window_ms` (counted back from the newest event) that have both an element and a parent element. Each element is reduced to its module (file); when the parent's module and the child's module differ, that call is a **crossing** `from_id → to_id`. Crossings are grouped per module pair with:

- `count` — how many calls crossed;
- `avg_ms` — the average duration of the called side;
- `errors` and `stalls` — how many of those calls failed or stalled.

They are sorted by count, busiest first.

## Following a request

`modtrace.follow {project_id, trace_id, direction, from_node_id?}` lists the **hops** of one request (one trace) from module to module, in time order:

- `forward` — the hops from the first moment the request reaches the module of `from_node_id` onwards (the whole trace when it is empty): "where does this request go after it enters here?";
- `backward` — from the last event in that module up through its callers: "how did the request get here?", nearest hop first.

Each hop has the calling and called module, the start time, duration and status of the called side.

## Loops and stalls

A module pair that is crossed more than **1,000** times inside one trace counts as a possible loop (`loops` = the number of such traces); this fixed limit keeps the module independent of the health thresholds. Stall events at a boundary are counted in `stalls`, and failing calls in `errors`, so slow or broken integration points between modules stand out in the crossings list.
