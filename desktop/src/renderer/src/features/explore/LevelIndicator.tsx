import { useEffect, useState } from 'react';
import { getNode } from '../../api/engine';
import type { GraphNode } from '../../api/types';
import { useAppStore } from '../../core/store';
import { levelName } from './explore-store';

export function LevelIndicator() {
  const screen = useAppStore((s) => s.screen);
  const projectId = useAppStore((s) => s.projectId);
  const parentId = useAppStore((s) => s.currentParentId);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const [parent, setParent] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    getNode(projectId, parentId)
      .then((n) => !cancelled && setParent(n))
      .catch(() => !cancelled && setParent(null));
    return () => {
      cancelled = true;
    };
  }, [projectId, parentId, graphVersion]);

  if (screen === 'welcome' || !projectId || !parent) return null;
  const level = parent.level + 1;
  return (
    <span title="Zoom level = abstraction level">
      Level {level} · {levelName(level)} of {parent.name}
    </span>
  );
}
