// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useToasts } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { startLiveSync, useLiveSync } from './livesync-store';

let fake: FakeBridge;
let settings: Record<string, unknown>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  fake = installFakeBridge();
  settings = {};
  fake.invokeHandlers.set('pv:settings.get', (p) => {
    const { key, fallback } = p as { key: string; fallback: unknown };
    return key in settings ? settings[key] : fallback;
  });
  fake.invokeHandlers.set('pv:settings.set', (p) => {
    const { key, value } = p as { key: string; value: unknown };
    settings[key] = value;
    return true;
  });
  fake.rpcHandlers.set('watch.start', (p) => ({
    watching: true,
    interval_ms: (p as { interval_ms: number }).interval_ms,
    seeded: false,
    last_change_ms: 0,
  }));
  fake.rpcHandlers.set('watch.stop', () => ({
    watching: false,
    interval_ms: 1000,
    seeded: true,
    last_change_ms: 0,
  }));
  useAppStore.setState({ projectId: null, overlays: {}, graphVersion: 0 });
  useLiveSync.setState({ enabled: true, watching: false, lastChangeAt: null });
  useToasts.setState({ items: [] });
});
afterEach(() => vi.useRealTimers());

const calls = (method: string) => fake.rpcCalls.filter((c) => c.method === method);
const changed = (project_id: string, extra: Record<string, string[]> = {}) =>
  fake.emitNotification('graph.changed', {
    project_id,
    files_changed: ['app/utils.py'],
    nodes_added: [],
    nodes_removed: [],
    nodes_updated: [],
    ...extra,
  });

describe('live sync', () => {
  it('watches opened projects (not snapshots) and stops on close', async () => {
    settings['project.liveSyncIntervalMs'] = 2000;
    const stop = startLiveSync();
    useAppStore.setState({ projectId: 'p1' });
    await vi.advanceTimersByTimeAsync(10);
    expect(calls('watch.start')).toEqual([
      { method: 'watch.start', params: { project_id: 'p1', interval_ms: 2000 } },
    ]);
    expect(useLiveSync.getState().watching).toBe(true);

    useAppStore.setState({ projectId: 'snapshot:abc' });
    await vi.advanceTimersByTimeAsync(10);
    expect(calls('watch.stop')).toEqual([{ method: 'watch.stop', params: { project_id: 'p1' } }]);
    expect(calls('watch.start')).toHaveLength(1);
    stop();
  });

  it('respects the setting and can be switched', async () => {
    settings['project.liveSync'] = false;
    const stop = startLiveSync();
    useAppStore.setState({ projectId: 'p1' });
    await vi.advanceTimersByTimeAsync(10);
    expect(calls('watch.start')).toHaveLength(0);
    expect(useLiveSync.getState().enabled).toBe(false);

    await useLiveSync.getState().setLiveSync(true);
    expect(settings['project.liveSync']).toBe(true);
    expect(calls('watch.start')).toHaveLength(1);
    await useLiveSync.getState().setLiveSync(false);
    expect(calls('watch.stop')).toHaveLength(1);
    expect(useLiveSync.getState().watching).toBe(false);
    stop();
  });

  it('reloads the map, marks updated elements for 5 s and tells the user (at most every 5 s)', async () => {
    const stop = startLiveSync();
    useAppStore.setState({ projectId: 'p1' });
    await vi.advanceTimersByTimeAsync(10);
    changed('other');
    expect(useAppStore.getState().graphVersion).toBe(0);

    changed('p1', {
      nodes_added: ['function:app/utils.py#is_ok'],
      nodes_updated: ['module:app/utils.py'],
    });
    expect(useAppStore.getState().graphVersion).toBe(1);
    expect(useAppStore.getState().overlays.changed).toEqual({
      priority: 15,
      edges: {},
      nodes: {
        'function:app/utils.py#is_ok': { badge: 'updated' },
        'module:app/utils.py': { badge: 'updated' },
      },
    });
    expect(useToasts.getState().items.map((t) => [t.title, t.detail])).toEqual([
      ['Map updated', '1 file changed'],
    ]);

    await vi.advanceTimersByTimeAsync(2000);
    changed('p1', { files_changed: ['a.py', 'b.py'] });
    expect(useAppStore.getState().graphVersion).toBe(2);
    expect(useToasts.getState().items).toHaveLength(1); // no second toast within 5 s
    await vi.advanceTimersByTimeAsync(4900);
    expect(useAppStore.getState().overlays.changed).toBeDefined(); // the timer restarted with the second change
    await vi.advanceTimersByTimeAsync(200);
    expect(useAppStore.getState().overlays.changed).toBeUndefined();
    stop();
  });
});
