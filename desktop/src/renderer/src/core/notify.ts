import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';
export interface Toast { id: number; kind: ToastKind; title: string; detail?: string }

interface ToastState {
  items: Toast[];
  push(kind: ToastKind, title: string, detail?: string): number;
  dismiss(id: number): void;
}

let nextId = 1;
const AUTO_DISMISS_MS = 4000;

export const useToasts = create<ToastState>()((set, get) => ({
  items: [],
  push: (kind, title, detail) => {
    const id = nextId++;
    set((s) => ({ items: [...s.items, { id, kind, title, detail }] }));
    if (kind !== 'error') setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const notify = {
  info: (title: string, detail?: string) => useToasts.getState().push('info', title, detail),
  success: (title: string, detail?: string) => useToasts.getState().push('success', title, detail),
  error: (title: string, detail?: string) => useToasts.getState().push('error', title, detail),
};
