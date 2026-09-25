import type { NodeStyle, Overlay } from '../../core/overlay';
import type { Frame } from './errors-api';

const ORIGIN = '#ef4444';
const PATH = '#fb923c';

const visible = (id: string) => id !== 'project:';

// Where an error happened: the origin (and what contains it) in red, the other project frames in orange, numbered in stack order.
export function buildErrorOverlay(
  frames: Frame[],
  ancestorsById: Record<string, string[]>,
): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  const origin = frames.find((f) => f.is_origin && f.node_id);
  if (origin) {
    for (const id of (ancestorsById[origin.node_id] ?? [origin.node_id]).filter(visible))
      nodes[id] = { color: ORIGIN };
    nodes[origin.node_id] = { color: ORIGIN, badge: 'error here' };
  }
  let n = 0;
  for (const f of frames) {
    if (f === origin || !f.in_project || !f.node_id || !visible(f.node_id)) continue;
    n++;
    if (nodes[f.node_id]?.badge === 'error here') continue;
    const badge = nodes[f.node_id]?.badge ? `${nodes[f.node_id].badge},${n}` : String(n);
    nodes[f.node_id] = { color: nodes[f.node_id]?.color === ORIGIN ? ORIGIN : PATH, badge };
  }
  return { priority: 60, nodes, edges: {} };
}
