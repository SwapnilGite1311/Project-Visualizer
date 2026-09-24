import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { Breadcrumb } from './Breadcrumb';
import { goBack, goForward, goHome, goUp, startNavigationTracking } from './nav-store';
import { NavButtons } from './NavButtons';

function NavTracker() {
  useEffect(() => startNavigationTracking(), []);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addToolbarItem({ id: 'nav-buttons', order: 10, side: 'left', component: NavButtons });
  app.addToolbarItem({ id: 'breadcrumb', order: 20, side: 'left', component: Breadcrumb });
  app.addCommand({ id: 'nav.back', title: 'Go back', shortcut: 'Alt+ArrowLeft', run: goBack });
  app.addCommand({ id: 'nav.forward', title: 'Go forward', shortcut: 'Alt+ArrowRight', run: goForward });
  app.addCommand({ id: 'nav.up', title: 'Go up one level', shortcut: 'Alt+ArrowUp', run: () => goUp() });
  app.addCommand({ id: 'nav.home', title: 'Go to project overview', shortcut: 'Alt+Home', run: goHome });
  app.addGlobal({ id: 'nav-tracking', component: NavTracker });
}
