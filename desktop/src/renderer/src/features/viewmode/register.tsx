import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { ViewModeToggle } from './ViewModeToggle';

export function toggleViewMode(): void {
  const { viewMode, setViewMode } = useAppStore.getState();
  setViewMode(viewMode === '2d' ? '3d' : '2d');
}

export default function register(app: AppRegistry): void {
  app.addToolbarItem({ id: 'view-mode', order: 50, side: 'right', component: ViewModeToggle });
  app.addCommand({ id: 'view.toggle3d', title: 'Toggle 2D / 3D', shortcut: 'Ctrl+Shift+3', run: toggleViewMode });
}
