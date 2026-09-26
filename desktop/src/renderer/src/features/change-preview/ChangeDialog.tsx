import { useEffect, useState } from 'react';
import { search } from '../../api/engine';
import type { SearchHit } from '../../api/types';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { type ChangeKind, useChangeStore } from './change-store';

const OPTIONS: Array<{ kind: ChangeKind; title: string }> = [
  { kind: 'modify_body', title: 'Change what it does inside (same name and inputs)' },
  { kind: 'change_signature', title: 'Change its inputs or outputs' },
  { kind: 'rename', title: 'Rename it' },
  { kind: 'move', title: 'Move it somewhere else' },
  { kind: 'delete', title: 'Delete it' },
];

// "Preview a change to <name>": plain-language change types.
export function ChangeDialog() {
  const node = useChangeStore((s) => s.dialogFor);
  const [kind, setKind] = useState<ChangeKind>('modify_body');
  const [newName, setNewName] = useState('');
  const [target, setTarget] = useState<SearchHit | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    setKind('modify_body');
    setNewName('');
    setTarget(null);
    setQuery('');
    setHits([]);
  }, [node]);

  useEffect(() => {
    const pid = useAppStore.getState().projectId;
    if (kind !== 'move' || !pid || query.trim().length < 2) {
      setHits([]);
      return;
    }
    let live = true;
    search(pid, query.trim(), ['package', 'module', 'class'], 8)
      .then((h) => live && setHits(h))
      .catch(() => live && setHits([]));
    return () => {
      live = false;
    };
  }, [kind, query]);

  if (!node) return null;
  const ready = kind === 'rename' ? newName.trim().length > 0 : kind === 'move' ? target !== null : true;
  const preview = () => {
    const extra = kind === 'rename' ? { new_name: newName.trim() } : kind === 'move' && target ? { new_parent_id: target.node_id } : {};
    void useChangeStore.getState().run(node, kind, extra);
  };

  return (
    <Modal
      open
      title={`Preview a change to ${node.name}`}
      onClose={() => useChangeStore.getState().closeDialog()}
      footer={
        <Button variant="primary" disabled={!ready} onClick={preview}>
          Preview
        </Button>
      }
    >
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        <legend style={{ marginBottom: 6 }}>What do you want to change?</legend>
        {OPTIONS.map((o) => (
          <label key={o.kind} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="radio" name="change-kind" checked={kind === o.kind} onChange={() => setKind(o.kind)} />
            {o.title}
          </label>
        ))}
      </fieldset>
      {kind === 'rename' && (
        <label style={{ display: 'grid', gap: 4, marginTop: 10 }}>
          New name
          <input aria-label="New name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
      )}
      {kind === 'move' && (
        <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            Move into
            <input aria-label="Move into" placeholder="Search a package, module or class" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <ul aria-label="Targets" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {hits.map((h) => (
              <li key={h.node_id}>
                <label style={{ display: 'flex', gap: 6 }}>
                  <input type="radio" name="move-target" checked={target?.node_id === h.node_id} onChange={() => setTarget(h)} />
                  {h.name} <span style={{ opacity: 0.6 }}>{h.kind}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
