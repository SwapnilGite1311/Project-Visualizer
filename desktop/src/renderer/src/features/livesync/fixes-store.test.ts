// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useToasts } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { useErrorsStore } from '../errors/errors-store';
import {
  buildFixesOverlay,
  type FixItem,
  startFixesWatcher,
  useFixesStore,
  VERIFIED_SHOWN_MS,
} from './fixes-store';

const item = (
  error_id: string,
  state: FixItem['state'],
  node_id = 'function:app/utils.py#is_valid',
  ok_calls = 0,
): FixItem => ({
  error_id,
  node_id,
  file_path: 'app/utils.py',
  state,
  changed_at_ms: 1,
  ok_calls,
});

let fake: FakeBridge;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  fake = installFakeBridge();
  fake.rpcHandlers.set('fixes.list', () => ({ items: [item('e1', 'fix_pending')] }));
  fake.rpcHandlers.set('errors.list', () => ({ errors: [] }));
  useAppStore.setState({ projectId: 'p1', overlays: {} });
  useFixesStore.setState({ items: [], verifiedAt: {} });
  useErrorsStore.setState({ errors: [], selected: null });
  useToasts.setState({ items: [] });
});
afterEach(() => vi.useRealTimers());

describe('fixes overlay', () => {
  it('colors pending, fixed (for 10 s) and regressed elements', () => {
    const items = [
      item('e1', 'fix_pending', 'a'),
      item('e2', 'verified', 'b'),
      item('e3', 'regressed', 'c'),
      item('e4', 'open', 'd'),
    ];
    expect(buildFixesOverlay(items, { e2: 1000 }, 5000)).toEqual({
      priority: 61,
      edges: {},
      nodes: {
        a: { badge: 'fix?', color: '#38bdf8' },
        b: { badge: 'fixed', color: '#22c55e' },
        c: { badge: 'regressed', color: '#ef4444' },
      },
    });
    expect(
      buildFixesOverlay(items, { e2: 1000 }, 1000 + VERIFIED_SHOWN_MS + 1).nodes.b,
    ).toBeUndefined();
  });
});

describe('fixes watcher', () => {
  it('loads, follows changes, confirms fixes and refreshes the errors list', async () => {
    const stop = startFixesWatcher();
    await vi.advanceTimersByTimeAsync(10);
    expect(useFixesStore.getState().items.map((i) => i.state)).toEqual(['fix_pending']);
    expect(
      useAppStore.getState().overlays.fixes.nodes['function:app/utils.py#is_valid'].badge,
    ).toBe('fix?');

    fake.emitNotification('fixes.changed', {
      project_id: 'other',
      items: [item('e1', 'verified')],
    });
    expect(useFixesStore.getState().items[0].state).toBe('fix_pending');

    fake.emitNotification('fixes.changed', {
      project_id: 'p1',
      items: [item('e1', 'verified', undefined, 3)],
    });
    expect(useFixesStore.getState().items[0]).toMatchObject({ state: 'verified', ok_calls: 3 });
    expect(
      useAppStore.getState().overlays.fixes.nodes['function:app/utils.py#is_valid'].badge,
    ).toBe('fixed');
    expect(useToasts.getState().items.map((t) => [t.title, t.detail])).toEqual([
      ['Fix confirmed', 'is_valid'],
    ]);
    await vi.advanceTimersByTimeAsync(10);
    expect(fake.rpcCalls.some((c) => c.method === 'errors.list')).toBe(true);

    fake.emitNotification('fixes.changed', {
      project_id: 'p1',
      items: [item('e1', 'verified', undefined, 3)],
    });
    expect(useToasts.getState().items).toHaveLength(1); // already confirmed

    await vi.advanceTimersByTimeAsync(VERIFIED_SHOWN_MS + 100);
    expect(useAppStore.getState().overlays.fixes).toBeUndefined();

    useAppStore.setState({ projectId: null });
    expect(useFixesStore.getState().items).toEqual([]);
    stop();
  });

  it('marks regressions', async () => {
    const stop = startFixesWatcher();
    await vi.advanceTimersByTimeAsync(10);
    fake.emitNotification('fixes.changed', { project_id: 'p1', items: [item('e1', 'regressed')] });
    expect(useAppStore.getState().overlays.fixes.nodes['function:app/utils.py#is_valid']).toEqual({
      badge: 'regressed',
      color: '#ef4444',
    });
    stop();
  });
});
