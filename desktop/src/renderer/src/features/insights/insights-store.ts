import { create } from 'zustand';
import { boundaries, entryPoints, hotspots, summary } from '../../api/engine';
import type { EntryPoint, Hotspot, PackageBoundary, Summary } from '../../api/types';
import { useAppStore } from '../../core/store';

interface InsightsState {
  summary: Summary | null;
  hotspots: Hotspot[];
  entryPoints: EntryPoint[];
  boundaries: PackageBoundary[];
  loading: boolean;
  error: string | null;
  loadedFor: string | null;
  load(): Promise<void>;
}

export const useInsightsStore = create<InsightsState>()((set, get) => ({
  summary: null,
  hotspots: [],
  entryPoints: [],
  boundaries: [],
  loading: false,
  error: null,
  loadedFor: null,
  load: async () => {
    const { projectId, graphVersion } = useAppStore.getState();
    if (!projectId) return;
    const key = projectId + ':' + graphVersion;
    if (get().loadedFor === key) return;
    set({ loading: true, error: null, loadedFor: key });
    try {
      const [s, h, e, b] = await Promise.all([summary(projectId), hotspots(projectId), entryPoints(projectId), boundaries(projectId)]);
      if (get().loadedFor === key) set({ summary: s, hotspots: h, entryPoints: e, boundaries: b, loading: false });
    } catch (err) {
      // Clearing loadedFor lets the next load() retry.
      if (get().loadedFor === key) set({ loading: false, loadedFor: null, error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
