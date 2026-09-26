import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { getEdges } from '../../api/engine';
import type { GraphEdge } from '../../api/types';
import type { NodeActionDef, NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { shortLabel } from '../depnav/labels';
import { isSandboxRoot, useSimStore } from './sim-store';

type DialogKind = 'slow' | 'fail' | 'cut';

// Which small "what if" dialog is open, for which node.
export const useSimDialog = create<{ kind: DialogKind | null; node: NodeRef | null; open(kind: DialogKind, node: NodeRef): void; close(): void }>()(
  (set) => ({
    kind: null,
    node: null,
    open: (kind, node) => set({ kind, node }),
    close: () => set({ kind: null, node: null }),
  }),
);

const inSandbox = () => isSandboxRoot(useAppStore.getState().projectRoot);
const real = (n: NodeRef) => n.kind !== 'project' && n.kind !== 'external';

export function simulationActions(): NodeActionDef[] {
  return [
    {
      id: 'sim-start',
      title: 'What if…? (open a sandbox)',
      order: 22,
      when: () => !inSandbox(),
      run: () => useSimStore.getState().start(),
    },
    {
      id: 'sim-remove',
      title: 'Simulate removing this',
      order: 23,
      when: (n) => inSandbox() && real(n),
      run: (n) => useSimStore.getState().apply({ kind: 'delete_node', node_id: n.id }),
    },
    { id: 'sim-slow', title: 'Simulate slower…', order: 24, when: (n) => inSandbox() && real(n), run: (n) => useSimDialog.getState().open('slow', n) },
    { id: 'sim-fail', title: 'Simulate failures…', order: 25, when: (n) => inSandbox() && real(n), run: (n) => useSimDialog.getState().open('fail', n) },
    {
      id: 'sim-cut',
      title: 'Simulate removing a dependency…',
      order: 26,
      when: (n) => inSandbox() && real(n),
      run: (n) => useSimDialog.getState().open('cut', n),
    },
  ];
}

function Choices({ options, onPick }: { options: Array<{ label: string; run: () => void }>; onPick(): void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((o) => (
        <Button
          key={o.label}
          onClick={() => {
            o.run();
            onPick();
          }}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

// The dialogs for "slower", "failures" and "remove a dependency".
export function SimDialogs() {
  const { kind, node, close } = useSimDialog();
  const [edges, setEdges] = useState<GraphEdge[] | null>(null);

  useEffect(() => {
    setEdges(null);
    const pid = useAppStore.getState().projectId;
    if (kind !== 'cut' || !node || !pid) return;
    let live = true;
    getEdges(pid, node.id, 'out')
      .then((e) => live && setEdges(e))
      .catch(() => live && setEdges([]));
    return () => {
      live = false;
    };
  }, [kind, node]);

  if (!kind || !node) return null;
  const apply = useSimStore.getState().apply;
  const title =
    kind === 'slow' ? `How much slower should ${node.name} be?` : kind === 'fail' ? `How often should ${node.name} fail?` : `Remove a dependency of ${node.name}`;
  return (
    <Modal open title={title} onClose={close}>
      {kind === 'slow' && (
        <Choices
          onPick={close}
          options={[2, 5, 10].map((f) => ({ label: `×${f}`, run: () => void apply({ kind: 'set_latency', node_id: node.id, factor: f }) }))}
        />
      )}
      {kind === 'fail' && (
        <Choices
          onPick={close}
          options={[0.1, 0.5, 1].map((r) => ({ label: `${r * 100}%`, run: () => void apply({ kind: 'set_error_rate', node_id: node.id, rate: r }) }))}
        />
      )}
      {kind === 'cut' &&
        (edges === null ? (
          <p>Loading…</p>
        ) : edges.length === 0 ? (
          <p>{node.name} does not use anything else.</p>
        ) : (
          <ul aria-label="Dependencies" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
            {edges.map((e) => (
              <li key={e.id}>
                <Button
                  size="sm"
                  onClick={() => {
                    void apply({ kind: 'remove_edge', source_id: node.id, target_id: e.target_id });
                    close();
                  }}
                >
                  {e.kind} → {shortLabel(e.target_id)}
                </Button>
              </li>
            ))}
          </ul>
        ))}
    </Modal>
  );
}
