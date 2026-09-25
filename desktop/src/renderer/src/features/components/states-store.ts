import { create } from 'zustand';
import { getSetting, setSetting } from '../../api/main';
import { useAppStore } from '../../core/store';

interface ComponentStates {
  visited: Set<string>;
  pinned: string[];
  markVisited(id: string): void;
  togglePin(id: string): void;
  loadPins(root: string): Promise<void>;
  savePins(root: string): Promise<void>;
  reset(): void;
}

const pinsKey = (root: string) => 'project.pins.' + root;

export const useComponentStates = create<ComponentStates>()((set, get) => ({
  visited: new Set(),
  pinned: [],
  markVisited: (id) => {
    if (get().visited.has(id)) return;
    set({ visited: new Set([...get().visited, id]) });
  },
  togglePin: (id) => {
    const pinned = get().pinned;
    set({ pinned: pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id] });
    const root = useAppStore.getState().projectRoot;
    if (root) void get().savePins(root);
  },
  loadPins: async (root) => {
    const pins = await getSetting<string[]>(pinsKey(root), []);
    set({ pinned: Array.isArray(pins) ? pins : [] });
  },
  savePins: async (root) => {
    await setSetting(pinsKey(root), get().pinned);
  },
  reset: () => set({ visited: new Set(), pinned: [] }),
}));

function syncOverlays(): void {
  const { visited, pinned } = useComponentStates.getState();
  const setOverlay = useAppStore.getState().setOverlay;
  setOverlay('visited', { priority: 5, nodes: Object.fromEntries([...visited].map((id) => [id, { borderColor: '#64748b' }])), edges: {} });
  setOverlay('pinned', { priority: 6, nodes: Object.fromEntries(pinned.map((id) => [id, { badge: 'pin' }])), edges: {} });
}

// Visited = selected at least once this session; pins are saved per project.
export function startStateTracking(): () => void {
  const offApp = useAppStore.subscribe((s, prev) => {
    if (s.projectId !== prev.projectId) {
      useComponentStates.getState().reset();
      if (s.projectRoot) void useComponentStates.getState().loadPins(s.projectRoot).catch(() => undefined);
      return;
    }
    if (s.selectedNodeId && s.selectedNodeId !== prev.selectedNodeId) useComponentStates.getState().markVisited(s.selectedNodeId);
  });
  const offStates = useComponentStates.subscribe((s, prev) => {
    if (s.visited !== prev.visited || s.pinned !== prev.pinned) syncOverlays();
  });
  return () => {
    offApp();
    offStates();
  };
}
