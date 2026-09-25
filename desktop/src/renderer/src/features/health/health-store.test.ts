// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { startHealthWatcher, useHealthStore } from './health-store';

const errorState = {
  state: 'error',
  calls: 4,
  errors: 2,
  error_rate: 0.5,
  p95_ms: 3,
  stalled: false,
  reason: '50% errors',
};

let fake: FakeBridge;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  fake = installFakeBridge();
  fake.rpcHandlers.set('health.get', () => ({ states: { 'function:a.py#f': errorState } }));
  fake.rpcHandlers.set('health.config', (p) => ({
    thresholds: {
      window_ms: 60000,
      error_rate: 0.05,
      warn_p95_ms: 500,
      stall_ms: 5000,
      loop_calls: 1000,
      ...(p as { thresholds?: object }).thresholds,
    },
  }));
  useAppStore.setState({ projectId: 'p1', overlays: {} });
  useHealthStore.setState({ enabled: true, states: {}, thresholds: null });
});
afterEach(() => vi.useRealTimers());

const changed = (project_id = 'p1') =>
  fake.emitNotification('health.changed', { project_id, changes: [] });
const gets = () => fake.rpcCalls.filter((c) => c.method === 'health.get').length;

describe('health store', () => {
  it('loads at start and refreshes at most once per second on changes', async () => {
    const stop = startHealthWatcher();
    await vi.advanceTimersByTimeAsync(10);
    expect(gets()).toBe(1);
    expect(fake.rpcCalls[0]).toEqual({ method: 'health.get', params: { project_id: 'p1' } });
    expect(useAppStore.getState().overlays.health.nodes['function:a.py#f']).toEqual({
      color: '#ef4444',
      badge: '2 err',
    });
    for (let i = 0; i < 5; i++) changed();
    changed('other');
    await vi.advanceTimersByTimeAsync(900);
    expect(gets()).toBe(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(gets()).toBe(2);
    stop();
  });

  it('clears on project change and hides colors when disabled', async () => {
    const stop = startHealthWatcher();
    await vi.advanceTimersByTimeAsync(10);
    useHealthStore.getState().setEnabled(false);
    expect(useAppStore.getState().overlays.health).toBeUndefined();
    useHealthStore.getState().setEnabled(true);
    expect(useAppStore.getState().overlays.health).toBeDefined();
    useAppStore.setState({ projectId: null });
    expect(useHealthStore.getState().states).toEqual({});
    expect(useAppStore.getState().overlays.health).toBeUndefined();
    stop();
  });

  it('loads and saves thresholds', async () => {
    await useHealthStore.getState().loadThresholds();
    expect(useHealthStore.getState().thresholds?.stall_ms).toBe(5000);
    await useHealthStore.getState().saveThresholds({ stall_ms: 2000 });
    expect(useHealthStore.getState().thresholds?.stall_ms).toBe(2000);
    expect(fake.rpcCalls.at(-1)).toEqual({
      method: 'health.config',
      params: { project_id: 'p1', thresholds: { stall_ms: 2000 } },
    });
  });
});
