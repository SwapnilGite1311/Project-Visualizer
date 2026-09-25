import { useEffect, useRef } from 'react';
import { getAncestors, getLevelView } from '../../api/engine';
import type { LevelView } from '../../api/types';
import { useAppStore } from '../../core/store';
import { buildMotionOverlay } from './map-motion';
import { currentStack, useMotionStore } from './motion-store';

const ancestorCache = new Map<string, Promise<string[]>>();
const levelCache = new Map<string, Promise<LevelView>>();

function ancestorsOf(pid: string, nodeId: string): Promise<string[]> {
  const key = pid + '|' + nodeId;
  if (!ancestorCache.has(key)) {
    ancestorCache.set(
      key,
      getAncestors(pid, nodeId).then(
        (nodes) => nodes.map((n) => n.id),
        () => [],
      ),
    );
  }
  return ancestorCache.get(key)!;
}

function levelOf(pid: string, parentId: string, version: number): Promise<LevelView> {
  const key = `${pid}|${parentId}|${version}`;
  if (!levelCache.has(key)) levelCache.set(key, getLevelView(pid, parentId));
  return levelCache.get(key)!;
}

// Keeps the "motion" overlay in step with the player while it is in map mode (works for the 2D and 3D renderers).
export function MapMotionSync() {
  const index = useMotionStore((s) => s.index);
  const status = useMotionStore((s) => s.status);
  const mode = useMotionStore((s) => s.mode);
  const steps = useMotionStore((s) => s.steps);
  const projectId = useAppStore((s) => s.projectId);
  const parentId = useAppStore((s) => s.currentParentId);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const setOverlay = useAppStore.getState().setOverlay;
    if (status !== 'ready' || mode !== 'map' || !projectId) {
      previous.current = null;
      setOverlay('motion', null);
      return;
    }
    let cancelled = false;
    const stack = currentStack().filter((f) => f.nodeId);
    void (async () => {
      try {
        const [view, chain] = await Promise.all([
          levelOf(projectId, parentId, graphVersion),
          Promise.all(stack.map(async (f) => ({ nodeId: f.nodeId, ancestors: await ancestorsOf(projectId, f.nodeId) }))),
        ]);
        if (cancelled) return;
        const ids = new Set(view.nodes.map((n) => n.id));
        const edges = view.edges.map((e) => ({ id: e.id, source: e.source_id, target: e.target_id }));
        const { overlay, visible } = buildMotionOverlay(ids, edges, chain, previous.current);
        previous.current = visible;
        setOverlay('motion', overlay);
      } catch {
        // the level is being reloaded; the next step redraws
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [index, status, mode, steps, projectId, parentId, graphVersion]);

  return null;
}
