// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { revealNode } from '../../view/reveal';
import { buildErrorOverlay } from './errors-overlay';
import { startErrorsWatcher, useErrorsStore } from './errors-store';
import { entry, frame, PASTED_TEXT } from './test-data';

vi.mock('../../view/reveal', () => ({ revealNode: vi.fn(async () => undefined) }));

const ancestors: Record<string, string[]> = {
  'function:app/db.py#load': [
    'project:',
    'package:app',
    'module:app/db.py',
    'function:app/db.py#load',
  ],
  'function:app/api.py#handle': [
    'project:',
    'package:app',
    'module:app/api.py',
    'function:app/api.py#handle',
  ],
};

let fake: FakeBridge;
let stored = [entry('e1')];
beforeEach(() => {
  vi.clearAllMocks();
  stored = [entry('e1')];
  fake = installFakeBridge();
  fake.rpcHandlers.set('errors.list', () => ({ errors: stored }));
  fake.rpcHandlers.set('errors.map_stack', () => {
    stored = [...stored, entry('p1', { source: 'pasted', count: 1 })];
    return {
      error_id: 'p1',
      language: 'python',
      error_type: 'KeyError',
      message: "'id'",
      frames: [],
    };
  });
  fake.rpcHandlers.set('errors.clear', (p) => {
    const id = (p as { error_id?: string }).error_id;
    stored = id ? stored.filter((e) => e.error_id !== id) : [];
    return { ok: true };
  });
  fake.rpcHandlers.set('graph.ancestors', (p) => ({
    nodes: (ancestors[(p as { node_id: string }).node_id] ?? []).map((id) => gnode(id, 'module')),
  }));
  useAppStore.setState({ projectId: 'p1', overlays: {} });
  useErrorsStore.setState({ errors: [], selected: null, dialogOpen: false });
});
afterEach(() => vi.useRealTimers());

describe('buildErrorOverlay', () => {
  it('marks the origin in red and numbers the other project frames', () => {
    const o = buildErrorOverlay(entry('e1').frames, ancestors);
    expect(o.priority).toBe(60);
    expect(o.nodes).toEqual({
      'package:app': { color: '#ef4444' },
      'module:app/db.py': { color: '#ef4444' },
      'function:app/db.py#load': { color: '#ef4444', badge: 'error here' },
      'function:app/api.py#handle': { color: '#fb923c', badge: '1' },
    });
    const two = buildErrorOverlay(
      [frame('function:a.py#x'), frame('function:a.py#y'), frame('function:a.py#x')],
      {},
    );
    expect(two.nodes).toEqual({
      'function:a.py#x': { color: '#fb923c', badge: '1,3' },
      'function:a.py#y': { color: '#fb923c', badge: '2' },
    });
  });
});

describe('errors store', () => {
  it('refreshes, selects (highlight + reveal) and clears', async () => {
    const s = useErrorsStore.getState();
    await s.refresh();
    expect(useErrorsStore.getState().errors.map((e) => e.error_id)).toEqual(['e1']);
    await s.select(useErrorsStore.getState().errors[0]);
    expect(useAppStore.getState().overlays.error.nodes['function:app/db.py#load'].badge).toBe(
      'error here',
    );
    expect(revealNode).toHaveBeenCalledWith('function:app/db.py#load');
    await s.clear('e1');
    expect(useErrorsStore.getState()).toMatchObject({ errors: [], selected: null });
    expect(useAppStore.getState().overlays.error).toBeUndefined();
  });

  it('pastes a stack trace and selects the new entry', async () => {
    const found = await useErrorsStore.getState().paste(PASTED_TEXT);
    expect(fake.rpcCalls[0]).toEqual({
      method: 'errors.map_stack',
      params: { project_id: 'p1', text: PASTED_TEXT },
    });
    expect(found?.error_id).toBe('p1');
    expect(useErrorsStore.getState().selected?.source).toBe('pasted');
    expect(await useErrorsStore.getState().paste('   ')).toBeNull();
  });

  it('refreshes at most every 2 s when runtime updates carry errors', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const stop = startErrorsWatcher();
    await vi.advanceTimersByTimeAsync(10);
    const lists = () => fake.rpcCalls.filter((c) => c.method === 'errors.list').length;
    expect(lists()).toBe(1);
    fake.emitNotification('runtime.update', { project_id: 'p1', errors: [] });
    await vi.advanceTimersByTimeAsync(2500);
    expect(lists()).toBe(1);
    for (let i = 0; i < 3; i++)
      fake.emitNotification('runtime.update', { project_id: 'p1', errors: [{ node_id: 'x' }] });
    await vi.advanceTimersByTimeAsync(10);
    expect(lists()).toBe(2);
    fake.emitNotification('runtime.update', { project_id: 'p1', errors: [{ node_id: 'x' }] });
    await vi.advanceTimersByTimeAsync(1500);
    expect(lists()).toBe(2);
    await vi.advanceTimersByTimeAsync(600);
    expect(lists()).toBe(3);
    useAppStore.setState({ projectId: null });
    expect(useErrorsStore.getState().errors).toEqual([]);
    stop();
  });
});
