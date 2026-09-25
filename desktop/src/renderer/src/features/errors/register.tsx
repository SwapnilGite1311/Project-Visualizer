import { useEffect } from 'react';
import { notify } from '../../core/notify';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { startErrorsWatcher, useErrorsStore } from './errors-store';
import { ErrorsPanel } from './ErrorsPanel';
import { PasteErrorDialogHost } from './PasteErrorDialog';

export function ErrorsWatcher() {
  useEffect(() => startErrorsWatcher(), []);
  return null;
}

export function openPasteDialog(): void {
  if (!useAppStore.getState().projectId) {
    notify.info('Open a project first', 'Errors are found on the map of an open project.');
    return;
  }
  useErrorsStore.getState().setDialogOpen(true);
  useAppStore.getState().showPanel('bottom', 'errors');
}

export default function register(app: AppRegistry): void {
  app.addPanel({
    id: 'errors',
    title: 'Errors',
    area: 'bottom',
    order: 40,
    component: ErrorsPanel,
  });
  app.addCommand({
    id: 'errors.paste',
    title: 'Find an error on the map (paste)',
    shortcut: 'Ctrl+Shift+V',
    run: openPasteDialog,
  });
  app.addGlobal({ id: 'paste-error-dialog', component: PasteErrorDialogHost });
  app.addGlobal({ id: 'errors-watcher', component: ErrorsWatcher });
  app.addWelcomeAction({
    id: 'paste-error',
    title: 'Find an error on the map',
    description: 'Paste a stack trace and see where it happened.',
    order: 40,
    run: openPasteDialog,
  });
}
