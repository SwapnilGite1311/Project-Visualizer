// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../core/store';
import { buildLiveOverlay, useLiveOverlaySync } from './live-overlay';
import { useLiveStore } from './live-store';
import { liveView } from './test-data';

beforeEach(() => {
  useAppStore.setState({ overlays: {} });
  useLiveStore.setState({
    enabled: false,
    paused: false,
    current: null,
    history: [],
    playbackIndex: null,
    lastUpdateAt: null,
  });
});

describe('live overlay', () => {
  it('shows call counts and moving edges', () => {
    const view = liveView({ 'module:a.py': 12, 'module:b.py': 0 }, [
      { source_id: 'module:a.py', target_id: 'module:c.py', count: 7, edge_id: 'e1' },
      { source_id: 'module:a.py', target_id: 'module:d.py', count: 1000, edge_id: 'e2' },
      { source_id: 'module:a.py', target_id: 'module:e.py', count: 3, edge_id: '' },
    ]);
    expect(buildLiveOverlay(view)).toEqual({
      priority: 20,
      nodes: { 'module:a.py': { badge: '12', pulse: true } },
      edges: {
        e1: { animated: true, width: 5, color: '#22c55e' },
        e2: { animated: true, width: 8, color: '#22c55e' },
      },
    });
    expect(buildLiveOverlay(view).dimOthers).toBeUndefined();
  });

  it('follows the displayed snapshot and is removed when live is off', () => {
    const { unmount } = renderHook(() => useLiveOverlaySync());
    expect(useAppStore.getState().overlays.live).toBeUndefined();
    const s = useLiveStore.getState();
    s.setEnabled(true);
    s.record(liveView({ 'module:a.py': 1 }), 1);
    s.record(liveView({ 'module:a.py': 2 }), 2);
    expect(useAppStore.getState().overlays.live.nodes['module:a.py'].badge).toBe('2');
    s.pause();
    s.seek(0);
    expect(useAppStore.getState().overlays.live.nodes['module:a.py'].badge).toBe('1');
    s.setEnabled(false);
    expect(useAppStore.getState().overlays.live).toBeUndefined();
    s.setEnabled(true);
    s.record(liveView({ 'module:a.py': 3 }), 3);
    unmount();
    expect(useAppStore.getState().overlays.live).toBeUndefined();
  });
});
