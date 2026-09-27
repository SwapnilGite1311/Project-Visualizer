import { getNode } from '../../api/engine';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useExplainStore } from '../explain/explain-store';
import { DASHBOARDS } from './definitions';
import { IntroCard } from './IntroCard';

// "Explain this project": the AI explanation of the whole project, in the Explanation panel.
export async function explainProject(): Promise<void> {
  const pid = useAppStore.getState().projectId;
  if (!pid) return;
  const root = await getNode(pid, 'project:');
  await useExplainStore.getState().explain({
    id: root.id,
    kind: root.kind,
    name: root.name,
    qualified_name: root.qualified_name,
    file_path: root.file_path,
    span: root.span,
  });
}

export default function register(app: AppRegistry): void {
  DASHBOARDS.forEach((d, i) => {
    const def = { id: d.id, title: d.title, icon: d.icon, description: d.description, order: d.order, panels: d.panels, start: d.start };
    app.addWorkspace(def);
    app.addCommand({
      id: `workspace.${def.id}`,
      title: `Go to the ${def.title} dashboard`,
      shortcut: `Ctrl+${i + 1}`,
      run: () => useAppStore.getState().setWorkspace(def.id, def.start),
    });
  });
  app.addCommand({ id: 'workspaces.explainProject', title: 'Explain this project', run: explainProject });
  app.addGlobal({ id: 'dashboard-intro', component: () => <IntroCard /> });
}
