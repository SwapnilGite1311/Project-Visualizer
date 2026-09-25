import { useEffect, useState } from 'react';
import { search } from '../../api/engine';
import type { SearchHit } from '../../api/types';
import { useAppStore } from '../../core/store';
import { Modal } from '../../ui/Modal';
import { TextInput } from '../../ui/TextInput';
import { revealNode } from '../../view/reveal';
import { useDepnavStore } from './depnav-store';
import { shortLabel } from './labels';

export function PathDialog({ onClose }: { onClose(): void }) {
  const root = useDepnavStore((s) => s.root);
  const path = useDepnavStore((s) => s.path);
  const projectId = useAppStore((s) => s.projectId);
  const [text, setText] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !text.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      search(projectId, text.trim(), undefined, 10).then(
        (r) => !cancelled && setHits(r),
        () => !cancelled && setHits([]),
      );
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, projectId]);

  const choose = (hit: SearchHit) => {
    setTarget(hit.name);
    setHits([]);
    void useDepnavStore.getState().findPathTo(hit.node_id);
  };

  return (
    <Modal open title={`Find a path from ${root?.name ?? '…'}`} onClose={onClose}>
      <TextInput label="To" value={text} placeholder="Search for the element to reach" onChange={setText} />
      {hits.length > 0 && (
        <ul aria-label="Candidates" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 200, overflowY: 'auto' }}>
          {hits.map((h) => (
            <li key={h.node_id}>
              <button type="button" onClick={() => choose(h)} style={{ background: 'none', border: 'none', padding: '3px 0', cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}>
                {h.name} <span style={{ color: 'var(--text-muted)' }}>{h.file_path}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {target && path && !path.found && <p>No path found within 8 steps.</p>}
      {target && path?.found && (
        <ol aria-label="Path" style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          {path.node_ids.map((id) => (
            <li key={id}>
              <button type="button" onClick={() => void revealNode(id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent)', font: 'inherit' }}>
                {shortLabel(id)}
              </button>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
