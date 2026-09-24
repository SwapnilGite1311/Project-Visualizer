import type { AppRegistry } from '../../core/registry';
import { useImpactStore } from './impact-store';
import { ImpactPanel } from './ImpactPanel';

export default function register(app: AppRegistry): void {
  app.addNodeAction({
    id: 'impact',
    title: 'What breaks if I change this?',
    order: 20,
    when: (n) => n.kind !== 'project' && n.kind !== 'external',
    run: (n) => useImpactStore.getState().run(n),
  });
  app.addPanel({ id: 'impact', title: 'Impact', area: 'bottom', order: 10, component: ImpactPanel });
  app.addCommand({
    id: 'impact.clear',
    title: 'Clear impact highlight',
    shortcut: 'Escape',
    run: () => useImpactStore.getState().clear(),
  });
}
