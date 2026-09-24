# Internal representation

## Entities

- **NodeKind:** `project`, `package`, `module`, `class`, `function`, `method`, `variable`, `statement`, `external`.
- **EdgeKind:** `imports`, `calls`, `inherits`, `references`. Containment is **not** an edge; it is `parent_id`.
- **Level:** Project=0 · Package=1 · External=1 · Module=2 · Class=3 · Function=4 · Method=4 · Variable=5 · Statement=5.

## Store

- Hash maps of nodes and edges by id.
- Children index (parent id → child ids).
- In-edge and out-edge indexes per node.
- Per-file index (file path → node ids).
- Span index for "which node is at this line" lookups.

## Level views

A level view is the children of one parent node plus the edges between them. Edges between descendants are aggregated onto the visible children with id `agg|<kind>|<source_id>|<target_id>` and summed weights.

## Identity

Node ids follow card R7 exactly (for example `method:src/app/main.py#App.start`). They are built only from paths and names, so they stay stable across re-parses.

## Mutation

When a file changes (Phase 4), all nodes and edges of that file are replaced atomically under the project's write lock.
