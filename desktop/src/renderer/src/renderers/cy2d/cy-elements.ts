import type { ElementDefinition } from 'cytoscape';
import type { ViewGraph } from '../../view/model';

export function toElements(g: ViewGraph): ElementDefinition[] {
  const ids = new Set(g.nodes.map((n) => n.id));
  const nodes: ElementDefinition[] = g.nodes.map((n) => ({
    group: 'nodes',
    data: {
      id: n.id,
      label: n.label,
      displayLabel: n.badge ? `${n.label} [${n.badge}]` : n.label,
      color: n.color,
      borderColor: n.borderColor,
      size: n.size,
      shape: n.shape,
      opacity: n.opacity,
      kind: n.kind,
    },
    classes: n.pulse ? 'pulse' : '',
  }));
  const edges: ElementDefinition[] = g.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      group: 'edges',
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        color: e.color,
        width: e.width,
        opacity: e.opacity,
        kind: e.kind,
      },
      classes: e.animated ? 'animated' : '',
    }));
  return [...nodes, ...edges];
}
