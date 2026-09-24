import { getAncestors } from '../api/engine';
import { useAppStore } from '../core/store';

export async function revealNode(nodeId: string): Promise<void> {
  const pid = useAppStore.getState().projectId;
  if (!pid) return;
  const nodes = await getAncestors(pid, nodeId);
  const parent = nodes.length >= 2 ? nodes[nodes.length - 2].id : 'project:';
  useAppStore.getState().setParent(parent);
  useAppStore.getState().select(nodeId);
}
