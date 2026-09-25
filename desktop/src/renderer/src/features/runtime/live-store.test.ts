// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { displayedView, MAX_HISTORY, startLiveWatcher, useLiveStore } from './live-store';
import { liveView } from './test-data';

let fake: FakeBridge;
let calls = 0;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  fake = installFakeBridge();
  calls = 0;
  fake.rpcHandlers.set('rtsync.level_view', () => liveView({ 'module:a.py': ++calls }));
  useAppStore.setState({ projectId: 'p1', currentParentId: 'project:' });
  useLiveStore.setState({
    enabled: false,
    paused: false,
    current: null,
    history: [],
    playbackIndex: null,
    lastUpdateAt: null,
  });
});
afterEach(() => vi.useRealTimers());

const update = () => fake.emitNotification('runtime.update', { project_id: 'p1' });

describe('live store', () => {
  it('refreshes on updates only while enabled, at most every 500 ms', async () => {
    const stop = startLiveWatcher();
    update();
    await vi.advanceTimersByTimeAsync(600);
    expect(fake.rpcCalls).toHaveLength(0);

    useLiveStore.getState().setEnabled(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(fake.rpcCalls).toEqual([
      {
        method: 'rtsync.level_view',
        params: { project_id: 'p1', parent_id: 'project:', window_ms: 5000 },
      },
    ]);
    for (let i = 0; i < 10; i++) update(); // a burst becomes one refresh, 500 ms after the previous one
    await vi.advanceTimersByTimeAsync(480);
    expect(fake.rpcCalls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(20);
    expect(fake.rpcCalls).toHaveLength(2);
    expect(useLiveStore.getState().current?.live['module:a.py'].calls).toBe(2);
    expect(useLiveStore.getState().history).toHaveLength(2);
    fake.emitNotification('runtime.update', { project_id: 'other' });
    await vi.advanceTimersByTimeAsync(600);
    expect(fake.rpcCalls).toHaveLength(2);
    stop();
  });

  it('refreshes when the level changes and forgets the old level', async () => {
    const stop = startLiveWatcher();
    useLiveStore.getState().setEnabled(true);
    await vi.advanceTimersByTimeAsync(10);
    useAppStore.getState().setParent('package:app');
    expect(useLiveStore.getState().history).toEqual([]);
    await vi.advanceTimersByTimeAsync(600);
    expect(fake.rpcCalls.at(-1)?.params).toMatchObject({ parent_id: 'package:app' });
    expect(useLiveStore.getState().history).toHaveLength(1);
    stop();
  });

  it('keeps refreshing slowly while quiet, and stops while paused', async () => {
    const stop = startLiveWatcher();
    useLiveStore.getState().setEnabled(true);
    await vi.advanceTimersByTimeAsync(3100);
    const n = fake.rpcCalls.length;
    expect(n).toBeGreaterThanOrEqual(3);
    useLiveStore.getState().pause();
    update();
    await vi.advanceTimersByTimeAsync(3000);
    expect(fake.rpcCalls).toHaveLength(n);
    stop();
  });

  it('pauses, seeks and resumes playback', () => {
    const s = useLiveStore.getState();
    s.setEnabled(true);
    s.record(liveView({ a: 1 }), 1);
    s.record(liveView({ a: 2 }), 2);
    s.record(liveView({ a: 3 }), 3);
    s.seek(0); // ignored while live
    expect(useLiveStore.getState().playbackIndex).toBeNull();
    s.pause();
    expect(useLiveStore.getState().playbackIndex).toBe(2);
    s.seek(0);
    expect(displayedView(useLiveStore.getState())?.live.a.calls).toBe(1);
    s.seek(99);
    expect(useLiveStore.getState().playbackIndex).toBe(2);
    s.resume();
    expect(useLiveStore.getState()).toMatchObject({ paused: false, playbackIndex: null });
    expect(displayedView(useLiveStore.getState())?.live.a.calls).toBe(3);
    s.setEnabled(false);
    expect(useLiveStore.getState()).toMatchObject({ current: null, history: [] });
  });

  it('keeps at most 600 snapshots', () => {
    const s = useLiveStore.getState();
    for (let i = 0; i < MAX_HISTORY + 5; i++) s.record(liveView({ a: i }), i);
    const { history } = useLiveStore.getState();
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].at).toBe(5);
  });
});
