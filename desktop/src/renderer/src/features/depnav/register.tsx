import type { AppRegistry } from '../../core/registry';
import { DependenciesPanel } from './DependenciesPanel';
import { useDepnavStore } from './depnav-store';
import { PathDialogHost } from './PathDialogHost';
import { usePathDialog } from './path-dialog-store';

export default function register(app: AppRegistry): void {
  app.addNodeAction({ id: 'deps', title: 'Show dependencies', order: 25, when: (n) => n.kind !== 'project', run: (n) => useDepnavStore.getState().show(n) });
  app.addNodeAction({
    id: 'deps-path',
    title: 'Find path to…',
    order: 26,
    when: (n) => n.kind !== 'project',
    run: (n) => {
      useDepnavStore.getState().setRoot(n);
      usePathDialog.getState().setOpen(true);
    },
  });
  app.addPanel({ id: 'dependencies', title: 'Dependencies', area: 'bottom', order: 20, component: DependenciesPanel });
  app.addCommand({ id: 'deps.clear', title: 'Clear dependency highlight', run: () => useDepnavStore.getState().clear() });
  app.addGlobal({ id: 'path-dialog', component: PathDialogHost });
}
