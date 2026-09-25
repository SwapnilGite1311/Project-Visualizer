import { onMainEvent, rpc } from '../../api/bridge';
import type { GraphNode } from '../../api/types';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';
import { useExplainStore } from '../explain/explain-store';

async function nodeAt(payload: unknown): Promise<GraphNode | null> {
  const pid = useAppStore.getState().projectId;
  const { file_path, line } = payload as { file_path: string; line: number };
  if (!pid) {
    notify.info('Open a project first', 'Project Visualizer has no project open.');
    return null;
  }
  const { node } = await rpc<{ node: GraphNode | null }>('locate.node_at', { project_id: pid, file_path, line });
  if (!node) notify.info('That file is not part of the open project');
  return node;
}

// Requests from the VS Code extension: show a file and line on the map, or explain it.
export function startBridgeWatcher(): () => void {
  const offReveal = onMainEvent('pv:bridge.reveal', (p) => {
    void nodeAt(p).then((n) => n && revealNode(n.id));
  });
  const offExplain = onMainEvent('pv:bridge.explain', (p) => {
    void nodeAt(p).then(async (n) => {
      if (!n) return;
      await revealNode(n.id);
      await useExplainStore.getState().explain(n);
    });
  });
  return () => {
    offReveal();
    offExplain();
  };
}
