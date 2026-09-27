import { create } from 'zustand';

// Which dashboard intro cards the user closed with "Got it" (remembered on this computer).
const KEY = 'pv.workspaces.introsSeen';

function load(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

interface IntroState {
  seen: string[];
  dismiss(id: string): void;
  reopen(id: string): void;
}

export const useIntroStore = create<IntroState>((set, get) => {
  const save = (seen: string[]) => {
    set({ seen });
    try {
      localStorage.setItem(KEY, JSON.stringify(seen));
    } catch {
      // not remembered; closed for this session
    }
  };
  return {
    seen: load(),
    dismiss: (id) => save([...new Set([...get().seen, id])]),
    reopen: (id) => save(get().seen.filter((x) => x !== id)),
  };
});
