# impact module

## Algorithm

`impact.analyze {project_id, node_id, max_depth?}` answers "what breaks if I change this?":

```text
inside   = the node + all its descendants
visited  = inside
frontier = inside (sorted)
for distance d = 1 .. max_depth (1–10, default 5):
    for each node in the frontier, for each incoming edge (sorted by id):
        the edge's source is affected at distance d, "via" the edge kind, "from" the frontier node
        (skip sources already visited)
    stop when nothing new was found; the new sources become the frontier
```

Every affected node carries its `ancestor_ids` (project root first) so the UI can highlight it at any level of the map.

## Risk score

- `d1` = affected nodes at distance 1; `dn` = affected nodes at distance ≥ 2.
- `groups` = number of distinct packages the affected nodes belong to (nearest package ancestor; nodes outside any package count as the project).
- `score = min(100, d1 × 8 + dn × 3 + max(0, groups − 1) × 10)`.
- Levels: < 20 `low`, < 45 `medium`, < 70 `high`, otherwise `critical`.
- `factors` explain the score: `"<d1> direct dependents"`, `"<dn> indirect dependents"`, `"spans <groups> packages"`.

## Limits

- Only static edges are used (imports, calls, inheritance found by the parser).
- Dynamic calls the parser could not resolve (for example `service.get_user()` on an instance variable, `getattr`) are missed, so the real impact can be larger.
- Phase 4 adds change types (rename, signature change, delete) and runtime evidence to make the estimate sharper.
