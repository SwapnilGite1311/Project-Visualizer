import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { useLiveOverlaySync } from './live-overlay';
import { startLiveWatcher } from './live-store';
import { LiveToggle, toggleLive } from './LiveToggle';
import { setActiveProject } from './runtime-api';
import { clearRuntimeData, RuntimePanel } from './RuntimePanel';

// Tells the receiver which project events belong to, keeps the live view fresh and draws it on the map.
export function RuntimeWatchers() {
  const projectId = useAppStore((s) => s.projectId);
  const projectRoot = useAppStore((s) => s.projectRoot);
  useEffect(() => {
    setActiveProject(projectId, projectRoot).catch(() => undefined);
  }, [projectId, projectRoot]);
  useEffect(() => startLiveWatcher(), []);
  useLiveOverlaySync();
  return null;
}

export default function register(app: AppRegistry): void {
  app.addPanel({
    id: 'runtime',
    title: 'Runtime',
    area: 'bottom',
    order: 30,
    component: RuntimePanel,
  });
  app.addToolbarItem({ id: 'live-toggle', order: 40, side: 'right', component: LiveToggle });
  app.addCommand({
    id: 'runtime.toggle',
    title: 'Live view on / off',
    shortcut: 'Ctrl+Shift+L',
    run: toggleLive,
  });
  app.addCommand({ id: 'runtime.clear', title: 'Clear runtime data', run: clearRuntimeData });
  app.addGlobal({ id: 'runtime-watchers', component: RuntimeWatchers });
}
