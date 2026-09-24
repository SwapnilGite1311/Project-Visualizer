import { create } from 'zustand';
import { analyzeImpact, getAncestors } from '../../api/engine';
import type { ImpactResult } from '../../api/types';
import { notify } from '../../core/notify';
import type { NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { buildImpactOverlay } from './impact-overlay';

interface ImpactState {
  rootNode: NodeRef | null;
  result: ImpactResult | null;
  loading: boolean;
  error: string | null;
  run(node: NodeRef): Promise<void>;
  clear(): void;
}

export const useImpactStore = create<ImpactState>()((set) => ({
  rootNode: null,
  result: null,
  loading: false,
  error: null,
  run: async (node) => {
    const pid = useAppStore.getState().projectId;
    if (!pid) return;
    set({ rootNode: node, loading: true, error: null });
    try {
      const result = await analyzeImpact(pid, node.id);
      const ancestors = await getAncestors(pid, node.id);
      useAppStore.getState().setOverlay('impact', buildImpactOverlay(result, ancestors.map((n) => n.id)));
      useAppStore.getState().showPanel('bottom', 'impact');
      set({ result, loading: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      notify.error('Impact analysis failed', message);
      set({ loading: false, error: message });
    }
  },
  clear: () => {
    useAppStore.getState().setOverlay('impact', null);
    set({ rootNode: null, result: null, loading: false, error: null });
  },
}));
