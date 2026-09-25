import { useEffect } from 'react';
import type { EdgeStyle, NodeStyle, Overlay } from '../../core/overlay';
import { useAppStore } from '../../core/store';
import { displayedView, useLiveStore } from './live-store';
import type { LiveLevelView } from './runtime-api';

const FLOW = '#22c55e';

// Activity at the current level: call counts as badges on busy elements and moving edges where calls flow.
export function buildLiveOverlay(view: LiveLevelView): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  for (const [id, s] of Object.entries(view.live)) {
    if (s.calls > 0) nodes[id] = { badge: String(s.calls), pulse: true };
  }
  const edges: Record<string, EdgeStyle> = {};
  for (const f of view.flows) {
    if (f.edge_id)
      edges[f.edge_id] = {
        animated: true,
        width: 2 + Math.min(6, Math.log2(f.count + 1)),
        color: FLOW,
      };
  }
  return { priority: 20, nodes, edges };
}

function sync(): void {
  const s = useLiveStore.getState();
  const view = s.enabled ? displayedView(s) : null;
  useAppStore.getState().setOverlay('live', view ? buildLiveOverlay(view) : null);
}

export function useLiveOverlaySync(): void {
  useEffect(() => {
    sync();
    const off = useLiveStore.subscribe(sync);
    return () => {
      off();
      useAppStore.getState().setOverlay('live', null);
    };
  }, []);
}
