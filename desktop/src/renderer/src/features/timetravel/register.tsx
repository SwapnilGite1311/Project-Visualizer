import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { HistoryBanner } from './HistoryBanner';
import { TimeTravelPanel } from './TimeTravelPanel';

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'history', title: 'History', area: 'bottom', order: 50, component: TimeTravelPanel });
  app.addGlobal({ id: 'history-banner', component: HistoryBanner });
  app.addCommand({
    id: 'history.open',
    title: 'Show project history',
    shortcut: 'Ctrl+Shift+H',
    run: () => useAppStore.getState().showPanel('bottom', 'history'),
  });
}
