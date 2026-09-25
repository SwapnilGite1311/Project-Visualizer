import { useEffect, useState } from 'react';
import { getNode } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { IconButton } from '../../ui/IconButton';
import { revealNode } from '../../view/reveal';
import { useComponentStates } from './states-store';

interface Row {
  id: string;
  name: string;
  kind: string | null;
}

export function PinnedPanel() {
  const pinned = useComponentStates((s) => s.pinned);
  const projectId = useAppStore((s) => s.projectId);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void Promise.all(
      pinned.map((id) =>
        getNode(projectId, id).then(
          (n): Row => ({ id, name: n.name, kind: n.kind }),
          (): Row => ({ id, name: '(not found)', kind: null }),
        ),
      ),
    ).then((r) => !cancelled && setRows(r));
    return () => {
      cancelled = true;
    };
  }, [pinned, projectId]);

  if (pinned.length === 0) return <EmptyState title="Right-click an element and choose Pin" />;
  return (
    <ul aria-label="Pinned" style={{ listStyle: 'none', margin: 0, padding: 8 }}>
      {rows.map((r) => (
        <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
          <button
            type="button"
            onClick={() => void revealNode(r.id)}
            disabled={!r.kind}
            style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
          >
            {r.name}
          </button>
          {r.kind && <Badge>{r.kind}</Badge>}
          <IconButton label={`Unpin ${r.name}`} onClick={() => useComponentStates.getState().togglePin(r.id)}>
            ×
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
