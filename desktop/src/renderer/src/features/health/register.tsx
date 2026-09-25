import { useEffect } from 'react';
import type { GraphNode } from '../../api/types';
import type { AppRegistry, NodeRef } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { isProblem } from './health-api';
import { startHealthWatcher, useHealthStore } from './health-store';
import { HealthPanel, revealRootCause } from './HealthPanel';

export function HealthWatcher() {
  useEffect(() => startHealthWatcher(), []);
  return null;
}

// The latest state from the engine, else the one the map loaded with the node.
const hasProblem = (n: NodeRef) =>
  isProblem(useHealthStore.getState().states[n.id]?.state ?? (n as Partial<GraphNode>).health);

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'health', title: 'Health', area: 'right', order: 30, component: HealthPanel });
  app.addNodeAction({
    id: 'root-cause',
    title: 'Find root cause',
    order: 27,
    when: hasProblem,
    run: (n) => revealRootCause(n.id),
  });
  app.addCommand({
    id: 'health.rootCause',
    title: 'Find root cause of the selected element',
    shortcut: 'Ctrl+Shift+K', // not Ctrl+Shift+R: Electron's default menu uses it for Force Reload
    run: () => {
      const id = useAppStore.getState().selectedNodeId;
      if (id) return revealRootCause(id);
    },
  });
  app.addGlobal({ id: 'health-watcher', component: HealthWatcher });
}
