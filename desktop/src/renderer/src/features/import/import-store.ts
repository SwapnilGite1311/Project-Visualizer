import { create } from 'zustand';
import type { ProgressParams } from '../../api/types';

interface ImportState {
  loading: boolean;
  root: string | null;
  progress: ProgressParams | null;
  error: string | null;
  setLoading(loading: boolean): void;
  setRoot(root: string | null): void;
  setProgress(progress: ProgressParams | null): void;
  setError(error: string | null): void;
}

export const useImportStore = create<ImportState>()((set) => ({
  loading: false,
  root: null,
  progress: null,
  error: null,
  setLoading: (loading) => set({ loading }),
  setRoot: (root) => set({ root }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
}));
