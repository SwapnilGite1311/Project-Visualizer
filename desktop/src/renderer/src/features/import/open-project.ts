import { openProject } from '../../api/engine';
import { getSetting, openFolderDialog } from '../../api/main';
import { notify } from '../../core/notify';
import { useAppStore } from '../../core/store';
import { useImportStore } from './import-store';
import { addRecentProject } from './recent-projects';
import { waitForReady } from './wait-ready';

export async function openProjectFlow(root: string): Promise<boolean> {
  const imp = useImportStore.getState();
  const app = useAppStore.getState();
  imp.setLoading(true);
  imp.setRoot(root);
  imp.setError(null);
  imp.setProgress(null);
  app.setProjectState('scanning');
  try {
    const excludes = await getSetting<string[]>('project.excludeGlobs', []);
    const id = await openProject(root, excludes);
    await waitForReady(id, (p) => {
      useImportStore.getState().setProgress(p);
      useAppStore.getState().setProjectState(p.state);
    });
    useAppStore.getState().openedProject(id, root);
    useAppStore.getState().setProjectState('ready');
    await addRecentProject(root);
    useImportStore.getState().setLoading(false);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    notify.error('Could not open project', message);
    useImportStore.getState().setError(message);
    useImportStore.getState().setLoading(false);
    useAppStore.getState().setProjectState('error');
    return false;
  }
}

export async function openFolderFlow(): Promise<boolean> {
  const root = await openFolderDialog();
  if (root === null) return false;
  return openProjectFlow(root);
}
