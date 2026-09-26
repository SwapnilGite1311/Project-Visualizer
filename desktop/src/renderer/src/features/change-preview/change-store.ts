import { create } from 'zustand';
import { invoke, rpc } from '../../api/bridge';
import { getAncestors } from '../../api/engine';
import type { AffectedNode, Risk } from '../../api/types';
import type { NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { buildImpactOverlay } from '../impact/impact-overlay';

export type ChangeKind = 'modify_body' | 'change_signature' | 'rename' | 'delete' | 'move';

// change.preview result (contracts/rpc/change/preview.result.schema.json).
export interface ChangePreview {
  change: { kind: ChangeKind; node_id: string; new_name?: string; new_parent_id?: string };
  affected: AffectedNode[];
  risk: Risk;
  breakdown: { static_score: number; type_multiplier: number; runtime_bonus: number };
}

interface ChangeState {
  node: NodeRef | null;
  preview: ChangePreview | null;
  summary: string | null;
  summaryError: string | null;
  loading: boolean;
  summarizing: boolean;
  error: string | null;
  dialogFor: NodeRef | null; // the node whose change dialog is open
  openDialog(node: NodeRef): void;
  closeDialog(): void;
  run(node: NodeRef, kind: ChangeKind, extra?: { new_name?: string; new_parent_id?: string }): Promise<void>;
  summarize(): Promise<void>;
  clear(): void;
}

export const useChangeStore = create<ChangeState>()((set, get) => ({
  node: null,
  preview: null,
  summary: null,
  summaryError: null,
  loading: false,
  summarizing: false,
  error: null,
  dialogFor: null,
  openDialog: (node) => set({ dialogFor: node }),
  closeDialog: () => set({ dialogFor: null }),

  async run(node, kind, extra = {}) {
    const pid = useAppStore.getState().projectId;
    if (!pid) return;
    set({ node, loading: true, error: null, summary: null, summaryError: null, dialogFor: null });
    try {
      const preview = await rpc<ChangePreview>('change.preview', { project_id: pid, change: { kind, node_id: node.id, ...extra } });
      const ancestors = await getAncestors(pid, node.id).catch(() => []);
      const overlay = buildImpactOverlay({ root_id: node.id, affected: preview.affected, risk: preview.risk }, ancestors.map((a) => a.id));
      useAppStore.getState().setOverlay('change', { ...overlay, priority: 52 });
      useAppStore.getState().showPanel('bottom', 'change-preview');
      set({ preview, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  // Plain-language risk summary from the AI v2 service (P4-DAIM). Until that service exists the error is shown.
  async summarize() {
    const pid = useAppStore.getState().projectId;
    const preview = get().preview;
    if (!pid || !preview) return;
    set({ summarizing: true, summaryError: null });
    try {
      const r = await invoke<{ markdown: string }>('pv:ai2.changeSummary', { project_id: pid, preview });
      set({ summary: r.markdown, summarizing: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set({
        summarizing: false,
        summaryError: /no .*handler|not registered|no fake handler/i.test(message)
          ? 'AI risk summaries arrive with the AI v2 service; the preview above does not need it.'
          : message,
      });
    }
  },

  clear() {
    useAppStore.getState().setOverlay('change', null);
    set({ node: null, preview: null, summary: null, summaryError: null, error: null, loading: false });
  },
}));
