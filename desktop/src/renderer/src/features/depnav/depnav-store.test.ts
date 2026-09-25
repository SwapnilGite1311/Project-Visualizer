import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAncestors } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { gnode } from '../../view/test-data';
import { cycles, findPath, neighbors } from './deps-api';
import { useDepnavStore } from './depnav-store';

vi.mock('../../api/engine', () => ({ getAncestors: vi.fn() }));
vi.mock('./deps-api', () => ({ neighbors: vi.fn(), findPath: vi.fn(), cycles: vi.fn() }));

const root = gnode('function:a.py#f', 'function');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAncestors).mockImplementation(async (_p, id) => [gnode('project:', 'project'), gnode(id, 'function')]);
  vi.mocked(neighbors).mockResolvedValue({
    root_id: root.id,
    edges: [],
    items: [{ node_id: 'function:b.py#g', distance: 1, direction: 'out', ancestor_ids: ['project:', 'function:b.py#g'] }],
  });
  useAppStore.setState({ projectId: 'p1', overlays: {}, activePanel: { left: null, center: null, right: null, bottom: null } });
  useDepnavStore.setState({ root: null, result: null, direction: 'both', depth: 1, showOnMap: true, path: null, cycles: null });
});

describe('depnav store', () => {
  it('shows dependencies in the panel and on the map', async () => {
    await useDepnavStore.getState().show(root);
    expect(neighbors).toHaveBeenCalledWith('p1', root.id, 'both', 1);
    expect(useDepnavStore.getState().result?.items).toHaveLength(1);
    expect(useAppStore.getState().activePanel.bottom).toBe('dependencies');
    expect(useAppStore.getState().overlays.deps.nodes['function:b.py#g']).toMatchObject({ badge: 'uses' });
  });

  it('re-runs when the direction or depth changes and can hide the overlay', async () => {
    await useDepnavStore.getState().show(root);
    await useDepnavStore.getState().setDirection('in');
    await useDepnavStore.getState().setDepth(3);
    expect(neighbors).toHaveBeenLastCalledWith('p1', root.id, 'in', 3);
    useDepnavStore.getState().toggleShowOnMap();
    expect(useAppStore.getState().overlays.deps).toBeUndefined();
  });

  it('finds a path, loads and highlights cycles, and clears', async () => {
    vi.mocked(findPath).mockResolvedValue({ found: true, node_ids: [root.id, 'function:b.py#g'], edge_ids: ['e'] });
    vi.mocked(cycles).mockResolvedValue([{ node_ids: ['module:a.py', 'module:b.py'] }]);
    useDepnavStore.getState().setRoot(root);
    await useDepnavStore.getState().findPathTo('package:app');
    expect(findPath).toHaveBeenCalledWith('p1', root.id, 'package:app');
    expect(useAppStore.getState().overlays['deps-path'].nodes['function:b.py#g']).toMatchObject({ badge: '2' });
    await useDepnavStore.getState().loadCycles(2);
    expect(useDepnavStore.getState().cycles).toEqual([{ node_ids: ['module:a.py', 'module:b.py'] }]);
    await useDepnavStore.getState().highlightCycle({ node_ids: ['module:a.py', 'module:b.py'] });
    expect(useAppStore.getState().overlays['deps-cycle'].nodes['module:b.py']).toEqual({ color: '#ef4444' });
    useDepnavStore.getState().clear();
    expect(Object.keys(useAppStore.getState().overlays)).toEqual([]);
  });
});
