import { Fragment, useEffect, useState } from 'react';
import { getAncestors } from '../../api/engine';
import type { GraphNode } from '../../api/types';
import { useAppStore } from '../../core/store';

function folderName(path: string | null): string {
  if (!path) return 'Project';
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

const linkStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--accent)',
  cursor: 'pointer',
  padding: '2px 4px',
  whiteSpace: 'nowrap' as const,
};

export function Breadcrumb() {
  const projectId = useAppStore((s) => s.projectId);
  const projectRoot = useAppStore((s) => s.projectRoot);
  const currentParentId = useAppStore((s) => s.currentParentId);
  const setParent = useAppStore((s) => s.setParent);
  const [items, setItems] = useState<GraphNode[]>([]);

  useEffect(() => {
    if (!projectId) {
      setItems([]);
      return;
    }
    let active = true;
    getAncestors(projectId, currentParentId)
      .then((nodes) => active && setItems(nodes))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, [projectId, currentParentId]);

  if (items.length === 0) return null;
  const label = (n: GraphNode) => (n.kind === 'project' ? folderName(projectRoot) : n.name);
  const shown: (GraphNode | null)[] = items.length > 5 ? [items[0], null, ...items.slice(-3)] : items;

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, overflow: 'hidden' }}>
      {shown.map((n, i) => (
        <Fragment key={n ? n.id : 'ellipsis'}>
          {i > 0 && <span style={{ color: 'var(--fg-muted)' }}>›</span>}
          {n === null ? (
            <span style={{ color: 'var(--fg-muted)', padding: '0 4px' }}>…</span>
          ) : i === shown.length - 1 ? (
            <span aria-current="page" style={{ padding: '2px 4px', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {label(n)}
            </span>
          ) : (
            <button style={linkStyle} onClick={() => setParent(n.id)}>
              {label(n)}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
