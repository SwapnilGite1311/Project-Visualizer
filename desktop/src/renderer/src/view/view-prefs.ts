import { create } from 'zustand';
import { getSetting, setSetting } from '../api/main';

// The user's renderer choice per mode (settings view.renderer2d / view.renderer3d; '' = the default renderer).
interface ViewPrefs {
  renderer2d: string;
  renderer3d: string;
  loaded: boolean;
  load(): Promise<void>;
  setRenderer(mode: '2d' | '3d', id: string): Promise<void>;
}

export const useViewPrefs = create<ViewPrefs>((set, get) => ({
  renderer2d: '',
  renderer3d: '',
  loaded: false,
  async load() {
    if (get().loaded) return;
    try {
      const [renderer2d, renderer3d] = await Promise.all([getSetting('view.renderer2d', ''), getSetting('view.renderer3d', '')]);
      set({ renderer2d: renderer2d ?? '', renderer3d: renderer3d ?? '', loaded: true });
    } catch {
      set({ loaded: true }); // no settings (tests, early start): keep the defaults
    }
  },
  async setRenderer(mode, id) {
    set(mode === '2d' ? { renderer2d: id } : { renderer3d: id });
    await setSetting(mode === '2d' ? 'view.renderer2d' : 'view.renderer3d', id).catch(() => undefined);
  },
}));
