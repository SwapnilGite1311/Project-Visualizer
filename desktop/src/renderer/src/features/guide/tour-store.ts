import { create } from 'zustand';
import { getSetting, setSetting } from '../../api/main';
import { useAppStore } from '../../core/store';
import { FULL_TOUR, type TourStep } from './topics';

export const TOUR_SEEN_KEY = 'ui.tourSeen';

interface TourState {
  steps: TourStep[];
  index: number;
  start(steps?: TourStep[]): void;
  next(): void;
  back(): void;
  stop(): void;
  maybeStartFirstTime(): Promise<void>;
}

export const useTourStore = create<TourState>((set, get) => ({
  steps: [],
  index: 0,
  start: (steps = FULL_TOUR) => set({ steps, index: 0 }),
  next: () => {
    const { index, steps } = get();
    if (index + 1 >= steps.length) set({ steps: [], index: 0 });
    else set({ index: index + 1 });
  },
  back: () => set({ index: Math.max(0, get().index - 1) }),
  stop: () => set({ steps: [], index: 0 }),
  // The whole tour, once, the first time a project is open.
  async maybeStartFirstTime() {
    if (useAppStore.getState().screen !== 'workspace' || get().steps.length) return;
    const seen = await getSetting<boolean>(TOUR_SEEN_KEY, false).catch(() => true);
    if (seen) return;
    await setSetting(TOUR_SEEN_KEY, true).catch(() => undefined);
    get().start();
  },
}));

export const useHelpStore = create<{ open: boolean; topic: string | null; show(topic?: string | null): void; close(): void }>((set) => ({
  open: false,
  topic: null,
  show: (topic = null) => set({ open: true, topic }),
  close: () => set({ open: false }),
}));
