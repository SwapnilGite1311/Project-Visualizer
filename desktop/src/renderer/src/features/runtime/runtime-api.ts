// Typed calls for the runtime feature (contracts/rpc/runtime, rtsync, modtrace and the pv:runtime.* channels).
import { invoke, rpc } from '../../api/bridge';
import type { GraphEdge, GraphNode, Health } from '../../api/types';

export interface LiveStats {
  calls: number;
  errors: number;
  stalls: number;
  p95_ms: number;
  health: Health;
}

export interface Flow {
  source_id: string;
  target_id: string;
  count: number;
  edge_id: string;
}

export interface LiveLevelView {
  parent: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
  live: Record<string, LiveStats>;
  flows: Flow[];
}

export interface TraceStep {
  event_id: string;
  span_id: string;
  parent_span_id: string | null;
  node_id: string;
  name: string;
  kind: string;
  start_ns: number;
  duration_ns: number;
  status: 'ok' | 'error';
}

export interface TraceSummary {
  trace_id: string;
  root_name: string;
  start_ns: number;
  duration_ns: number;
  spans: number;
  errors: number;
}

export interface Crossing {
  from_id: string;
  to_id: string;
  count: number;
  avg_ms: number;
  errors: number;
  stalls: number;
  loops: number;
}

export interface Hop {
  from_id: string;
  to_id: string;
  start_ns: number;
  duration_ns: number;
  status: 'ok' | 'error';
}

export interface RuntimeStatus {
  project_id: string;
  active: boolean;
  events_total: number;
  events_buffered: number;
  last_event_ms: number;
  services: string[];
}

export interface HubInfo {
  url: string;
  token: string;
  running: boolean;
  port: number | null;
  received: number;
  rejected: number;
  unauthorized: number;
  forwarded: number;
  dropped_no_project: number;
  dropped_other_root: number;
  dropped_overflow: number;
  errors: number;
}

export const runtimeStatus = (pid: string) =>
  rpc<RuntimeStatus>('runtime.status', { project_id: pid });
export const clearRuntime = (pid: string) => rpc<unknown>('runtime.clear', { project_id: pid });
export const getTrace = (pid: string, traceId: string) =>
  rpc<{ trace_id: string; steps: TraceStep[] }>('runtime.trace', {
    project_id: pid,
    trace_id: traceId,
  });

export async function recentTraces(pid: string, limit?: number): Promise<TraceSummary[]> {
  return (
    await rpc<{ traces: TraceSummary[] }>('runtime.recent_traces', {
      project_id: pid,
      ...(limit ? { limit } : {}),
    })
  ).traces;
}

export const liveLevelView = (pid: string, parentId: string, windowMs?: number) =>
  rpc<LiveLevelView>('rtsync.level_view', {
    project_id: pid,
    parent_id: parentId,
    ...(windowMs ? { window_ms: windowMs } : {}),
  });

export async function boundaries(pid: string, windowMs?: number): Promise<Crossing[]> {
  return (
    await rpc<{ crossings: Crossing[] }>('modtrace.boundaries', {
      project_id: pid,
      ...(windowMs ? { window_ms: windowMs } : {}),
    })
  ).crossings;
}

export async function follow(
  pid: string,
  traceId: string,
  direction: 'forward' | 'backward',
  fromNodeId?: string,
): Promise<Hop[]> {
  const params = {
    project_id: pid,
    trace_id: traceId,
    direction,
    ...(fromNodeId ? { from_node_id: fromNodeId } : {}),
  };
  return (await rpc<{ hops: Hop[] }>('modtrace.follow', params)).hops;
}

export const hubInfo = () => invoke<HubInfo>('pv:runtime.hubInfo');
export const setActiveProject = (pid: string | null, root: string | null) =>
  invoke<{ ok: boolean }>('pv:runtime.setActiveProject', { project_id: pid, root });
export async function regenerateToken(): Promise<string> {
  return (await invoke<{ token: string }>('pv:runtime.regenerateToken')).token;
}
