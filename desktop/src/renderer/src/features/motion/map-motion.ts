import type { NodeStyle, Overlay } from '../../core/overlay';

export interface ChainFrame {
  nodeId: string;
  ancestors: string[]; // root first, including the node itself
}

// The element of the current level that contains the frame's node (the node itself, or its nearest ancestor on this level).
function visibleOf(frame: ChainFrame, levelNodeIds: Set<string>): string | null {
  const chain = frame.ancestors.length ? frame.ancestors : [frame.nodeId];
  for (let k = chain.length - 1; k >= 0; k--) {
    if (levelNodeIds.has(chain[k])) return chain[k];
  }
  return null;
}

export function buildMotionOverlay(
  levelNodeIds: Set<string>,
  levelEdges: Array<{ id: string; source: string; target: string }>,
  chain: ChainFrame[],
  previousVisible: string | null,
): { overlay: Overlay; visible: string | null } {
  const nodes: Record<string, NodeStyle> = {};
  const edges: Overlay['edges'] = {};
  for (const frame of chain.slice(0, -1)) {
    const v = visibleOf(frame, levelNodeIds);
    if (v) nodes[v] = { color: '#38bdf8' };
  }
  const top = chain.length ? visibleOf(chain[chain.length - 1], levelNodeIds) : null;
  if (top) {
    // A fill color too: the 3D renderer shows colors but not borders or pulses.
    nodes[top] = { pulse: true, color: '#fbbf24', borderColor: '#fbbf24', badge: '▶' };
    if (previousVisible && previousVisible !== top) {
      const edge = levelEdges.find(
        (e) => (e.source === previousVisible && e.target === top) || (e.source === top && e.target === previousVisible),
      );
      if (edge) edges[edge.id] = { animated: true, color: '#fbbf24', width: 4 };
    }
  }
  return { overlay: { priority: 50, nodes, edges }, visible: top };
}
