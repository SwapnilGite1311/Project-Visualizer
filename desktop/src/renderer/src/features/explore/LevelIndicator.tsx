import { useEffect, useState } from 'react';
import { getNode } from '../../api/engine';
import type { GraphNode } from '../../api/types';
import { useAppStore } from '../../core/store';
import { usePlainWords } from '../plain/plain-store';
import { levelName } from './explore-store';

// Simple words: what the elements on this level are, e.g. "Files in shop".
const PLAIN_LEVEL: Record<number, string> = { 1: 'Folders', 2: 'Files', 3: 'Classes and functions', 4: 'Functions', 5: 'Lines' };

export function LevelIndicator() {
  const screen = useAppStore((s) => s.screen);
  const projectId = useAppStore((s) => s.projectId);
  const parentId = useAppStore((s) => s.currentParentId);
  const graphVersion = useAppStore((s) => s.graphVersion);
  const [parent, setParent] = useState<GraphNode | null>(null);
  const simple = usePlainWords();

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
  if (simple) {
    return (
      <span title={`Level ${level}: zoom in to see what is inside an element, zoom out to go back`}>
        {PLAIN_LEVEL[level] ?? 'Parts'} in {parent.name}
      </span>
    );
  }
  return (
    <span title="Zoom level = abstraction level">
      Level {level} · {levelName(level)} of {parent.name}
    </span>
  );
}
