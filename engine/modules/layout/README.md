# layout — engine-side graph layouts

The new architecture's graph subsystem computes positions in C++; the React Flow (2D) and React Three Fiber (3D) views ask for them with `layout.compute`.

## `layout.compute`

`{project_id, parent_id? = "project:", mode: "2d" | "3d", rankdir? = "TB" | "LR"}` → `{graph_version, cached, positions: {id: {x, y, z?}}, edges: {edge id: [{x, y}, …]}}`

- The level view is the same one `graph.level_view` returns for `parent_id`.
- Node size: width `clamp(40 + 7 × name length, 80, 260)`, height 48.
- `graph_version` is a hash of the view's node ids, names and edge ids. Layouts are cached in the project's local cache under `mode:rankdir:parent:version`; a changed view gets a new version and a fresh layout.
- `edges` holds polylines for 2D only (3D edges are straight lines).

## Algorithms

**Layered 2D (Dagre-style Sugiyama)** — `layered()`:
1. break cycles by reversing DFS back edges;
2. ranks by longest path;
3. dummy nodes on edges that span several ranks (they become the bends of the edge);
4. order each rank by the barycenter of its neighbours (8 sweeps, the ordering with the fewest crossings is kept);
5. coordinates: pack each rank, then pull nodes toward their neighbours while keeping order and spacing;
6. nodes without edges go to a grid after the layered part. `LR` swaps the axes. Nodes are sorted by id first, so the result is deterministic.

**3D force-directed** — `force3d()`: Fruchterman–Reingold in 3D with a gentle pull to the centre; start positions from a random generator seeded by the ids (deterministic); Barnes–Hut octree (θ = 0.8) above 500 nodes; 300 iterations, fewer for views above 500 nodes.

## Measured (Windows dev machine)

| | Release | Debug |
| --- | --- | --- |
| layered, 2,000 nodes | 21 ms | 280 ms |
| force3d, 1,200 nodes, 60 iterations | 234 ms | 819 ms |
