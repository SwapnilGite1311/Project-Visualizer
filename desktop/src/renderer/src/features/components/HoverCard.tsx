import { useEffect, useState } from 'react';
import { getNode } from '../../api/engine';
import type { GraphNode } from '../../api/types';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { usePointer } from './pointer';

export const HOVER_DELAY_MS = 400;

const cache = new Map<string, Promise<GraphNode>>();

function cachedNode(pid: string, id: string): Promise<GraphNode> {
  const key = pid + '|' + id;
  if (!cache.has(key)) cache.set(key, getNode(pid, id));
  return cache.get(key)!;
}

// Quick facts about the element under the mouse, without clicking.
export function HoverCard() {
  const hovered = useAppStore((s) => s.hoveredNodeId);
  const projectId = useAppStore((s) => s.projectId);
  const { x, y } = usePointer();
  const [node, setNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    setNode(null);
    if (!hovered || !projectId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      cachedNode(projectId, hovered).then(
        (n) => !cancelled && setNode(n),
        () => undefined,
      );
    }, HOVER_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hovered, projectId]);

  if (!node || !hovered) return null;
  const lines = node.span.end_line > 0 ? `${node.file_path}:${node.span.start_line}–${node.span.end_line}` : node.file_path;
  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: x + 16,
        top: y + 16,
        zIndex: 50,
        pointerEvents: 'none',
        background: 'var(--bg-elevated, var(--bg))',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '6px 8px',
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        maxWidth: 320,
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <strong>{node.name}</strong>
        <Badge>{node.kind}</Badge>
      </div>
      {lines && <div style={{ color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{lines}</div>}
      <div style={{ color: 'var(--text-muted)' }}>
        Lines {node.metrics.loc} · Complexity {node.metrics.complexity} · Used by {node.metrics.fan_in} · Uses {node.metrics.fan_out}
      </div>
    </div>
  );
}
