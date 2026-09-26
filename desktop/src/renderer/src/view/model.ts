import type { GraphNode, LevelView } from '../api/types';
import { mergeOverlays, type Overlay } from '../core/overlay';

export interface ViewNode {
  id: string;
  label: string;
  kind: string;
  level: number;
  color: string;
  borderColor: string;
  size: number;
  shape: string;
  badge: string;
  pulse: boolean;
  opacity: number;
  hasChildren: boolean;
  data: GraphNode;
}
export interface ViewEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
  weight: number;
  color: string;
  width: number;
  animated: boolean;
  opacity: number;
}
export interface LayoutPoint { x: number; y: number; z?: number }
export interface ViewGraph {
  parentId: string;
  nodes: ViewNode[];
  edges: ViewEdge[];
  positions?: Record<string, LayoutPoint>; // from layout.compute, for renderers with layout: 'engine'
  edgePoints?: Record<string, LayoutPoint[]>;
}

const KIND_COLORS: Record<string, string> = {
  project: '#8b5cf6',
  package: '#3b82f6',
  module: '#06b6d4',
  class: '#f59e0b',
  function: '#10b981',
  method: '#34d399',
  variable: '#a3a3a3',
  statement: '#737373',
  external: '#94a3b8',
};
const EDGE_COLORS: Record<string, string> = {
  imports: '#64748b',
  calls: '#22c55e',
  inherits: '#f97316',
  references: '#a855f7',
};
const CONTAINERS = new Set(['project', 'package', 'module', 'class', 'function', 'method']);

export function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? '#9ca3af';
}

export function kindShape(kind: string): string {
  if (kind === 'project' || kind === 'package') return 'round-rectangle';
  if (kind === 'module') return 'rectangle';
  if (kind === 'class') return 'diamond';
  if (kind === 'external') return 'hexagon';
  return 'ellipse';
}

export function nodeSize(loc: number): number {
  return 30 + Math.min(50, Math.round(10 * Math.log10(Math.max(1, loc))));
}

export function edgeColor(kind: string): string {
  return EDGE_COLORS[kind] ?? '#9ca3af';
}

export function edgeWidth(weight: number): number {
  return 1 + Math.min(6, Math.log2(Math.max(1, weight)));
}

export function buildViewGraph(view: LevelView, overlays: Record<string, Overlay>): ViewGraph {
  const merged = mergeOverlays(overlays);
  const nodes: ViewNode[] = view.nodes.map((n) => {
    const color = kindColor(n.kind);
    const base: ViewNode = {
      id: n.id,
      label: n.name,
      kind: n.kind,
      level: n.level,
      color,
      borderColor: color,
      size: nodeSize(n.metrics.loc),
      shape: kindShape(n.kind),
      badge: '',
      pulse: false,
      opacity: 1,
      hasChildren: CONTAINERS.has(n.kind),
      data: n,
    };
    const style = merged.nodes[n.id];
    if (!style) return merged.dimOthers ? { ...base, opacity: 0.25 } : base;
    return { ...base, ...style };
  });
  const edges: ViewEdge[] = view.edges.map((e) => {
    const base: ViewEdge = {
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      kind: e.kind,
      weight: e.weight,
      color: edgeColor(e.kind),
      width: edgeWidth(e.weight),
      animated: false,
      opacity: 1,
    };
    const style = merged.edges[e.id];
    if (!style) return merged.dimOthers ? { ...base, opacity: 0.25 } : base;
    return { ...base, ...style };
  });
  return { parentId: view.parent.id, nodes, edges };
}
