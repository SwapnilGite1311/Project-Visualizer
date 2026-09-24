import { useEffect } from 'react';
import { closeProject } from '../../api/engine';
import { EngineStatusItem } from '../../api/use-engine-status';
import type { AppRegistry } from '../../core/registry';
import { useAppStore } from '../../core/store';
import { watchEngineRestarts } from './engine-restart';
import { openFolderFlow } from './open-project';
import { WelcomeScreen } from './WelcomeScreen';

function WelcomeScreenHost() {
  return <WelcomeScreen />;
}

function EngineRestartWatcher() {
  useEffect(() => watchEngineRestarts(), []);
  return null;
}

export default function register(app: AppRegistry): void {
  app.addScreen({ id: 'welcome', component: WelcomeScreenHost });
  app.addCommand({ id: 'project.open', title: 'Open folder…', shortcut: 'Ctrl+O', run: () => void openFolderFlow() });
  app.addCommand({
    id: 'project.close',
    title: 'Close project',
    run: async () => {
      const id = useAppStore.getState().projectId;
      if (id) await closeProject(id).catch(() => undefined);
      useAppStore.getState().closedProject();
    },
  });
  app.addStatusItem({ id: 'engine-status', order: 0, component: EngineStatusItem });
  app.addGlobal({ id: 'engine-restart-watcher', component: EngineRestartWatcher });
}
