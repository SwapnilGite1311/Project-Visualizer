# Analysis engine

## Metrics

- `loc` = end_line − start_line + 1.
- `complexity` = 1 + number of decision points.
- `fan_in` = sum of the weights of incoming `calls` / `imports` edges.
- `fan_out` = sum of the weights of outgoing `calls` / `imports` edges.

## Hotspot score

For function, method and module nodes:

`score = round(100 × (0.30 × c + 0.25 × fi + 0.25 × fo + 0.20 × l))`

where c, fi, fo and l are complexity, fan_in, fan_out and loc, each divided by the maximum of that metric over nodes of the same kinds (0 if the maximum is 0).

## Impact

Reverse breadth-first search over the in-edges of the node and its descendants. Each affected node gets its distance. The risk level uses the formula defined in P1-IMPACT.

## Entry points

- A main guard (`if __name__ == "__main__":`).
- Conventional file names (`main.py`, `__main__.py`, `app.py`, `manage.py`, `wsgi.py`, `asgi.py`).
- Functions named `main`.

## Boundaries

Packages are boundaries. Coupling = number of edges that cross from one package into another.
