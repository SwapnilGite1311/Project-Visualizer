// Health of the open project, refreshed (at most once per second) when the engine reports changes.
import { create } from 'zustand';
import { onEngineNotification } from '../../api/bridge';
import { useAppStore } from '../../core/store';
import {
  getHealth,
  getThresholds,
  type HealthInfo,
  setThresholds,
  type Thresholds,
} from './health-api';
import { buildHealthOverlay } from './health-overlay';

export const HEALTH_REFRESH_MS = 1000;

interface HealthStoreState {
  enabled: boolean;
  states: Record<string, HealthInfo>;
  thresholds: Thresholds | null;
  setEnabled(on: boolean): void;
  setStates(states: Record<string, HealthInfo>): void;
  loadThresholds(): Promise<void>;
  saveThresholds(partial: Partial<Thresholds>): Promise<void>;
  reset(): void;
}

function applyOverlay(): void {
  const { enabled, states } = useHealthStore.getState();
  const has = Object.keys(states).length > 0;
  useAppStore.getState().setOverlay('health', enabled && has ? buildHealthOverlay(states) : null);
}

export const useHealthStore = create<HealthStoreState>()((set) => ({
  enabled: true,
  states: {},
  thresholds: null,
  setEnabled: (enabled) => {
    set({ enabled });
    applyOverlay();
  },
  setStates: (states) => {
    set({ states });
    applyOverlay();
  },
  loadThresholds: async () => {
    const pid = useAppStore.getState().projectId;
    if (pid) set({ thresholds: await getThresholds(pid) });
  },
  saveThresholds: async (partial) => {
    const pid = useAppStore.getState().projectId;
    if (pid) set({ thresholds: await setThresholds(pid, partial) });
  },
  reset: () => {
    set({ states: {}, thresholds: null });
    applyOverlay();
  },
}));

export function startHealthWatcher(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRun = 0;
  let generation = 0;

  const run = async () => {
    timer = null;
    lastRun = Date.now();
    const pid = useAppStore.getState().projectId;
    if (!pid) return;
    const mine = generation;
    try {
      const states = await getHealth(pid);
      if (mine === generation) useHealthStore.getState().setStates(states);
    } catch {
      // the next change tries again
    }
  };
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => void run(), Math.max(0, HEALTH_REFRESH_MS - (Date.now() - lastRun)));
  };

  const offChanged = onEngineNotification('health.changed', (params) => {
    if ((params as { project_id?: string })?.project_id === useAppStore.getState().projectId)
      schedule();
  });
  const offApp = useAppStore.subscribe((s, prev) => {
    if (s.projectId === prev.projectId) return;
    generation++;
    useHealthStore.getState().reset();
    if (s.projectId) schedule();
  });
  if (useAppStore.getState().projectId) schedule();

  return () => {
    offChanged();
    offApp();
    if (timer) clearTimeout(timer);
    generation++;
  };
}
