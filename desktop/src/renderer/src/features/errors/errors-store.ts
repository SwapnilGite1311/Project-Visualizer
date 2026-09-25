// Runtime and pasted errors of the open project: one list, one selection, one highlight on the map.
import { create } from 'zustand';
import { onEngineNotification } from '../../api/bridge';
import { getAncestors } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { revealNode } from '../../view/reveal';
import { clearErrors, type ErrorEntry, listErrors, mapStack } from './errors-api';
import { buildErrorOverlay } from './errors-overlay';

export const ERRORS_REFRESH_MS = 2000;

interface ErrorsState {
  errors: ErrorEntry[];
  selected: ErrorEntry | null;
  dialogOpen: boolean;
  refresh(): Promise<void>;
  select(error: ErrorEntry | null): Promise<void>;
  paste(text: string): Promise<ErrorEntry | null>;
  clear(errorId?: string): Promise<void>;
  setDialogOpen(open: boolean): void;
  reset(): void;
}

async function ancestorsOf(pid: string, ids: string[]): Promise<Record<string, string[]>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const lists = await Promise.all(
    unique.map((id) =>
      getAncestors(pid, id).then(
        (nodes) => nodes.map((n) => n.id),
        () => [id],
      ),
    ),
  );
  return Object.fromEntries(unique.map((id, i) => [id, lists[i]]));
}

export const useErrorsStore = create<ErrorsState>()((set, get) => ({
  errors: [],
  selected: null,
  dialogOpen: false,
  refresh: async () => {
    const pid = useAppStore.getState().projectId;
    if (!pid) return;
    const errors = await listErrors(pid);
    const selectedId = get().selected?.error_id;
    set({ errors, selected: errors.find((e) => e.error_id === selectedId) ?? get().selected });
  },
  select: async (error) => {
    set({ selected: error });
    const pid = useAppStore.getState().projectId;
    if (!error || !pid) {
      useAppStore.getState().setOverlay('error', null);
      return;
    }
    const inProject = error.frames.filter((f) => f.in_project && f.node_id);
    const ancestors = await ancestorsOf(
      pid,
      inProject.map((f) => f.node_id),
    );
    if (get().selected?.error_id !== error.error_id) return; // another error was picked meanwhile
    useAppStore.getState().setOverlay('error', buildErrorOverlay(error.frames, ancestors));
    const origin =
      error.origin_node_id ||
      inProject.find((f) => f.is_origin)?.node_id ||
      inProject.at(-1)?.node_id;
    if (origin) await revealNode(origin);
  },
  paste: async (text) => {
    const pid = useAppStore.getState().projectId;
    if (!pid || !text.trim()) return null;
    const mapped = await mapStack(pid, text);
    await get().refresh();
    const entry = get().errors.find((e) => e.error_id === mapped.error_id) ?? null;
    if (entry) await get().select(entry);
    return entry;
  },
  clear: async (errorId) => {
    const pid = useAppStore.getState().projectId;
    if (!pid) return;
    await clearErrors(pid, errorId);
    if (!errorId || get().selected?.error_id === errorId) await get().select(null);
    await get().refresh();
  },
  setDialogOpen: (dialogOpen) => set({ dialogOpen }),
  reset: () => {
    set({ errors: [], selected: null });
    useAppStore.getState().setOverlay('error', null);
  },
}));

export const hasProjectFrame = (e: { frames: ErrorEntry['frames'] }) =>
  e.frames.some((f) => f.in_project && f.node_id);

export function startErrorsWatcher(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRun = 0;

  const run = () => {
    timer = null;
    lastRun = Date.now();
    useErrorsStore
      .getState()
      .refresh()
      .catch(() => undefined);
  };
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(run, Math.max(0, ERRORS_REFRESH_MS - (Date.now() - lastRun)));
  };

  const offUpdate = onEngineNotification('runtime.update', (params) => {
    const p = params as { project_id?: string; errors?: unknown[] };
    if (
      p?.project_id === useAppStore.getState().projectId &&
      Array.isArray(p.errors) &&
      p.errors.length > 0
    )
      schedule();
  });
  const offApp = useAppStore.subscribe((s, prev) => {
    if (s.projectId === prev.projectId) return;
    useErrorsStore.getState().reset();
    if (s.projectId) schedule();
  });
  if (useAppStore.getState().projectId) schedule();

  return () => {
    offUpdate();
    offApp();
    if (timer) clearTimeout(timer);
  };
}
