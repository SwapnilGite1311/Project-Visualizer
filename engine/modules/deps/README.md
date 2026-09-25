# deps module

Dependency navigation: who uses an element, what it uses, how one element reaches another, and circular dependencies. Works at every abstraction level, because an element always counts together with everything inside it.

## Neighbors

`neighbors(g, node_id, direction, depth, kinds)` walks the edges step by step:

- The start set is the element and all its descendants (asking about a module includes its functions).
- `out` follows edges forwards (what it uses), `in` backwards (who uses it), `both` does `out` then `in`.
- `depth` is 1–5; each item records its `distance` (1 = direct), `direction` and `ancestor_ids` (root first), so the UI can highlight it at any level.
- `kinds` limits the edge kinds (empty = all). Every edge that was followed is returned once, sorted by id; items are sorted by distance, direction and id.

## Path

`find_path(g, from_id, to_id, kinds, max_depth)` is a breadth-first search over outgoing edges (sorted by id, so results are stable) from the start set of `from_id`. The first element reached that is `to_id` or inside it ends the search; the result lists the nodes and the edges from the start element to it. `max_depth` is 1–12; if nothing is reached, `found` is false.

## Cycles

`find_cycles(g, level, limit)` groups every element into its ancestor at `level` (1 packages, 2 modules, 3 classes, 4 functions and methods), builds a graph of the imports/calls/inherits edges between different groups, and finds strongly connected components with Tarjan's algorithm. Components with at least two members are cycles; they are sorted by size (largest first), then by first id, and cut to `limit` (1–100).

## Methods

- `deps.neighbors {project_id, node_id, direction = "both", depth = 1, kinds?}` → `{root_id, items, edges}`
- `deps.focus {project_id, node_id, radius = 1}` → the same as neighbors in both directions with `depth = radius`
- `deps.path {project_id, from_id, to_id, kinds?, max_depth = 8}` → `{found, node_ids, edge_ids}`
- `deps.cycles {project_id, level = 2, limit = 20}` → `{cycles: [{node_ids}]}`
