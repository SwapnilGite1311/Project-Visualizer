import type { NodeStyle, Overlay } from '../../core/overlay';
import type { NeighborsResult, PathResult } from './deps-api';

const USES = '#22c55e';
const USED_BY = '#3b82f6';
const BOTH = '#a855f7';
const ROOT = '#fbbf24';
const PATH = '#f97316';
const CYCLE = '#ef4444';

const visible = (id: string) => id !== 'project:';

// Uses (green) and used-by (blue) at every level: each item colors all its ancestors, so a package lights up when anything inside it is a neighbour.
export function buildDepsOverlay(result: NeighborsResult, rootAncestors: string[]): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  for (const id of rootAncestors.filter(visible)) nodes[id] = { borderColor: ROOT };
  for (const item of result.items) {
    const color = item.direction === 'out' ? USES : USED_BY;
    for (const id of item.ancestor_ids.filter(visible)) {
      const current = nodes[id]?.color;
      nodes[id] = { ...nodes[id], color: current && current !== color ? BOTH : color };
    }
    nodes[item.node_id] = { ...nodes[item.node_id], badge: item.direction === 'out' ? 'uses' : 'used by' };
  }
  return { priority: 45, dimOthers: true, nodes, edges: {} };
}

export function buildPathOverlay(path: PathResult, ancestorsById: Record<string, string[]>): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  path.node_ids.forEach((id) => {
    for (const a of (ancestorsById[id] ?? [id]).filter(visible)) nodes[a] = { ...nodes[a], color: PATH };
  });
  path.node_ids.forEach((id, k) => {
    nodes[id] = { ...nodes[id], color: PATH, badge: String(k + 1) };
  });
  return { priority: 55, nodes, edges: {} };
}

export function buildCycleOverlay(nodeIds: string[], ancestorsById: Record<string, string[]>): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  for (const id of nodeIds) {
    for (const a of (ancestorsById[id] ?? [id]).filter(visible)) nodes[a] = { color: CYCLE };
  }
  return { priority: 56, nodes, edges: {} };
}
