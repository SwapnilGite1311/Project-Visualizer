import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { SimDialogs, simulationActions } from './actions';
import { SandboxBanner } from './SandboxBanner';
import { SimulationPanel } from './SimulationPanel';
import { useSimStore } from './sim-store';

// Inside a sandbox, going to another level shows that level's simulated flows.
export function SimFlowsWatcher() {
  const parentId = useAppStore((s) => s.currentParentId);
  const inside = useSimStore((s) => s.inside);
  const hasResult = useSimStore((s) => s.result !== null);
  useEffect(() => {
    if (inside && hasResult) void useSimStore.getState().refreshFlows();
  }, [parentId, inside, hasResult]);
  return null;
}

export default function register(app: AppRegistry): void {
  for (const action of simulationActions()) app.addNodeAction(action);
  app.addPanel({ id: 'simulation', title: 'Simulation', area: 'bottom', order: 55, component: SimulationPanel });
  app.addGlobal({ id: 'sandbox-banner', component: SandboxBanner });
  app.addGlobal({ id: 'sim-dialogs', component: SimDialogs });
  app.addGlobal({ id: 'sim-flows-watcher', component: SimFlowsWatcher });
  app.addCommand({ id: 'sim.start', title: 'What if…? Open a simulation sandbox', run: () => useSimStore.getState().start() });
  app.addCommand({ id: 'sim.run', title: 'Run the simulation', run: () => useSimStore.getState().run() });
  app.addCommand({ id: 'sim.exit', title: 'Leave the simulation sandbox', run: () => useSimStore.getState().exit() });
}
