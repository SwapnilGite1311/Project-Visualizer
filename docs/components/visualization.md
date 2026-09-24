# Visualization engine

## Render-agnostic core

A `ViewGraph` (`ViewNode[]` + `ViewEdge[]`) is built from one level view plus the active overlays. Renderers only draw a `ViewGraph`; they never call the engine.

## Renderers

- 2D: Cytoscape with the dagre layout (`renderers/cy2d`).
- 3D: 3d-force-graph (`renderers/fg3d`).
- Both implement the same `GraphRenderer` interface, so features work in both modes.

## Overlays

Features publish overlays (node and edge styles) with a priority. Styles are merged in priority order; the highest priority wins per property.

## Interaction

- Click selects a node.
- Double-click drills down into it.
- Right-click opens node actions.
- Hover shows a small card.

## Performance

- Only one level view is shown at a time.
- Overlay changes update styles in place without re-running the layout.
