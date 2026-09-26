// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRegistry, type NodeRef } from '../../core/registry';
import { ChangePanel } from './ChangePanel';
import { useChangeStore } from './change-store';
import register from './register';

const ref = (id: string, kind: string, name: string) => ({ id, kind, name, qualified_name: name, file_path: '', span: { start_line: 0, start_col: 0, end_line: 0, end_col: 0 } }) as NodeRef;

afterEach(cleanup);

describe('change preview feature', () => {
  it('registers the node action, the panel, the command and the dialog host', () => {
    const r = createRegistry();
    register(r);
    const forFunction = r.nodeActions(ref('function:a.py#f', 'function', 'f'));
    expect(forFunction.find((a) => a.id === 'change-preview')?.title).toBe('Preview a change…');
    expect(r.nodeActions(ref('project:', 'project', 'p'))).toEqual([]);
    expect(r.panels('bottom').map((p) => p.id)).toEqual(['change-preview']);
    expect(r.commands().map((c) => c.id)).toEqual(['change.clear']);
    expect(r.globals().map((g) => g.id)).toEqual(['change-dialog']);
  });

  it('shows the risk breakdown and the affected elements', () => {
    act(() =>
      useChangeStore.setState({
        node: ref('f', 'function', 'is_valid'),
        preview: {
          change: { kind: 'delete', node_id: 'f' },
          affected: [{ node_id: 'method:a.py#C.m', distance: 1, via: 'calls', from_id: 'f', ancestor_ids: [] }],
          risk: { score: 78, level: 'high', factors: ['called from 3 places'] },
          breakdown: { static_score: 60, type_multiplier: 1.3, runtime_bonus: 0 },
        },
      }),
    );
    render(<ChangePanel />);
    expect(screen.getByLabelText('Risk breakdown').textContent).toBe('Static 60 × 1.3 (change type) + 0 (runtime) = 78');
    expect(screen.getByRole('list', { name: 'Affected' }).textContent).toContain('C.m');
    expect(screen.getByText('called from 3 places')).toBeTruthy();
  });
});
