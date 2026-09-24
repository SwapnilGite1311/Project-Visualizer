import { useCallback, useEffect, useRef, useState } from 'react';
import { getLevelView } from '../api/engine';
import type { LevelView } from '../api/types';
import { useAppStore } from '../core/store';

export function useLevelView(): { view: LevelView | null; loading: boolean; error: string | null; reload(): void } {
  const projectId = useAppStore((s) => s.projectId);
  const parentId = useAppStore((s) => s.currentParentId);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const [view, setView] = useState<LevelView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const counter = useRef(0);

  useEffect(() => {
    if (!projectId) {
      setView(null);
      setLoading(false);
      setError(null);
      return;
    }
    const request = ++counter.current;
    setLoading(true);
    setError(null);
    getLevelView(projectId, parentId)
      .then((v) => {
        if (request !== counter.current) return;
        setView(v);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (request !== counter.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [projectId, parentId, graphVersion, reloads]);

  const reload = useCallback(() => setReloads((n) => n + 1), []);
  return { view: projectId ? view : null, loading, error, reload };
}
