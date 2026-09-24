import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { LevelIndicator } from './LevelIndicator';
import { clearFocus, focusOn } from './explore-store';
import { startViewStateKeeper } from './view-state';

export function ViewStateKeeper() {
  useEffect(() => startViewStateKeeper(), []);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addNodeAction({ id: 'focus', title: 'Focus on this', order: 30, run: (n) => focusOn(n.id) });
  app.addCommand({ id: 'explore.clearFocus', title: 'Clear focus', shortcut: 'Shift+Escape', run: clearFocus });
  app.addStatusItem({ id: 'level', order: 10, component: LevelIndicator });
  app.addGlobal({ id: 'view-state-keeper', component: ViewStateKeeper });
}
