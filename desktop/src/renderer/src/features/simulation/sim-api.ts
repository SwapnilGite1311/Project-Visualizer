import { rpc } from '../../api/bridge';

// contracts/rpc/sim/*
export type SimChangeKind = 'delete_node' | 'remove_edge' | 'add_edge' | 'set_latency' | 'set_error_rate' | 'rename' | 'move';
export interface SimChange {
  kind: SimChangeKind;
  node_id?: string;
  source_id?: string;
  target_id?: string;
  edge_kind?: string;
  factor?: number;
  rate?: number;
  new_name?: string;
  new_parent_id?: string;
}
export interface SimRunResult {
  mode: 'replay' | 'static';
  traces_total: number;
  traces_failed_real: number;
  traces_failed_sim: number;
  latency_p95_real_ms: number;
  latency_p95_sim_ms: number;
  node_effects: Array<{ node_id: string; calls: number; failures_real: number; failures_sim: number; p95_real_ms: number; p95_sim_ms: number }>;
  failed_trace_ids: string[];
  broken_node_ids: string[];
}
export interface SimFlow {
  source_id: string;
  target_id: string;
  count: number;
  failed: number;
  edge_id: string;
}
export interface SandboxInfo {
  sandbox_id: string;
  view_project_id: string;
  label: string;
  changes_count: number;
  created_ms: number;
}

export const simCreate = (projectId: string, label?: string) =>
  rpc<{ sandbox_id: string; view_project_id: string }>('sim.create', { project_id: projectId, ...(label ? { label } : {}) });
export const simApply = (sandboxId: string, change: SimChange) =>
  rpc<{ ok: true; changes_count: number; affected: string[] }>('sim.apply', { sandbox_id: sandboxId, change });
export const simRun = (sandboxId: string, traceLimit?: number) =>
  rpc<SimRunResult>('sim.run', { sandbox_id: sandboxId, ...(traceLimit ? { scenario: { trace_limit: traceLimit } } : {}) });
export const simFlows = async (sandboxId: string, parentId?: string) =>
  (await rpc<{ flows: SimFlow[] }>('sim.flows', { sandbox_id: sandboxId, ...(parentId ? { parent_id: parentId } : {}) })).flows;
export const simList = async (projectId: string) => (await rpc<{ sandboxes: SandboxInfo[] }>('sim.list', { project_id: projectId })).sandboxes;
export const simDiscard = (sandboxId: string) => rpc<{ ok: true }>('sim.discard', { sandbox_id: sandboxId });
