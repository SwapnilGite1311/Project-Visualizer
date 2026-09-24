// Test helpers: small graph nodes, edges and level views.
import type { EdgeKind, GraphEdge, GraphNode, LevelView, NodeKind } from '../api/types';

export function gnode(id: string, kind: NodeKind, loc = 10, parent = 'project:'): GraphNode {
  const name = id.slice(Math.max(id.lastIndexOf(':'), id.lastIndexOf('#'), id.lastIndexOf('/')) + 1);
  return {
    id,
    kind,
    name,
    qualified_name: name,
    file_path: '',
    language: 'python',
    span: { start_line: 1, start_col: 0, end_line: loc, end_col: 0 },
    level: 1,
    parent_id: parent,
    metrics: { loc, complexity: 1, fan_in: 0, fan_out: 0 },
    health: 'unknown',
  };
}

export function gedge(source: string, target: string, kind: EdgeKind = 'calls', weight = 1): GraphEdge {
  return { id: `agg|${kind}|${source}|${target}`, kind, source_id: source, target_id: target, weight, resolved: true };
}

export function levelView(nodes: GraphNode[], edges: GraphEdge[] = [], parent = gnode('project:', 'project')): LevelView {
  return { parent, nodes, edges };
}
