import { callTree, entryPoints } from '../../api/engine';
import type { CallTree } from '../../api/types';
import { useAppStore } from '../../core/store';
import type { Step } from './motion-api';
import { useMotionStore } from './motion-store';

// A pretend run from the static call tree: enter each callee in order, then return.
export function walkthroughSteps(tree: CallTree, rootId: string, maxSteps = 2000): Step[] {
  const nodes = new Map(tree.nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  for (const e of tree.edges) children.set(e.source_id, [...(children.get(e.source_id) ?? []), e.target_id]);
  const steps: Step[] = [];
  const onPath = new Set<string>();
  const push = (kind: Step['kind'], id: string, depth: number) => {
    const n = nodes.get(id);
    steps.push({ i: steps.length, kind, node_id: id, file: n?.file_path ?? '', line: n?.span.start_line ?? 0, depth, t_ns: 0, locals: {}, value: '' });
  };
  const visit = (id: string, depth: number) => {
    if (steps.length >= maxSteps) return;
    onPath.add(id);
    push('call', id, depth);
    for (const child of children.get(id) ?? []) {
      if (!onPath.has(child)) visit(child, depth + 1);
    }
    if (steps.length < maxSteps) push('return', id, depth);
    onPath.delete(id);
  };
  visit(rootId, 0);
  return steps;
}

const RUNNABLE = new Set(['function', 'method', 'module']);

export async function startWalkthrough(node?: { id: string; kind: string }): Promise<void> {
  const pid = useAppStore.getState().projectId;
  if (!pid) return;
  let rootId = node && RUNNABLE.has(node.kind) ? node.id : null;
  if (!rootId) rootId = (await entryPoints(pid))[0]?.node_id ?? null;
  if (!rootId) throw new Error('No entry point found. Right-click a function and choose "Walk through from here".');
  const tree = await callTree(pid, rootId, 4);
  useMotionStore.getState().loadWalkthrough(walkthroughSteps(tree, rootId));
}
