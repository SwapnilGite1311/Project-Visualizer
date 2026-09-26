// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { type FakeBridge, installFakeBridge } from '../../api/fake-bridge';
import { useAppStore } from '../../core/store';
import { useTimeTravel } from './timetravel-store';

const DIFF = {
  added: ['function:app/a.py#new_fn'],
  removed: ['function:app/a.py#old_fn'],
  changed: [{ node_id: 'function:app/a.py#f', fields: ['metrics.loc'] }],
  edges_added: 1,
  edges_removed: 2,
  packages: [{ node_id: 'package:app', added: 1, removed: 1, changed: 1 }],
};

let fake: FakeBridge;

beforeEach(() => {
  fake = installFakeBridge();
  useAppStore.setState(useAppStore.getInitialState());
  useTimeTravel.setState(useTimeTravel.getInitialState());
  fake.invokeHandlers.set('pv:history.isRepo', () => true);
  fake.invokeHandlers.set('pv:history.commits', () => [
    { sha: 'bbbbbbb2', author: 'Ana', date: '2026-09-02T10:00:00Z', subject: 'second' },
    { sha: 'aaaaaaa1', author: 'Ana', date: '2026-09-01T10:00:00Z', subject: 'first' },
  ]);
  fake.invokeHandlers.set('pv:history.open', (p) => ({ project_id: 'old-' + (p as { sha: string }).sha, path: '/h/x' }));
  fake.invokeHandlers.set('pv:history.close', () => true);
  fake.rpcHandlers.set('project.status', () => ({ project_id: 'x', root_path: '/h/x', state: 'ready', files_total: 1, files_done: 1, error_message: '' }));
  fake.rpcHandlers.set('gdiff.compare', () => DIFF);
  fake.rpcHandlers.set('graph.ancestors', (p) => {
    const id = (p as { node_id: string }).node_id;
    return { nodes: [{ id: 'project:' }, { id: 'package:app' }, { id: 'module:app/a.py' }, { id }] };
  });
  useAppStore.getState().openedProject('cur', 'C:/code/app');
});

describe('time travel store', () => {
  it('loads the commits of the open repository', async () => {
    await useTimeTravel.getState().loadCommits();
    expect(useTimeTravel.getState().isRepo).toBe(true);
    expect(useTimeTravel.getState().commits.map((c) => c.sha)).toEqual(['bbbbbbb2', 'aaaaaaa1']);
  });

  it('opens a commit, compares it with the current code and marks the map', async () => {
    await useTimeTravel.getState().select('aaaaaaa1');
    const s = useTimeTravel.getState();
    expect(s.diff?.removed).toEqual(['function:app/a.py#old_fn']);
    expect(fake.rpcCalls.find((c) => c.method === 'gdiff.compare')?.params).toEqual({ base_project_id: 'old-aaaaaaa1', head_project_id: 'cur' });
    const overlay = useAppStore.getState().overlays.timetravel;
    expect(overlay.nodes['function:app/a.py#new_fn']).toMatchObject({ badge: 'new' });
    expect(overlay.nodes['function:app/a.py#f']).toMatchObject({ badge: 'changed' });
    expect(overlay.nodes['package:app']).toMatchObject({ badge: 'changes inside' });
    expect(overlay.nodes['project:']).toBeUndefined();
  });

  it('switches the map to the old version and back', async () => {
    await useTimeTravel.getState().select('aaaaaaa1');
    useTimeTravel.getState().showHistorical();
    expect(useAppStore.getState().projectId).toBe('old-aaaaaaa1');
    expect(useAppStore.getState().projectRoot).toBe('history:aaaaaaa1');
    useTimeTravel.getState().backToCurrent();
    expect(useAppStore.getState().projectId).toBe('cur');
    await new Promise((r) => setTimeout(r, 0));
    expect(useAppStore.getState().overlays.timetravel).toBeDefined(); // marks come back on the current map
  });

  it('closes the previous commit when another one is chosen, and clears everything', async () => {
    await useTimeTravel.getState().select('aaaaaaa1');
    await useTimeTravel.getState().select('bbbbbbb2');
    const closes = fake.invokeCalls.filter((c) => c.channel === 'pv:history.close');
    expect(closes).toHaveLength(1);
    expect(closes[0].payload).toMatchObject({ project_id: 'old-aaaaaaa1', root: 'C:/code/app' });
    await useTimeTravel.getState().clear();
    expect(useAppStore.getState().overlays.timetravel).toBeUndefined();
    expect(useTimeTravel.getState().selected).toBeNull();
  });

  it('knows when the folder is not a repository', async () => {
    fake.invokeHandlers.set('pv:history.isRepo', () => false);
    await useTimeTravel.getState().loadCommits();
    expect(useTimeTravel.getState().isRepo).toBe(false);
  });
});
