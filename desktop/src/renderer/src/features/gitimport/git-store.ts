import { create } from 'zustand';

interface GitState {
  open: boolean;
  cloning: boolean;
  error: string | null;
  setOpen(open: boolean): void;
  setCloning(cloning: boolean): void;
  setError(error: string | null): void;
}

export const useGitStore = create<GitState>()((set) => ({
  open: false,
  cloning: false,
  error: null,
  setOpen: (open) => set({ open, error: null }),
  setCloning: (cloning) => set({ cloning }),
  setError: (error) => set({ error }),
}));
