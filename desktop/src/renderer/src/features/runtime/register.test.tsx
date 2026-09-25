// @vitest-environment jsdom
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useLiveStore } from './live-store';
import { LiveToggle } from './LiveToggle';
import register, { RuntimeWatchers } from './register';
import { RuntimePanel } from './RuntimePanel';
import { liveView } from './test-data';

// The full suite runs many jsdom files in parallel; the 1 s default wait is too tight there.
configure({ asyncUtilTimeout: 5000 });

let fake: FakeBridge;
beforeEach(() => {
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:runtime.setActiveProject', () => ({ ok: true }));
  fake.invokeHandlers.set('pv:runtime.hubInfo', () => ({
    url: 'http://127.0.0.1:47100',
    token: 't',
    running: true,
  }));
  fake.rpcHandlers.set('rtsync.level_view', () => liveView({ 'module:a.py': 3 }));
  fake.rpcHandlers.set('runtime.status', () => ({
    project_id: 'p1',
    active: true,
    events_total: 42,
    events_buffered: 40,
    last_event_ms: 0,
    services: ['shop'],
  }));
  fake.rpcHandlers.set('runtime.clear', () => ({}));
  useAppStore.setState({
    projectId: 'p1',
    projectRoot: 'C:/code/shop',
    overlays: {},
    activePanel: { left: null, center: null, right: null, bottom: null },
  });
  useLiveStore.setState({
    enabled: false,
    paused: false,
    current: null,
    history: [],
    playbackIndex: null,
    lastUpdateAt: null,
  });
});

describe('runtime feature', () => {
  it('registers the panel, toolbar item, commands and watchers', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('bottom').map((p) => p.id)).toEqual(['runtime']);
    expect(r.toolbarItems('right').map((t) => t.id)).toEqual(['live-toggle']);
    expect(r.commands().map((c) => [c.id, c.shortcut])).toEqual([
      ['runtime.clear', undefined],
      ['runtime.toggle', 'Ctrl+Shift+L'],
    ]);
    expect(r.globals().map((g) => g.id)).toEqual(['runtime-watchers']);
  });

  it('tells the receiver about the project and draws live activity', async () => {
    const { unmount } = render(<RuntimeWatchers />);
    await waitFor(() =>
      expect(fake.invokeCalls[0]).toEqual({
        channel: 'pv:runtime.setActiveProject',
        payload: { project_id: 'p1', root: 'C:/code/shop' },
      }),
    );
    act(() => useLiveStore.getState().setEnabled(true));
    await waitFor(
      () => expect(useAppStore.getState().overlays.live?.nodes['module:a.py']?.badge).toBe('3'),
      { timeout: 2000 },
    );
    act(() => useAppStore.getState().closedProject());
    await waitFor(() =>
      expect(fake.invokeCalls.at(-1)).toEqual({
        channel: 'pv:runtime.setActiveProject',
        payload: { project_id: null, root: null },
      }),
    );
    unmount();
  });

  it('the toolbar switch turns live on and opens the panel on its Live tab', async () => {
    render(
      <>
        <LiveToggle />
        <RuntimePanel />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Live/, pressed: false }));
    expect(useLiveStore.getState().enabled).toBe(true);
    expect(useAppStore.getState().activePanel.bottom).toBe('runtime');
    expect(await screen.findByLabelText('Runtime counters')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText('Runtime counters').textContent).toContain('Events 42'),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Clear data' }));
    });
    expect(fake.rpcCalls.some((c) => c.method === 'runtime.clear')).toBe(true);
  });
});
