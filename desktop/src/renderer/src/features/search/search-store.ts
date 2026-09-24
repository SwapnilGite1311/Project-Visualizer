import { create } from 'zustand';
import { search, suggest } from '../../api/engine';
import type { NodeKind, SearchHit } from '../../api/types';
import { useAppStore } from '../../core/store';

export const DEBOUNCE_MS = 200;

interface SearchState {
  text: string;
  kinds: NodeKind[];
  results: SearchHit[];
  suggestions: string[];
  loading: boolean;
  error: string | null;
  setText(text: string): void;
  toggleKind(kind: NodeKind): void;
  clear(): void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
// Incremented for every query; a response is applied only if it belongs to the latest one.
let seq = 0;

export const useSearchStore = create<SearchState>()((set, get) => {
  const run = async () => {
    const { text, kinds } = get();
    const pid = useAppStore.getState().projectId;
    const mine = ++seq;
    if (!pid || text.trim().length < 1) {
      set({ results: [], suggestions: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const [results, suggestions] = await Promise.all([
        search(pid, text.trim(), kinds.length ? kinds : undefined, 50),
        suggest(pid, text.trim(), 8),
      ]);
      if (mine === seq) set({ results, suggestions, loading: false });
    } catch (e) {
      if (mine === seq) set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), DEBOUNCE_MS);
  };

  return {
    text: '',
    kinds: [],
    results: [],
    suggestions: [],
    loading: false,
    error: null,
    setText: (text) => {
      set({ text });
      schedule();
    },
    toggleKind: (kind) => {
      const kinds = get().kinds;
      set({ kinds: kinds.includes(kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind] });
      schedule();
    },
    clear: () => {
      clearTimeout(timer);
      seq++;
      set({ text: '', results: [], suggestions: [], loading: false, error: null });
    },
  };
});
