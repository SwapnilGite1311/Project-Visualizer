// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import type { NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useChangeStore } from './change-store';

const PREVIEW = {
  change: { kind: 'rename', node_id: 'function:app/utils.py#is_valid', new_name: 'is_ok' },
  affected: [
    {
      node_id: 'method:app/services.py#UserService.get_user',
      distance: 1,
      via: 'calls',
      from_id: 'function:app/utils.py#is_valid',
      ancestor_ids: ['project:', 'package:app', 'module:app/services.py', 'method:app/services.py#UserService.get_user'],
    },
  ],
  risk: { score: 40, level: 'medium', factors: ['1 caller'] },
  breakdown: { static_score: 40, type_multiplier: 1, runtime_bonus: 0 },
};
const node: NodeRef = { id: 'function:app/utils.py#is_valid', kind: 'function', name: 'is_valid', file_path: 'app/utils.py' } as NodeRef;

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  useAppStore.setState(useAppStore.getInitialState());
  useChangeStore.setState(useChangeStore.getInitialState());
  useAppStore.getState().openedProject('p1', 'C:/x');
  fake.rpcHandlers.set('change.preview', () => PREVIEW);
  fake.rpcHandlers.set('graph.ancestors', () => ({ nodes: [{ id: 'project:' }, { id: 'package:app' }, { id: node.id }] }));
});

describe('change preview store', () => {
  it('runs a preview, draws the overlay and opens the panel', async () => {
    await useChangeStore.getState().run(node, 'rename', { new_name: 'is_ok' });
    expect(fake.rpcCalls.find((c) => c.method === 'change.preview')?.params).toEqual({
      project_id: 'p1',
      change: { kind: 'rename', node_id: node.id, new_name: 'is_ok' },
    });
    expect(useChangeStore.getState().preview?.risk.score).toBe(40);
    const overlay = useAppStore.getState().overlays.change;
    expect(overlay.priority).toBe(52);
    expect(overlay.nodes['method:app/services.py#UserService.get_user'].badge).toBe('d1');
    expect(overlay.nodes[node.id].badge).toBe('changed');
    expect(useAppStore.getState().activePanel.bottom).toBe('change-preview');
  });

  it('summarizes through AI v2, and explains when it is not installed', async () => {
    await useChangeStore.getState().run(node, 'delete');
    await useChangeStore.getState().summarize();
    expect(useChangeStore.getState().summaryError).toMatch(/AI v2/);
    fake.invokeHandlers.set('pv:ai2.changeSummary', () => ({ markdown: 'Two callers break.' }));
    await useChangeStore.getState().summarize();
    expect(useChangeStore.getState().summary).toBe('Two callers break.');
  });

  it('clears everything', async () => {
    await useChangeStore.getState().run(node, 'delete');
    useChangeStore.getState().clear();
    expect(useAppStore.getState().overlays.change).toBeUndefined();
    expect(useChangeStore.getState().preview).toBeNull();
  });
});
