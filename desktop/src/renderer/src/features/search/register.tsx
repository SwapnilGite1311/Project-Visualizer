import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { SearchPanel } from './SearchPanel';
import { searchBus } from './search-bus';

export default function register(app: AppRegistry): void {
  app.addPanel({ id: 'search', title: 'Search', area: 'left', order: 10, component: SearchPanel });
  app.addCommand({
    id: 'search.focus',
    title: 'Search',
    shortcut: 'Ctrl+F',
    run: () => {
      useAppStore.getState().showPanel('left', 'search');
      setTimeout(() => searchBus.focus(), 0);
    },
  });
}
