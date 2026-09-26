import { useEffect } from 'react';
import type { AppRegistry } from '../../core/registry';
import { startFixesWatcher } from './fixes-store';
import { FixesPanel } from './FixesPanel';
import { startLiveSync } from './livesync-store';
import { LiveSyncToggle, toggleLiveSync } from './LiveSyncToggle';

export function LiveSyncWatchers() {
  useEffect(() => startLiveSync(), []);
  useEffect(() => startFixesWatcher(), []);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'fixes', title: 'Fixes', area: 'bottom', order: 45, component: FixesPanel });
  app.addToolbarItem({ id: 'live-sync', order: 45, side: 'right', component: LiveSyncToggle });
  app.addCommand({
    id: 'livesync.toggle',
    title: 'Sync the map with saved files on / off',
    run: toggleLiveSync,
  });
  app.addGlobal({ id: 'livesync-watchers', component: LiveSyncWatchers });
}
