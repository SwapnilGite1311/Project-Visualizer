import { type Edge, MarkerType, type Node } from '@xyflow/react';
import type { LayoutPoint, ViewGraph } from '../../view/model';

export const NODE_HEIGHT = 48;

// Same size rule as the engine's layout.compute, so engine positions (node centres) fit the drawn boxes.
export function nodeWidth(label: string): number {
  return Math.min(260, Math.max(80, 40 + 7 * label.length));
}

export type PvNodeData = {
  label: string;
  kind: string;
  color: string;
  borderColor: string;
  badge: string;
  opacity: number;
  pulse: boolean;
  selected: boolean;
  width: number;
};

export type FlowEdgeData = {
  points: LayoutPoint[]; // centre-to-centre polyline in flow coordinates
  color: string;
  width: number;
  opacity: number;
  animated: boolean;
};

export type PvFlowNode = Node<PvNodeData, 'pv'>;
export type PvFlowEdge = Edge<FlowEdgeData, 'flow'>;

// Positions for a level without engine positions (the engine was not reachable): a simple grid.
export function gridCentres(ids: string[]): Record<string, LayoutPoint> {
  const cols = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
  const out: Record<string, LayoutPoint> = {};
  ids.forEach((id, i) => {
    out[id] = { x: (i % cols) * 240 + 130, y: Math.floor(i / cols) * 110 + 24 };
  });
  return out;
}

// Moves `from` (a box centre) toward `toward` until it reaches the border of the box, so edges start and end at the
// boxes instead of under them (arrowheads stay visible).
export function clipToBox(from: LayoutPoint, toward: LayoutPoint, width: number, height: number): LayoutPoint {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) return from;
  const t = Math.min(dx === 0 ? Infinity : width / 2 / Math.abs(dx), dy === 0 ? Infinity : height / 2 / Math.abs(dy));
  if (t >= 1) return from;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

export function toFlow(graph: ViewGraph, selectedId: string | null = null): { nodes: PvFlowNode[]; edges: PvFlowEdge[] } {
  const missing = graph.nodes.filter((n) => !graph.positions?.[n.id]).map((n) => n.id);
  const fallback = gridCentres(missing);
  const centre = (id: string): LayoutPoint => graph.positions?.[id] ?? fallback[id] ?? { x: 0, y: 0 };

  const nodes: PvFlowNode[] = graph.nodes.map((n) => {
    const width = nodeWidth(n.label);
    const c = centre(n.id);
    return {
      id: n.id,
      type: 'pv',
      position: { x: c.x - width / 2, y: c.y - NODE_HEIGHT / 2 },
      width,
      height: NODE_HEIGHT,
      draggable: false,
      selectable: false,
      data: {
        label: n.label,
        kind: n.kind,
        color: n.color,
        borderColor: n.borderColor,
        badge: n.badge,
        opacity: n.opacity,
        pulse: n.pulse,
        selected: n.id === selectedId,
        width,
      },
    };
  });

  const ids = new Set(graph.nodes.map((n) => n.id));
  const widths = new Map(graph.nodes.map((n) => [n.id, nodeWidth(n.label)]));
  const clipped = (points: LayoutPoint[], source: string, target: string): LayoutPoint[] => {
    if (points.length < 2) return points;
    const out = [...points];
    out[0] = clipToBox(out[0], out[1], widths.get(source) ?? 80, NODE_HEIGHT);
    const last = out.length - 1;
    out[last] = clipToBox(out[last], out[last - 1], (widths.get(target) ?? 80) + 6, NODE_HEIGHT + 6); // room for the arrow
    return out;
  };
  const edges: PvFlowEdge[] = graph.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      id: e.id,
      type: 'flow',
      source: e.source,
      target: e.target,
      selectable: false,
      markerEnd: { type: MarkerType.ArrowClosed, color: e.color, width: 16, height: 16 },
      data: {
        points: clipped(graph.edgePoints?.[e.id] ?? [centre(e.source), centre(e.target)], e.source, e.target),
        color: e.color,
        width: e.width,
        opacity: e.opacity,
        animated: e.animated,
      },
    }));
  return { nodes, edges };
}
