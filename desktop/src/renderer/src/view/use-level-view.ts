import { useCallback, useEffect, useRef, useState } from 'react';
import { rpc } from '../api/bridge';
import { getLevelView } from '../api/engine';
import type { LevelView } from '../api/types';
import { useAppStore } from '../core/store';
import type { LayoutPoint } from './model';

export interface EngineLayout {
  graph_version: number;
  cached: boolean;
  positions: Record<string, LayoutPoint>;
  edges: Record<string, LayoutPoint[]>;
}

// Loads the level view of the current parent. With `layoutMode`, also asks the engine for positions (layout.compute)
// and returns both together, so a renderer never draws a level without its layout. A layout error is not fatal:
// the level is returned without positions and the renderer lays it out itself.
export function useLevelView(layoutMode: '2d' | '3d' | null = null): {
  view: LevelView | null;
  layout: EngineLayout | null;
  loading: boolean;
  error: string | null;
  reload(): void;
} {
  const projectId = useAppStore((s) => s.projectId);
  const parentId = useAppStore((s) => s.currentParentId);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const [view, setView] = useState<LevelView | null>(null);
  const [layout, setLayout] = useState<EngineLayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const counter = useRef(0);

  useEffect(() => {
    if (!projectId) {
      setView(null);
      setLayout(null);
      setLoading(false);
      setError(null);
      return;
    }
    const request = ++counter.current;
    setLoading(true);
    setError(null);
    const load = async () => {
      const v = await getLevelView(projectId, parentId);
      let l: EngineLayout | null = null;
      if (layoutMode) {
        l = await rpc<EngineLayout>('layout.compute', { project_id: projectId, parent_id: parentId, mode: layoutMode }).catch(
          () => null,
        );
      }
      return { v, l };
    };
    load()
      .then(({ v, l }) => {
        if (request !== counter.current) return;
        setLayout(l);
        setView(v);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (request !== counter.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [projectId, parentId, graphVersion, reloads, layoutMode]);

  const reload = useCallback(() => setReloads((n) => n + 1), []);
  return { view: projectId ? view : null, layout: projectId ? layout : null, loading, error, reload };
}
