import type { LevelView } from '../../api/types';
import type { EdgeStyle, NodeStyle, Overlay } from '../../core/overlay';

export function buildFocusOverlay(view: LevelView, nodeId: string): Overlay {
  const nodes: Record<string, NodeStyle> = { [nodeId]: { opacity: 1, borderColor: '#fbbf24' } };
  const edges: Record<string, EdgeStyle> = {};
  for (const e of view.edges) {
    if (e.source_id !== nodeId && e.target_id !== nodeId) continue;
    const other = e.source_id === nodeId ? e.target_id : e.source_id;
    if (other !== nodeId) nodes[other] = { opacity: 1 };
    edges[e.id] = { opacity: 1, width: 3 };
  }
  return { priority: 40, dimOthers: true, nodes, edges };
}
