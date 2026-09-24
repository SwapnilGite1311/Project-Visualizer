import { create } from 'zustand';
import { ApiError, invoke } from '../../api/bridge';
import type { NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';

export interface ExplainResult { node_id: string; markdown: string; cited_nodes: { id: string; name: string }[]; model: string }

interface ExplainState {
  currentNode: NodeRef | null;
  results: Record<string, ExplainResult>;
  loading: Record<string, boolean>;
  errors: Record<string, { code: string | number; message: string }>;
  explain(node: NodeRef, force?: boolean): Promise<void>;
  clearCache(): void;
}

export const useExplainStore = create<ExplainState>()((set, get) => ({
  currentNode: null,
  results: {},
  loading: {},
  errors: {},
  explain: async (node, force = false) => {
    set({ currentNode: node });
    useAppStore.getState().showPanel('right', 'explanation');
    if (!force && get().results[node.id]) return;
    const projectId = useAppStore.getState().projectId;
    if (!projectId) return;
    set((s) => {
      const errors = { ...s.errors };
      delete errors[node.id];
      return { loading: { ...s.loading, [node.id]: true }, errors };
    });
    try {
      const result = await invoke<ExplainResult>('pv:ai.explainNode', { project_id: projectId, node_id: node.id });
      set((s) => ({ results: { ...s.results, [node.id]: result }, loading: { ...s.loading, [node.id]: false } }));
    } catch (e) {
      const error =
        e instanceof ApiError ? { code: e.code, message: e.message } : { code: 'error', message: e instanceof Error ? e.message : String(e) };
      set((s) => ({ errors: { ...s.errors, [node.id]: error }, loading: { ...s.loading, [node.id]: false } }));
    }
  },
  clearCache: () => set({ currentNode: null, results: {}, loading: {}, errors: {} }),
}));

// Explanations belong to one project; forget them when the project changes.
useAppStore.subscribe((state, prev) => {
  if (state.projectId !== prev.projectId) useExplainStore.getState().clearCache();
});
