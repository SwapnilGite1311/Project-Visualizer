import type { ViewGraph } from '../../view/model';

export interface FgNode {
  id: string;
  name: string;
  color: string;
  val: number;
  opacity: number;
  badge: string;
}
export interface FgLink {
  id: string;
  source: string;
  target: string;
  color: string;
  width: number;
  animated: boolean;
}

export function toGraphData(g: ViewGraph): { nodes: FgNode[]; links: FgLink[] } {
  const ids = new Set(g.nodes.map((n) => n.id));
  return {
    nodes: g.nodes.map((n) => ({ id: n.id, name: n.label, color: n.color, val: n.size / 10, opacity: n.opacity, badge: n.badge })),
    links: g.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target, color: e.color, width: e.width, animated: e.animated })),
  };
}
