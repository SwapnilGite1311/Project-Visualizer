import { useEffect, useRef, useState } from 'react';
import { getNode } from '../../api/engine';
import type { GraphNode } from '../../api/types';
import { useAppStore } from '../../core/store';

export function useSelectedNode(): { node: GraphNode | null; loading: boolean; error: string | null } {
  const projectId = useAppStore((s) => s.projectId);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const [node, setNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    const request = ++counter.current;
    if (!projectId || !selectedNodeId) {
      setNode(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getNode(projectId, selectedNodeId)
      .then((n) => {
        if (request !== counter.current) return;
        setNode(n);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (request !== counter.current) return;
        setNode(null);
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [projectId, selectedNodeId, graphVersion]);

  return { node: selectedNodeId ? node : null, loading, error };
}
