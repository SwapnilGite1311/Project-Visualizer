// Live activity at the current level: refreshed at most every 500 ms while on, with ~5 minutes of history for playback.
import { create } from 'zustand';
import { onEngineNotification } from '../../api/bridge';
import { useAppStore } from '../../core/store';
import { type LiveLevelView, liveLevelView } from './runtime-api';

export const REFRESH_MS = 500;
export const IDLE_REFRESH_MS = 1000; // counts fade out when a program goes quiet
export const WINDOW_MS = 5000;
export const MAX_HISTORY = 600;

export interface Snapshot {
  at: number;
  view: LiveLevelView;
}

interface LiveState {
  enabled: boolean;
  paused: boolean;
  current: LiveLevelView | null;
  history: Snapshot[];
  playbackIndex: number | null;
  lastUpdateAt: number | null;
  setEnabled(on: boolean): void;
  pause(): void;
  resume(): void;
  seek(index: number): void;
  record(view: LiveLevelView, at: number): void;
  reset(): void;
}

const empty = { current: null, history: [], playbackIndex: null, lastUpdateAt: null };

export const useLiveStore = create<LiveState>()((set, get) => ({
  enabled: false,
  paused: false,
  ...empty,
  setEnabled: (enabled) => set(enabled ? { enabled } : { enabled, paused: false, ...empty }),
  pause: () =>
    set((s) => ({
      paused: true,
      playbackIndex: s.history.length > 0 ? s.history.length - 1 : null,
    })),
  resume: () => set({ paused: false, playbackIndex: null }),
  seek: (index) => {
    const { history, paused } = get();
    if (!paused || history.length === 0) return;
    set({ playbackIndex: Math.max(0, Math.min(history.length - 1, Math.round(index))) });
  },
  record: (view, at) =>
    set((s) => {
      const history = [...s.history, { at, view }];
      if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
      return { current: view, history, lastUpdateAt: at };
    }),
  reset: () => set({ ...empty }),
}));

// The snapshot on screen: the one picked on the playback bar while paused, else the latest.
export function displayedView(
  s: Pick<LiveState, 'paused' | 'playbackIndex' | 'history' | 'current'>,
): LiveLevelView | null {
  if (s.paused && s.playbackIndex !== null) return s.history[s.playbackIndex]?.view ?? s.current;
  return s.current;
}

export function startLiveWatcher(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRun = 0;
  let generation = 0; // answers for an older project or level are ignored

  const run = async () => {
    timer = null;
    lastRun = Date.now();
    const { enabled, paused } = useLiveStore.getState();
    const { projectId, currentParentId } = useAppStore.getState();
    if (!enabled || paused || !projectId) return;
    const mine = generation;
    try {
      const view = await liveLevelView(projectId, currentParentId, WINDOW_MS);
      if (mine === generation && useLiveStore.getState().enabled)
        useLiveStore.getState().record(view, Date.now());
    } catch {
      // engine busy or project closing: the next update tries again
    }
  };

  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => void run(), Math.max(0, REFRESH_MS - (Date.now() - lastRun)));
  };

  const offUpdate = onEngineNotification('runtime.update', (params) => {
    if ((params as { project_id?: string })?.project_id === useAppStore.getState().projectId)
      schedule();
  });
  const offApp = useAppStore.subscribe((s, prev) => {
    if (s.projectId === prev.projectId && s.currentParentId === prev.currentParentId) return;
    generation++;
    useLiveStore.getState().reset();
    schedule();
  });
  const offLive = useLiveStore.subscribe((s, prev) => {
    if ((s.enabled && !prev.enabled) || (!s.paused && prev.paused)) schedule();
  });
  const idle = setInterval(schedule, IDLE_REFRESH_MS);

  return () => {
    offUpdate();
    offApp();
    offLive();
    clearInterval(idle);
    if (timer) clearTimeout(timer);
    generation++;
  };
}
