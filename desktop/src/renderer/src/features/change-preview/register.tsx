import type { AppRegistry } from '../../core/registry';
import { ChangeDialog } from './ChangeDialog';
import { ChangePanel } from './ChangePanel';
import { useChangeStore } from './change-store';

export default function register(app: AppRegistry): void {
  app.addNodeAction({
    id: 'change-preview',
    title: 'Preview a change…',
    order: 21,
    when: (n) => n.kind !== 'project' && n.kind !== 'external',
    run: (n) => useChangeStore.getState().openDialog(n),
  });
  app.addPanel({ id: 'change-preview', title: 'Change preview', area: 'bottom', order: 15, component: ChangePanel });
  app.addCommand({ id: 'change.clear', title: 'Clear the change preview', run: () => useChangeStore.getState().clear() });
  app.addGlobal({ id: 'change-dialog', component: ChangeDialog });
}
