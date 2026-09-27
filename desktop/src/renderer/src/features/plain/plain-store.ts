import { create } from 'zustand';
import { getSetting, setSetting } from '../../api/main';

// Setting ui.simpleWords (default on): everyday words instead of code terms across the app.
interface PlainWords {
  simple: boolean;
  loaded: boolean;
  load(): Promise<void>;
  setSimple(on: boolean): Promise<void>;
}

export const SIMPLE_WORDS_KEY = 'ui.simpleWords';

export const usePlainWordsStore = create<PlainWords>((set, get) => ({
  simple: true,
  loaded: false,
  async load() {
    if (get().loaded) return;
    try {
      const simple = await getSetting<boolean>(SIMPLE_WORDS_KEY, true);
      set({ simple: simple !== false, loaded: true });
    } catch {
      set({ loaded: true }); // no settings (tests, early start): keep simple words
    }
  },
  async setSimple(simple) {
    set({ simple });
    await setSetting(SIMPLE_WORDS_KEY, simple).catch(() => undefined);
  },
}));

// true = use simple words. Components call this; the setting is loaded once at start (register.tsx).
export function usePlainWords(): boolean {
  return usePlainWordsStore((s) => s.simple);
}
