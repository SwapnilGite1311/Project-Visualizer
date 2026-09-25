import { create } from 'zustand';
import { getAncestors } from '../../api/engine';
import type { NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { cycles as fetchCycles, type Cycle, type Direction, findPath, neighbors, type NeighborsResult, type PathResult } from './deps-api';
import { buildCycleOverlay, buildDepsOverlay, buildPathOverlay } from './deps-overlay';

interface DepnavState {
  root: NodeRef | null;
  direction: Direction;
  depth: number;
  result: NeighborsResult | null;
  showOnMap: boolean;
  path: PathResult | null;
  cycles: Cycle[] | null;
  cycleLevel: number;
  loading: boolean;
  error: string | null;
  setRoot(node: NodeRef): void;
  show(node: NodeRef): Promise<void>;
  setDirection(direction: Direction): Promise<void>;
  setDepth(depth: number): Promise<void>;
  toggleShowOnMap(): void;
  findPathTo(targetId: string): Promise<void>;
  loadCycles(level: number): Promise<void>;
  highlightCycle(cycle: Cycle): Promise<void>;
  clear(): void;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function ancestorsOf(pid: string, ids: string[]): Promise<Record<string, string[]>> {
  const entries = await Promise.all(ids.map(async (id) => [id, (await getAncestors(pid, id)).map((n) => n.id)] as const));
  return Object.fromEntries(entries);
}

export const useDepnavStore = create<DepnavState>()((set, get) => {
  const app = () => useAppStore.getState();
  const refresh = async () => {
    const { root, direction, depth } = get();
    const pid = app().projectId;
    if (!root || !pid) return;
    set({ loading: true, error: null });
    try {
      const [result, rootAncestors] = await Promise.all([
        neighbors(pid, root.id, direction, depth),
        getAncestors(pid, root.id).then((nodes) => nodes.map((n) => n.id)),
      ]);
      set({ result, loading: false });
      app().setOverlay('deps', get().showOnMap ? buildDepsOverlay(result, rootAncestors) : null);
    } catch (e) {
      set({ loading: false, error: message(e) });
    }
  };

  return {
    root: null,
    direction: 'both',
    depth: 1,
    result: null,
    showOnMap: true,
    path: null,
    cycles: null,
    cycleLevel: 2,
    loading: false,
    error: null,
    setRoot: (root) => set({ root, path: null }),
    show: async (node) => {
      get().setRoot(node);
      app().showPanel('bottom', 'dependencies');
      await refresh();
    },
    setDirection: async (direction) => {
      set({ direction });
      await refresh();
    },
    setDepth: async (depth) => {
      set({ depth });
      await refresh();
    },
    toggleShowOnMap: () => {
      set({ showOnMap: !get().showOnMap });
      if (get().showOnMap) void refresh();
      else app().setOverlay('deps', null);
    },
    findPathTo: async (targetId) => {
      const { root } = get();
      const pid = app().projectId;
      if (!root || !pid) return;
      set({ loading: true, error: null });
      try {
        const path = await findPath(pid, root.id, targetId);
        set({ path, loading: false });
        app().setOverlay('deps-path', path.found ? buildPathOverlay(path, await ancestorsOf(pid, path.node_ids)) : null);
      } catch (e) {
        set({ loading: false, error: message(e) });
      }
    },
    loadCycles: async (level) => {
      const pid = app().projectId;
      if (!pid) return;
      set({ cycleLevel: level, loading: true, error: null });
      try {
        set({ cycles: await fetchCycles(pid, level), loading: false });
      } catch (e) {
        set({ loading: false, error: message(e) });
      }
    },
    highlightCycle: async (cycle) => {
      const pid = app().projectId;
      if (!pid) return;
      app().setOverlay('deps-cycle', buildCycleOverlay(cycle.node_ids, await ancestorsOf(pid, cycle.node_ids)));
    },
    clear: () => {
      set({ root: null, result: null, path: null, error: null });
      for (const id of ['deps', 'deps-path', 'deps-cycle']) app().setOverlay(id, null);
    },
  };
});
