import { getNode } from '../../api/engine';
import { notify } from '../../core/notify';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useExplainStore } from './explain-store';
import { ExplainPanel } from './ExplainPanel';

async function explainSelected(): Promise<void> {
  const { projectId, selectedNodeId } = useAppStore.getState();
  if (!projectId || !selectedNodeId) {
    notify.info('Select an element first');
    return;
  }
  const node = await getNode(projectId, selectedNodeId);
  await useExplainStore.getState().explain(node);
}

export default function register(app: AppRegistry): void {
  app.addNodeAction({ id: 'explain', title: 'Explain this', order: 10, run: (n) => useExplainStore.getState().explain(n) });
  app.addPanel({ id: 'explanation', title: 'Explanation', area: 'right', order: 20, component: ExplainPanel });
  app.addCommand({ id: 'explain.selected', title: 'Explain selected element', shortcut: 'Ctrl+E', run: explainSelected });
}
