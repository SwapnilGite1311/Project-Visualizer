import { create } from 'zustand';
import { getNode } from '../../api/engine';
import { useAppStore } from '../../core/store';
import { NavHistory } from './nav-history';

let history = new NavHistory();
let moving = false;

const useNavFlags = create<{ canBack: boolean; canForward: boolean }>()(() => ({ canBack: false, canForward: false }));

function publish(): void {
  useNavFlags.setState({ canBack: history.canBack(), canForward: history.canForward() });
}

export function startNavigationTracking(): () => void {
  history = new NavHistory();
  const initial = useAppStore.getState();
  if (initial.projectId) history.push(initial.currentParentId);
  publish();
  return useAppStore.subscribe((state, prev) => {
    if (state.projectId !== prev.projectId) {
      history = new NavHistory();
      if (state.projectId) history.push(state.currentParentId);
      publish();
      return;
    }
    if (state.currentParentId !== prev.currentParentId && !moving) {
      history.push(state.currentParentId);
      publish();
    }
  });
}

function moveTo(id: string | null): void {
  if (!id) return;
  moving = true;
  try {
    useAppStore.getState().setParent(id);
  } finally {
    moving = false;
  }
  publish();
}

export function goBack(): void {
  moveTo(history.back());
}

export function goForward(): void {
  moveTo(history.forward());
}

export async function goUp(): Promise<void> {
  const { projectId, currentParentId } = useAppStore.getState();
  if (!projectId || currentParentId === 'project:') return;
  const node = await getNode(projectId, currentParentId);
  if (node.parent_id) useAppStore.getState().setParent(node.parent_id);
}

export function goHome(): void {
  useAppStore.getState().setParent('project:');
}

export function useNavState(): { canBack: boolean; canForward: boolean } {
  const canBack = useNavFlags((s) => s.canBack);
  const canForward = useNavFlags((s) => s.canForward);
  return { canBack, canForward };
}
