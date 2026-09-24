import type { ImpactResult } from '../../api/types';
import type { NodeStyle, Overlay } from '../../core/overlay';

function colorFor(distance: number): string {
  if (distance <= 1) return '#ef4444';
  if (distance === 2) return '#f97316';
  return '#eab308';
}

export function buildImpactOverlay(result: ImpactResult, rootAncestors: string[]): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  const bestDistance = new Map<string, number>();

  for (const affected of result.affected) {
    for (const id of affected.ancestor_ids) {
      if (id === 'project:') continue;
      const known = bestDistance.get(id);
      if (known !== undefined && known <= affected.distance) continue;
      bestDistance.set(id, affected.distance);
      nodes[id] = { ...nodes[id], color: colorFor(affected.distance) };
    }
  }
  for (const affected of result.affected) {
    nodes[affected.node_id] = { ...nodes[affected.node_id], badge: `d${affected.distance}` };
  }
  for (const id of rootAncestors) {
    if (id === 'project:') continue;
    nodes[id] = { ...nodes[id], borderColor: '#fbbf24' };
  }
  if (result.root_id !== 'project:') nodes[result.root_id] = { ...nodes[result.root_id], badge: 'changed' };
  return { priority: 50, nodes, edges: {}, dimOthers: true };
}
