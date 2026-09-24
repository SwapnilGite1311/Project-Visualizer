// TypeScript mirrors of the Phase 1 contracts (contracts/common and contracts/rpc).
export type NodeKind =
  | 'project'
  | 'package'
  | 'module'
  | 'class'
  | 'function'
  | 'method'
  | 'variable'
  | 'statement'
  | 'external';
export type EdgeKind = 'imports' | 'calls' | 'inherits' | 'references';
export type Health = 'unknown' | 'ok' | 'warning' | 'stalled' | 'error';
export type ProjectState = 'idle' | 'scanning' | 'parsing' | 'linking' | 'ready' | 'error';

export interface Span { start_line: number; start_col: number; end_line: number; end_col: number }
export interface Metrics { loc: number; complexity: number; fan_in: number; fan_out: number }

export interface GraphNode {
  id: string;
  kind: NodeKind;
  name: string;
  qualified_name: string;
  file_path: string;
  language: string;
  span: Span;
  level: number;
  parent_id: string;
  metrics: Metrics;
  health: Health;
}

export interface GraphEdge {
  id: string;
  kind: EdgeKind;
  source_id: string;
  target_id: string;
  weight: number;
  resolved: boolean;
}

export interface LevelView { parent: GraphNode; nodes: GraphNode[]; edges: GraphEdge[] }

export interface ProjectStatus {
  project_id: string;
  root_path: string;
  state: ProjectState;
  files_total: number;
  files_done: number;
  error_message: string;
}

export interface ProgressParams { project_id: string; state: ProjectState; files_total: number; files_done: number }

export interface SourceResult { file_path: string; language: string; text: string; span: Span }

export interface AffectedNode {
  node_id: string;
  distance: number;
  via: EdgeKind;
  from_id: string;
  ancestor_ids: string[];
}
export interface Risk { score: number; level: 'low' | 'medium' | 'high' | 'critical'; factors: string[] }
export interface ImpactResult { root_id: string; affected: AffectedNode[]; risk: Risk }

export interface NodeRefLite { id: string; kind: NodeKind; name: string }
export interface NodeRefFile extends NodeRefLite { file_path: string }

export interface ContextPack {
  node: GraphNode;
  source: string;
  source_truncated: boolean;
  parent: NodeRefLite | null;
  children: NodeRefLite[];
  callers: NodeRefFile[];
  callees: NodeRefFile[];
  imports: NodeRefLite[];
  related_node_ids: string[];
  approx_tokens: number;
}

export interface SearchHit {
  node_id: string;
  name: string;
  kind: NodeKind;
  file_path: string;
  qualified_name: string;
  score: number;
}

export interface Summary {
  root_path: string;
  files: number;
  total_loc: number;
  languages: { id: string; files: number; loc: number }[];
  counts: Record<NodeKind, number>;
  externals: string[];
  largest_modules: { node_id: string; name: string; loc: number }[];
  largest_packages: { node_id: string; name: string; loc: number; modules: number }[];
  syntax_error_files: string[];
  parse_errors: string[];
}

export interface Hotspot {
  node_id: string;
  kind: NodeKind;
  name: string;
  file_path: string;
  score: number;
  reasons: string[];
  metrics: Metrics;
}

export interface EntryPoint { node_id: string; reasons: string[] }

export interface PackageBoundary {
  node_id: string;
  name: string;
  internal_edges: number;
  outgoing_edges: number;
  incoming_edges: number;
  instability: number;
}

export interface CallTree { root_id: string; nodes: GraphNode[]; edges: GraphEdge[] }

export interface LanguageInfo { id: string; extensions: string[] }
