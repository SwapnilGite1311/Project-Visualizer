import { create } from 'zustand';
import { invoke, rpc } from '../../api/bridge';
import { getAncestors } from '../../api/engine';
import type { Overlay } from '../../core/overlay';
import { useAppStore } from '../../core/store';
import { waitForReady } from '../import/wait-ready';

export interface Commit {
  sha: string;
  author: string;
  date: string;
  subject: string;
}

export interface GraphDiff {
  added: string[];
  removed: string[];
  changed: { node_id: string; fields: string[] }[];
  edges_added: number;
  edges_removed: number;
  packages: { node_id: string; added: number; removed: number; changed: number }[];
}

interface Historical {
  sha: string;
  project_id: string;
  path: string;
}

interface TimeTravelState {
  isRepo: boolean | null;
  commits: Commit[];
  selected: string | null;
  historical: Historical | null;
  diff: GraphDiff | null;
  viewing: 'current' | 'historical';
  current: { project_id: string; root: string } | null;
  loading: boolean;
  error: string | null;
  loadCommits(): Promise<void>;
  select(sha: string): Promise<void>;
  showHistorical(): void;
  backToCurrent(): void;
  clear(): Promise<void>;
  // Another project was opened: forget this one (and close its historical copy).
  reset(): Promise<void>;
}

const OVERLAY_ID = 'timetravel';
const NEW = { color: '#22c55e', badge: 'new' };
const CHANGED = { color: '#f97316', badge: 'changed' };
const INSIDE = { borderColor: '#f97316', badge: 'changes inside' };
const MAX_ANCESTOR_LOOKUPS = 200;

// Marks on the current map what is new or changed since the selected commit. Containers of changed elements are
// marked too, so the changes are visible at every level.
export async function buildTimeTravelOverlay(projectId: string, diff: GraphDiff): Promise<Overlay> {
  const nodes: Overlay['nodes'] = {};
  const ids = [...diff.added, ...diff.changed.map((c) => c.node_id)];
  for (const id of ids.slice(0, MAX_ANCESTOR_LOOKUPS)) {
    try {
      for (const a of await getAncestors(projectId, id)) {
        if (a.id !== 'project:' && a.id !== id && !nodes[a.id]) nodes[a.id] = INSIDE;
      }
    } catch {
      // the node disappeared meanwhile: skip its containers
    }
  }
  for (const c of diff.changed) nodes[c.node_id] = CHANGED;
  for (const id of diff.added) nodes[id] = NEW;
  return { priority: 35, nodes, edges: {} };
}

async function closeHistorical(h: Historical | null, root: string | null): Promise<void> {
  if (!h || !root) return;
  await invoke('pv:history.close', { root, path: h.path, project_id: h.project_id }).catch(() => undefined);
}

export const useTimeTravel = create<TimeTravelState>()((set, get) => ({
  isRepo: null,
  commits: [],
  selected: null,
  historical: null,
  diff: null,
  viewing: 'current',
  current: null,
  loading: false,
  error: null,

  async loadCommits() {
    const root = get().current?.root ?? useAppStore.getState().projectRoot;
    if (!root || root.startsWith('snapshot:') || root.startsWith('history:')) {
      set({ isRepo: false, commits: [] });
      return;
    }
    set({ loading: true, error: null });
    try {
      const isRepo = await invoke<boolean>('pv:history.isRepo', { root });
      const commits = isRepo ? await invoke<Commit[]>('pv:history.commits', { root, limit: 200 }) : [];
      set({ isRepo, commits, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  async select(sha) {
    const app = useAppStore.getState();
    const current = get().current ?? (app.projectId && app.projectRoot ? { project_id: app.projectId, root: app.projectRoot } : null);
    if (!current) return;
    set({ selected: sha, loading: true, error: null, diff: null, current });
    try {
      await closeHistorical(get().historical, current.root);
      set({ historical: null });
      const opened = await invoke<{ project_id: string; path: string }>('pv:history.open', { root: current.root, sha });
      const historical = { sha, ...opened };
      set({ historical });
      await waitForReady(opened.project_id, () => undefined);
      const diff = await rpc<GraphDiff>('gdiff.compare', { base_project_id: opened.project_id, head_project_id: current.project_id });
      if (get().selected !== sha) return; // another commit was chosen meanwhile
      set({ diff, loading: false });
      if (get().viewing === 'current') useAppStore.getState().setOverlay(OVERLAY_ID, await buildTimeTravelOverlay(current.project_id, diff));
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  showHistorical() {
    const { historical, current } = get();
    if (!historical || !current) return;
    set({ viewing: 'historical' });
    useAppStore.getState().openedProject(historical.project_id, 'history:' + historical.sha);
  },

  backToCurrent() {
    const { current, diff } = get();
    if (!current) return;
    set({ viewing: 'current' });
    useAppStore.getState().openedProject(current.project_id, current.root);
    if (diff) void buildTimeTravelOverlay(current.project_id, diff).then((o) => useAppStore.getState().setOverlay(OVERLAY_ID, o));
  },

  async clear() {
    const { historical, current, viewing } = get();
    if (viewing === 'historical') get().backToCurrent();
    useAppStore.getState().setOverlay(OVERLAY_ID, null);
    await closeHistorical(historical, current?.root ?? null);
    set({ selected: null, historical: null, diff: null, viewing: 'current', error: null, loading: false });
  },

  async reset() {
    await get().clear();
    set({ current: null, commits: [], isRepo: null });
  },
}));
