# context module

`context.for_node {project_id, node_id, max_chars?}` returns the only facts the LLM is allowed to use when it explains a node (card R11).

## What is included

- `node` — the full node (kind, names, file path, span, metrics).
- `source` — the node's own source lines (modules, classes, functions, methods only), and `source_truncated`.
- `parent` — id, kind and name of the parent (null for the project).
- `children` — id, kind and name of the children.
- `callers` / `callees` — nodes that call this node / that it calls, with their file paths.
- `imports` — for modules only: what the module imports.
- `related_node_ids` — every id above; these are the only ids the AI may cite as `[[node:<id>]]`.
- `approx_tokens` — a rough size estimate (characters / 4).

## What is never included

- Source code of any other file or node (neighbours are sent as names and ids only).
- Secrets, environment files or anything outside the project graph.
- The whole repository.

## Size limits

- `max_chars` limits the source text (default 12,000; clamped to 1,000–100,000).
- At most 50 children, 20 callers, 20 callees and 30 imports; every list is sorted by id before cutting.
