// @vitest-environment jsdom
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { clearAncestorCache } from './ancestors';
import { CrossingsTable } from './CrossingsTable';

// The full suite runs many jsdom files in parallel; the 1 s default wait is too tight there.
configure({ asyncUtilTimeout: 5000 });

let fake: FakeBridge;
beforeEach(() => {
  clearAncestorCache();
  fake = installFakeBridge();
  useAppStore.setState({ projectId: 'p1', overlays: {} });
  fake.rpcHandlers.set('modtrace.boundaries', () => ({
    crossings: [
      {
        from_id: 'module:app/api.py',
        to_id: 'module:app/db.py',
        count: 40,
        avg_ms: 2.25,
        errors: 1,
        stalls: 0,
        loops: 0,
      },
      {
        from_id: 'module:app/db.py',
        to_id: 'module:app/cache.py',
        count: 5000,
        avg_ms: 0.1,
        errors: 0,
        stalls: 0,
        loops: 3,
      },
    ],
  }));
  fake.rpcHandlers.set('graph.ancestors', (p) => {
    const id = (p as { node_id: string }).node_id;
    return {
      nodes: [gnode('project:', 'project'), gnode('package:app', 'package'), gnode(id, 'module')],
    };
  });
});

describe('CrossingsTable', () => {
  it('lists crossings, highlights loops and shows a crossing on the map', async () => {
    render(<CrossingsTable />);
    const table = await screen.findByRole('table', { name: 'Module crossings' });
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(3));
    expect(fake.rpcCalls[0]).toEqual({
      method: 'modtrace.boundaries',
      params: { project_id: 'p1', window_ms: 300000 },
    });
    const [, first, second] = within(table).getAllByRole('row');
    expect(first.textContent).toBe('app/api.pyapp/db.py402.3100');
    expect(first.getAttribute('data-warning')).toBeNull();
    expect(second.getAttribute('data-warning')).toBe('true');

    fireEvent.click(first);
    await waitFor(() => expect(useAppStore.getState().overlays.crossing).toBeDefined());
    expect(useAppStore.getState().overlays.crossing.nodes).toEqual({
      'package:app': { color: '#f97316' },
      'module:app/api.py': { color: '#f97316' },
      'module:app/db.py': { color: '#f97316' },
    });
    fireEvent.click(first);
    expect(useAppStore.getState().overlays.crossing).toBeUndefined();
  });
});
