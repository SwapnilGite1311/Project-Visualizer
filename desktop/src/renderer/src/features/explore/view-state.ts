import { getNode } from '../../api/engine';
import { getSetting, setSetting } from '../../api/main';
import { useAppStore } from '../../core/store';

export const SAVE_DELAY_MS = 500;

interface ViewState {
  parentId: string;
  selectedId: string | null;
}

const key = (root: string) => 'project.viewState.' + root;

// Restores the last level and selection when a project opens, and saves them while it stays open.
export function startViewStateKeeper(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // No saving while a restore is in flight, so the default level cannot overwrite the saved one.
  let restoring = false;

  const restore = async (projectId: string, root: string) => {
    restoring = true;
    try {
      const saved = await getSetting<ViewState | null>(key(root), null);
      if (!saved?.parentId || useAppStore.getState().projectId !== projectId) return;
      try {
        await getNode(projectId, saved.parentId);
      } catch {
        return; // the saved level no longer exists
      }
      if (useAppStore.getState().projectId !== projectId) return;
      const app = useAppStore.getState();
      app.setParent(saved.parentId);
      app.select(saved.selectedId ?? null);
    } catch {
      // settings unavailable: keep the default view
    } finally {
      restoring = false;
    }
  };

  const unsubscribe = useAppStore.subscribe((s, prev) => {
    if (s.projectId && s.projectRoot && s.projectId !== prev.projectId) {
      clearTimeout(timer);
      void restore(s.projectId, s.projectRoot);
      return;
    }
    if (!s.projectId || !s.projectRoot || restoring) return;
    if (s.currentParentId === prev.currentParentId && s.selectedNodeId === prev.selectedNodeId) return;
    const root = s.projectRoot;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const now = useAppStore.getState();
      if (now.projectRoot !== root) return;
      void setSetting(key(root), { parentId: now.currentParentId, selectedId: now.selectedNodeId }).catch(() => undefined);
    }, SAVE_DELAY_MS);
  });

  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}
