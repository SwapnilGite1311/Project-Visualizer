import { rpc } from '../../api/bridge';
import type { EdgeKind, GraphEdge } from '../../api/types';

export type Direction = 'in' | 'out' | 'both';

export interface NeighborItem {
  node_id: string;
  distance: number;
  direction: 'in' | 'out';
  ancestor_ids: string[];
}

export interface NeighborsResult {
  root_id: string;
  items: NeighborItem[];
  edges: GraphEdge[];
}

export interface PathResult {
  found: boolean;
  node_ids: string[];
  edge_ids: string[];
}

export interface Cycle {
  node_ids: string[];
}

export const neighbors = (pid: string, nodeId: string, direction: Direction, depth: number, kinds?: EdgeKind[]) =>
  rpc<NeighborsResult>('deps.neighbors', { project_id: pid, node_id: nodeId, direction, depth, ...(kinds ? { kinds } : {}) });

export const findPath = (pid: string, fromId: string, toId: string, maxDepth?: number) =>
  rpc<PathResult>('deps.path', { project_id: pid, from_id: fromId, to_id: toId, ...(maxDepth ? { max_depth: maxDepth } : {}) });

export async function cycles(pid: string, level: number, limit?: number): Promise<Cycle[]> {
  return (await rpc<{ cycles: Cycle[] }>('deps.cycles', { project_id: pid, level, ...(limit ? { limit } : {}) })).cycles;
}
