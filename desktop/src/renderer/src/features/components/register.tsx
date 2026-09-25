import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { componentActions } from './actions';
import { HoverCard } from './HoverCard';
import { PinnedPanel } from './PinnedPanel';
import { installPointerTracking } from './pointer';
import { startStateTracking } from './states-store';

export function StatesTracker() {
  useEffect(() => {
    const stopPointer = installPointerTracking();
    const stopStates = startStateTracking();
    return () => {
      stopPointer();
      stopStates();
    };
  }, []);
  return null;
}

export default function register(app: AppRegistry): void {
  for (const action of componentActions()) app.addNodeAction(action);
  app.addPanel({ id: 'pinned', title: 'Pinned', area: 'left', order: 30, component: PinnedPanel });
  app.addGlobal({ id: 'hover-card', component: HoverCard });
  app.addGlobal({ id: 'component-states', component: StatesTracker });
}
