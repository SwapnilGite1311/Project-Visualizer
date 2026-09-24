# graph module

## Graph

- `add_node(node)` — insert a node; returns false (no change) if the id already exists.
- `add_edge(edge)` — insert an edge; if the id already exists, add its weight to the stored edge.
- `find_node(id)` / `find_node_mut(id)` — pointer to the node or nullptr.
- `find_edge(id)` — pointer to the edge or nullptr.
- `node(id)` — the node; throws `PvError(err::NodeNotFound)` if missing.
- `children(id)` — child nodes in insertion order.
- `out_edges(id)` / `in_edges(id)` — outgoing / incoming edges in insertion order.
- `nodes_in_file(file_path)` — every node whose `file_path` is that file.
- `all_nodes()` / `all_edges()` — everything, sorted by id.
- `node_count()` / `edge_count()` — sizes.
- `ancestors(id)` — ids from the root down to `id` (inclusive).
- `ancestor_at_level(id, level)` — the first node on the way up whose level is ≤ `level`.
- `is_descendant(id, ancestor_id)` — true if `ancestor_id` is `id` or one of its ancestors.
- `descendants(id)` — depth-first pre-order ids below `id` (not including it).
- `remove_file(file_path)` — remove all nodes of a file and every edge touching them; returns the count.
- `innermost_at(file_path, line)` — the smallest class/function/method containing the line, else the module node.
- `clear()` — remove everything.

## Level views

`build_level_view(graph, parent_id)`:

1. `parent` = the parent node (throws if missing); `nodes` = copies of its children.
2. Map every node id in each child's subtree (the child + its descendants) to that child's id.
3. For each out-edge of every mapped node: skip it if the target is outside the view or inside the same displayed child; otherwise add its weight to the aggregate `(kind, source child, target child)`.
4. Each aggregate becomes an edge with id `agg|<kind>|<source>|<target>` and `resolved = true`.
5. Sort nodes by (level, name, id) and edges by id.

## Rules

- Containment is `parent_id`, not an edge.
- Pointers returned by the graph stay valid until that node (or edge) is removed.
- Callers must hold the project lock while reading or changing a graph.
