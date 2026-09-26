// @vitest-environment jsdom
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { createRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useErrorsStore } from '../errors/errors-store';
import { useFixesStore } from './fixes-store';
import { FixesPanel } from './FixesPanel';
import { useLiveSync } from './livesync-store';
import { LiveSyncToggle } from './LiveSyncToggle';
import register from './register';

configure({ asyncUtilTimeout: 5000 });

let fake: FakeBridge;
beforeEach(() => {
  fake = installFakeBridge();
  fake.invokeHandlers.set('pv:settings.set', () => true);
  fake.rpcHandlers.set('watch.start', () => ({
    watching: true,
    interval_ms: 1000,
    seeded: false,
    last_change_ms: 0,
  }));
  fake.rpcHandlers.set('watch.stop', () => ({
    watching: false,
    interval_ms: 1000,
    seeded: true,
    last_change_ms: 0,
  }));
  useAppStore.setState({ projectId: 'p1' });
  useLiveSync.setState({ enabled: true, watching: true, lastChangeAt: null });
  useFixesStore.setState({ items: [], verifiedAt: {} });
  useErrorsStore.setState({ errors: [], selected: null });
});

describe('livesync feature', () => {
  it('registers the panel, toolbar switch, command and watchers', () => {
    const r = createRegistry();
    register(r);
    expect(r.panels('bottom').map((p) => [p.id, p.title, p.order])).toEqual([
      ['fixes', 'Fixes', 45],
    ]);
    expect(r.toolbarItems('right').map((t) => t.id)).toEqual(['live-sync']);
    expect(r.commands().map((c) => c.id)).toEqual(['livesync.toggle']);
    expect(r.globals().map((g) => g.id)).toEqual(['livesync-watchers']);
  });

  it('the switch turns syncing off and on', async () => {
    render(<LiveSyncToggle />);
    const toggle = screen.getByRole('switch', { name: /Sync with files/ }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    await waitFor(() => expect(fake.rpcCalls.some((c) => c.method === 'watch.stop')).toBe(true));
    expect(useLiveSync.getState().enabled).toBe(false);
    fireEvent.click(toggle);
    await waitFor(() => expect(fake.rpcCalls.some((c) => c.method === 'watch.start')).toBe(true));
  });

  it('the panel lists fixes with their state and progress', () => {
    useErrorsStore.setState({
      errors: [
        {
          error_id: 'e1',
          source: 'runtime',
          language: 'python',
          error_type: 'KeyError',
          message: "'id'",
          count: 2,
          first_seen_ms: 1,
          last_seen_ms: 2,
          origin_node_id: 'function:app/utils.py#is_valid',
          frames: [],
        },
      ],
    });
    useFixesStore.setState({
      items: [
        {
          error_id: 'e1',
          node_id: 'function:app/utils.py#is_valid',
          file_path: 'app/utils.py',
          state: 'fix_pending',
          changed_at_ms: 1,
          ok_calls: 2,
        },
        {
          error_id: 'e9',
          node_id: 'function:app/db.py#load',
          file_path: 'app/db.py',
          state: 'regressed',
          changed_at_ms: 1,
          ok_calls: 0,
        },
      ],
    });
    render(<FixesPanel />);
    expect(screen.getByText(/After 3 successful runs the error is confirmed fixed/)).toBeTruthy();
    const rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain("KeyError: 'id'");
    expect(rows[1].textContent).toContain('fix pending');
    expect(rows[1].textContent).toContain('2 / 3');
    expect(rows[2].textContent).toContain('regressed');
    expect(rows[2].textContent).toContain('app/db.py');
  });
});
