// Fix tracking: an error whose file was saved is "fix pending"; 3 good runs make it "fixed"; the same error again, "regressed".
import { create } from 'zustand';
import { onEngineNotification, rpc } from '../../api/bridge';
import { notify } from '../../core/notify';
import type { NodeStyle, Overlay } from '../../core/overlay';
import { useAppStore } from '../../core/store';
import { shortLabel } from '../depnav/labels';
import { useErrorsStore } from '../errors/errors-store';

export type FixState = 'open' | 'fix_pending' | 'verified' | 'regressed';

export interface FixItem {
  error_id: string;
  node_id: string;
  file_path: string;
  state: FixState;
  changed_at_ms: number;
  ok_calls: number;
}

export const VERIFIED_SHOWN_MS = 10_000;

interface FixesState {
  items: FixItem[];
  verifiedAt: Record<string, number>; // error id -> when it became verified here (for hiding it from the map)
  setItems(items: FixItem[]): void;
  merge(changed: FixItem[]): void;
  reset(): void;
}

export const useFixesStore = create<FixesState>()((set, get) => ({
  items: [],
  verifiedAt: {},
  setItems: (items) => set({ items }),
  merge: (changed) => {
    const byId = new Map(get().items.map((i) => [i.error_id, i]));
    const verifiedAt = { ...get().verifiedAt };
    for (const item of changed) {
      const before = byId.get(item.error_id);
      if (item.state === 'verified' && before?.state !== 'verified')
        verifiedAt[item.error_id] = Date.now();
      byId.set(item.error_id, item);
    }
    set({
      items: [...byId.values()].sort((a, b) => a.error_id.localeCompare(b.error_id)),
      verifiedAt,
    });
  },
  reset: () => set({ items: [], verifiedAt: {} }),
}));

const STYLE: Record<Exclude<FixState, 'open'>, NodeStyle> = {
  fix_pending: { badge: 'fix?', color: '#38bdf8' },
  verified: { badge: 'fixed', color: '#22c55e' },
  regressed: { badge: 'regressed', color: '#ef4444' },
};

export function buildFixesOverlay(
  items: FixItem[],
  verifiedAt: Record<string, number>,
  now: number,
): Overlay {
  const nodes: Record<string, NodeStyle> = {};
  for (const item of items) {
    if (item.state === 'open' || !item.node_id) continue;
    if (item.state === 'verified' && now - (verifiedAt[item.error_id] ?? 0) > VERIFIED_SHOWN_MS)
      continue;
    nodes[item.node_id] = STYLE[item.state];
  }
  return { priority: 61, nodes, edges: {} };
}

export function startFixesWatcher(): () => void {
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const apply = () => {
    const { items, verifiedAt } = useFixesStore.getState();
    const overlay = buildFixesOverlay(items, verifiedAt, Date.now());
    useAppStore.getState().setOverlay('fixes', Object.keys(overlay.nodes).length ? overlay : null);
  };
  const scheduleHide = () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      hideTimer = null;
      apply(); // verified fixes leave the map after a while
    }, VERIFIED_SHOWN_MS + 50);
  };

  const load = async (pid: string) => {
    try {
      const r = await rpc<{ items: FixItem[] }>('fixes.list', { project_id: pid });
      if (useAppStore.getState().projectId === pid) {
        useFixesStore.getState().setItems(r.items);
        apply();
      }
    } catch {
      // no fix tracking for this project (e.g. a snapshot)
    }
  };

  const offApp = useAppStore.subscribe((s, prev) => {
    if (s.projectId === prev.projectId) return;
    useFixesStore.getState().reset();
    useAppStore.getState().setOverlay('fixes', null);
    if (s.projectId) void load(s.projectId);
  });
  const pid = useAppStore.getState().projectId;
  if (pid) void load(pid);

  const offChanged = onEngineNotification('fixes.changed', (params) => {
    const p = params as { project_id?: string; items?: FixItem[] };
    if (!p || p.project_id !== useAppStore.getState().projectId || !Array.isArray(p.items)) return;
    const before = new Map(useFixesStore.getState().items.map((i) => [i.error_id, i.state]));
    useFixesStore.getState().merge(p.items);
    const confirmed = p.items.filter(
      (i) => i.state === 'verified' && before.get(i.error_id) !== 'verified',
    );
    for (const item of confirmed) notify.success('Fix confirmed', shortLabel(item.node_id));
    if (confirmed.length > 0) {
      scheduleHide();
      void useErrorsStore
        .getState()
        .refresh()
        .catch(() => undefined); // the engine removed the fixed errors from the list
    }
    apply();
  });

  return () => {
    offApp();
    offChanged();
    if (hideTimer) clearTimeout(hideTimer);
  };
}
