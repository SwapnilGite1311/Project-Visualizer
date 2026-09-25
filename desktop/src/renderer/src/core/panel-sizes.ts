// Sizes of the side and bottom panels. Unset = follow the window (CSS defaults); set = dragged by the user (remembered).
import { create } from 'zustand';

export type SizedArea = 'left' | 'right' | 'bottom';
export type PanelSizes = Record<SizedArea, number | null>;

const KEY = 'pv.layout.panelSizes';
export const LIMITS: Record<SizedArea, { min: number; max: number }> = {
  left: { min: 160, max: 700 },
  right: { min: 200, max: 800 },
  bottom: { min: 90, max: 700 },
};

const clampSize = (area: SizedArea, px: number) =>
  Math.round(Math.min(LIMITS[area].max, Math.max(LIMITS[area].min, px)));

function load(): PanelSizes {
  const empty: PanelSizes = { left: null, right: null, bottom: null };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<
      Record<SizedArea, unknown>
    >;
    for (const area of Object.keys(empty) as SizedArea[]) {
      const v = raw[area];
      if (typeof v === 'number' && Number.isFinite(v)) empty[area] = clampSize(area, v);
    }
  } catch {
    // unreadable or blocked storage: follow the window
  }
  return empty;
}

function save(sizes: PanelSizes): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sizes));
  } catch {
    // not remembered; still works for this session
  }
}

interface PanelSizesState {
  sizes: PanelSizes;
  setSize(area: SizedArea, px: number): void;
  reset(area: SizedArea): void;
}

export const usePanelSizes = create<PanelSizesState>()((set, get) => ({
  sizes: load(),
  setSize: (area, px) => {
    const sizes = { ...get().sizes, [area]: clampSize(area, px) };
    set({ sizes });
    save(sizes);
  },
  reset: (area) => {
    const sizes = { ...get().sizes, [area]: null };
    set({ sizes });
    save(sizes);
  },
}));

// CSS variables for the grid. A dragged size never takes more than a share of the window, so the map keeps room when it shrinks.
export function sizeVariables(sizes: PanelSizes): Record<string, string> {
  const vars: Record<string, string> = {};
  if (sizes.left !== null) vars['--left-w'] = `min(${sizes.left}px, 35vw)`;
  if (sizes.right !== null) vars['--right-w'] = `min(${sizes.right}px, 40vw)`;
  if (sizes.bottom !== null) vars['--bottom-h'] = `min(${sizes.bottom}px, 55vh)`;
  return vars;
}
