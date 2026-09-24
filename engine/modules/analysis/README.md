# analysis module

The "software intelligence layer": numbers and findings about a whole project.

## Summary

`analysis.summary` — number of files (modules) and total lines; lines and files per language; how many nodes of each kind; the names of external packages; the 10 largest modules and packages (with their module counts); files with syntax errors and files that failed to parse.

## Hotspots

`analysis.hotspots {limit?}` (default 20) looks at functions, methods and modules. Each metric (complexity, fan-in, fan-out, lines) is divided by its maximum over these nodes, then:

`score = round(100 × (0.30 × complexity + 0.25 × fan_in + 0.25 × fan_out + 0.20 × lines))`

A reason is added for every metric where the node is in the top quarter (value ≥ the 75th percentile and above 0): "High complexity", "Many callers", "Many dependencies", "Large". Results are sorted by score.

## Entry points

`analysis.entry_points` marks where execution starts: modules with an `if __name__ == "__main__":` guard, modules with a conventional entry file name (`__main__.py`, `main.py`, `app.py`, `manage.py`, `wsgi.py`, `asgi.py`, `run.py`, `cli.py`) and module-level functions named `main`.

## Boundaries

`analysis.boundaries` treats every package as a boundary and counts edges (not weights): internal (both ends inside), outgoing and incoming. `instability = outgoing / (incoming + outgoing)` (0 when the package has no outside edges): 0 means others depend on it, 1 means it only depends on others.

## Call tree

`analysis.call_tree {node_id, depth?}` follows `calls` edges from a node, breadth first, up to `depth` levels (default 3, 1–6), and returns the nodes and edges it reached.
