// Live file sync: the engine watches the project folder and re-parses saved files; the map follows (graph.changed).
import { create } from 'zustand';
import { onEngineNotification, rpc } from '../../api/bridge';
import { getSetting, setSetting } from '../../api/main';
import { notify } from '../../core/notify';
import type { NodeStyle } from '../../core/overlay';
import { useAppStore } from '../../core/store';

export const SETTING = 'project.liveSync';
export const INTERVAL_SETTING = 'project.liveSyncIntervalMs';
export const HIGHLIGHT_MS = 5000;
export const TOAST_EVERY_MS = 5000;

interface GraphChanged {
  project_id: string;
  files_changed: string[];
  nodes_added: string[];
  nodes_removed: string[];
  nodes_updated: string[];
}

interface LiveSyncState {
  enabled: boolean;
  watching: boolean;
  lastChangeAt: number | null;
  setLiveSync(on: boolean): Promise<void>;
}

const watchable = (id: string | null): id is string => !!id && !id.startsWith('snapshot:');

async function startWatching(pid: string): Promise<void> {
  try {
    const interval = await getSetting<number>(INTERVAL_SETTING, 1000).catch(() => 1000); // unreadable setting: the default
    await rpc('watch.start', { project_id: pid, interval_ms: interval });
    if (useAppStore.getState().projectId === pid) useLiveSync.setState({ watching: true });
  } catch {
    useLiveSync.setState({ watching: false }); // e.g. a project that cannot be watched; the map still works
  }
}

async function stopWatching(pid: string): Promise<void> {
  useLiveSync.setState({ watching: false });
  await rpc('watch.stop', { project_id: pid }).catch(() => undefined); // the project may be closed already
}

export const useLiveSync = create<LiveSyncState>()((set) => ({
  enabled: true,
  watching: false,
  lastChangeAt: null,
  setLiveSync: async (on) => {
    set({ enabled: on });
    await setSetting(SETTING, on).catch(() => undefined);
    const pid = useAppStore.getState().projectId;
    if (!watchable(pid)) return;
    if (on) await startWatching(pid);
    else await stopWatching(pid);
  },
}));

export function startLiveSync(): () => void {
  let highlightTimer: ReturnType<typeof setTimeout> | null = null;
  let lastToast = 0;

  const onOpened = async (pid: string) => {
    const on = await getSetting<boolean>(SETTING, true).catch(() => true);
    useLiveSync.setState({ enabled: on });
    if (on && useAppStore.getState().projectId === pid) await startWatching(pid);
  };

  const offApp = useAppStore.subscribe((s, prev) => {
    if (s.projectId === prev.projectId) return;
    if (watchable(prev.projectId)) void stopWatching(prev.projectId);
    if (watchable(s.projectId)) void onOpened(s.projectId);
  });
  if (watchable(useAppStore.getState().projectId)) void onOpened(useAppStore.getState().projectId!);

  const offChanged = onEngineNotification('graph.changed', (params) => {
    const p = params as GraphChanged;
    const app = useAppStore.getState();
    if (!p || p.project_id !== app.projectId) return;
    useLiveSync.setState({ lastChangeAt: Date.now() });
    app.bumpGraphVersion(); // the map and panels reload the current level
    const nodes: Record<string, NodeStyle> = {};
    for (const id of [...(p.nodes_added ?? []), ...(p.nodes_updated ?? [])])
      nodes[id] = { badge: 'updated' };
    app.setOverlay('changed', { priority: 15, nodes, edges: {} });
    if (highlightTimer) clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
      highlightTimer = null;
      useAppStore.getState().setOverlay('changed', null);
    }, HIGHLIGHT_MS);
    const now = Date.now();
    if (now - lastToast >= TOAST_EVERY_MS) {
      lastToast = now;
      const n = p.files_changed?.length ?? 0;
      notify.info('Map updated', `${n} file${n === 1 ? '' : 's'} changed`);
    }
  });

  return () => {
    offApp();
    offChanged();
    if (highlightTimer) clearTimeout(highlightTimer);
  };
}
