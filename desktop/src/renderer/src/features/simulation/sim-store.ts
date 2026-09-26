import { create } from 'zustand';
import type { NodeStyle, Overlay } from '../../core/overlay';
import { useAppStore } from '../../core/store';
import { useRecommendInputs } from '../recommend/recommend-inputs';
import { type SimChange, type SimFlow, type SimRunResult, simApply, simCreate, simDiscard, simFlows, simRun } from './sim-api';

export interface ActiveSandbox {
  sandbox_id: string;
  view_project_id: string;
  label: string;
  base_project_id: string;
  base_root: string;
}

interface SimState {
  active: ActiveSandbox | null;
  inside: boolean; // the map shows the sandbox (not the real project)
  changes: SimChange[];
  result: SimRunResult | null;
  flows: SimFlow[];
  loading: boolean;
  error: string | null;
  start(label?: string): Promise<void>;
  apply(change: SimChange): Promise<void>;
  run(): Promise<void>;
  refreshFlows(): Promise<void>;
  enter(): void;
  exit(): void;
  discard(): Promise<void>;
}

export const SIM_OVERLAY = 'sim';
export const isSandboxRoot = (root: string | null | undefined) => Boolean(root?.startsWith('sim:'));

// How the sandbox differs from reality, drawn on the sandbox map.
export function buildSimOverlay(changes: SimChange[], result: SimRunResult | null, flows: SimFlow[]): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  const edges: Overlay['edges'] = {};
  for (const id of result?.broken_node_ids ?? []) nodes[id] = { color: '#ef4444', pulse: true };
  for (const c of changes) {
    if (!c.node_id) continue;
    if (c.kind === 'delete_node') nodes[c.node_id] = { ...nodes[c.node_id], opacity: 0.3, badge: 'removed' };
    if (c.kind === 'set_latency') nodes[c.node_id] = { ...nodes[c.node_id], color: '#f97316', badge: `x${c.factor}` };
    if (c.kind === 'set_error_rate') nodes[c.node_id] = { ...nodes[c.node_id], color: '#ef4444', badge: `${Math.round((c.rate ?? 0) * 100)}% fail` };
  }
  for (const f of flows) {
    if (f.edge_id) edges[f.edge_id] = { animated: true, color: f.failed > 0 ? '#ef4444' : '#22c55e' };
  }
  return { priority: 62, nodes, edges };
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const useSimStore = create<SimState>()((set, get) => {
  const redraw = () => {
    const { changes, result, flows, inside } = get();
    if (inside) useAppStore.getState().setOverlay(SIM_OVERLAY, buildSimOverlay(changes, result, flows));
  };
  return {
    active: null,
    inside: false,
    changes: [],
    result: null,
    flows: [],
    loading: false,
    error: null,

    async start(label) {
      const app = useAppStore.getState();
      if (!app.projectId || !app.projectRoot || isSandboxRoot(app.projectRoot)) return;
      const name = (label ?? '').trim() || 'what-if';
      set({ loading: true, error: null });
      try {
        const created = await simCreate(app.projectId, name);
        set({
          active: { ...created, label: name, base_project_id: app.projectId, base_root: app.projectRoot },
          inside: true,
          changes: [],
          result: null,
          flows: [],
          loading: false,
        });
        useAppStore.getState().openedProject(created.view_project_id, 'sim:' + name);
        useAppStore.getState().showPanel('bottom', 'simulation');
        redraw();
      } catch (e) {
        set({ loading: false, error: message(e) });
      }
    },

    async apply(change) {
      const active = get().active;
      if (!active) return;
      set({ error: null });
      try {
        await simApply(active.sandbox_id, change);
        set({ changes: [...get().changes, change], result: null });
        useAppStore.getState().bumpGraphVersion();
        redraw();
      } catch (e) {
        set({ error: message(e) });
      }
    },

    async run() {
      const active = get().active;
      if (!active) return;
      set({ loading: true, error: null });
      try {
        const result = await simRun(active.sandbox_id);
        set({ result, loading: false });
        useRecommendInputs.getState().setSimulation(result);
        await get().refreshFlows();
        redraw();
      } catch (e) {
        set({ loading: false, error: message(e) });
      }
    },

    async refreshFlows() {
      const active = get().active;
      if (!active || !get().inside) return;
      try {
        set({ flows: await simFlows(active.sandbox_id, useAppStore.getState().currentParentId) });
        redraw();
      } catch {
        set({ flows: [] });
      }
    },

    enter() {
      const active = get().active;
      if (!active) return;
      set({ inside: true });
      useAppStore.getState().openedProject(active.view_project_id, 'sim:' + active.label);
      redraw();
    },

    exit() {
      const active = get().active;
      if (!active) return;
      set({ inside: false });
      useAppStore.getState().openedProject(active.base_project_id, active.base_root);
    },

    async discard() {
      const active = get().active;
      if (!active) return;
      if (get().inside) get().exit();
      await simDiscard(active.sandbox_id).catch(() => undefined);
      set({ active: null, inside: false, changes: [], result: null, flows: [], error: null });
    },
  };
});
