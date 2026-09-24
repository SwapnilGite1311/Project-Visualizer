import { rpc } from './bridge';
import type {
  CallTree,
  ContextPack,
  EdgeKind,
  EntryPoint,
  GraphEdge,
  GraphNode,
  Hotspot,
  ImpactResult,
  LanguageInfo,
  LevelView,
  NodeKind,
  PackageBoundary,
  ProjectStatus,
  SearchHit,
  SourceResult,
  Summary,
} from './types';

// Drops keys whose value is undefined so optional params are omitted.
function params(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const ping = () => rpc<{ version: string; protocol: number }>('engine.ping', {});
export const listLanguages = async () => (await rpc<{ languages: LanguageInfo[] }>('lang.list', {})).languages;

export async function openProject(rootPath: string, excludeGlobs?: string[]): Promise<string> {
  const r = await rpc<{ project_id: string }>('project.open', params({ root_path: rootPath, exclude_globs: excludeGlobs }));
  return r.project_id;
}
export const projectStatus = (projectId: string) => rpc<ProjectStatus>('project.status', { project_id: projectId });
export const closeProject = (projectId: string) => rpc<{ ok: true }>('project.close', { project_id: projectId });

export const getNode = (projectId: string, nodeId: string) =>
  rpc<GraphNode>('graph.node', { project_id: projectId, node_id: nodeId });
export async function getChildren(projectId: string, nodeId: string): Promise<GraphNode[]> {
  return (await rpc<{ nodes: GraphNode[] }>('graph.children', { project_id: projectId, node_id: nodeId })).nodes;
}
export const getLevelView = (projectId: string, parentId?: string) =>
  rpc<LevelView>('graph.level_view', params({ project_id: projectId, parent_id: parentId }));
export async function getEdges(
  projectId: string,
  nodeId: string,
  direction?: 'in' | 'out' | 'both',
  kinds?: EdgeKind[],
): Promise<GraphEdge[]> {
  const r = await rpc<{ edges: GraphEdge[] }>(
    'graph.edges',
    params({ project_id: projectId, node_id: nodeId, direction, kinds }),
  );
  return r.edges;
}
export const getSource = (projectId: string, nodeId: string) =>
  rpc<SourceResult>('graph.source', { project_id: projectId, node_id: nodeId });
export async function getAncestors(projectId: string, nodeId: string): Promise<GraphNode[]> {
  return (await rpc<{ nodes: GraphNode[] }>('graph.ancestors', { project_id: projectId, node_id: nodeId })).nodes;
}

export const analyzeImpact = (projectId: string, nodeId: string, maxDepth?: number) =>
  rpc<ImpactResult>('impact.analyze', params({ project_id: projectId, node_id: nodeId, max_depth: maxDepth }));
export const contextForNode = (projectId: string, nodeId: string, maxChars?: number) =>
  rpc<ContextPack>('context.for_node', params({ project_id: projectId, node_id: nodeId, max_chars: maxChars }));

export async function search(projectId: string, text: string, kinds?: NodeKind[], limit?: number): Promise<SearchHit[]> {
  const r = await rpc<{ results: SearchHit[] }>('search.query', params({ project_id: projectId, text, kinds, limit }));
  return r.results;
}
export async function suggest(projectId: string, prefix: string, limit?: number): Promise<string[]> {
  const r = await rpc<{ suggestions: string[] }>('search.suggest', params({ project_id: projectId, prefix, limit }));
  return r.suggestions;
}

export const summary = (projectId: string) => rpc<Summary>('analysis.summary', { project_id: projectId });
export async function hotspots(projectId: string, limit?: number): Promise<Hotspot[]> {
  return (await rpc<{ hotspots: Hotspot[] }>('analysis.hotspots', params({ project_id: projectId, limit }))).hotspots;
}
export async function entryPoints(projectId: string): Promise<EntryPoint[]> {
  return (await rpc<{ entry_points: EntryPoint[] }>('analysis.entry_points', { project_id: projectId })).entry_points;
}
export async function boundaries(projectId: string): Promise<PackageBoundary[]> {
  return (await rpc<{ packages: PackageBoundary[] }>('analysis.boundaries', { project_id: projectId })).packages;
}
export const callTree = (projectId: string, nodeId: string, depth?: number) =>
  rpc<CallTree>('analysis.call_tree', params({ project_id: projectId, node_id: nodeId, depth }));
